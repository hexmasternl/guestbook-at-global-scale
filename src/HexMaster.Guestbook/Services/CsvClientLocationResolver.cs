using System.Buffers.Binary;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using Microsoft.Extensions.Logging;

namespace HexMaster.Guestbook.Services;

/// <summary>
/// Resolves an approximate location from a client IP using the embedded, gzip-compressed
/// <c>Resources/GeoIp.csv.gz</c> dataset (IP-range → ISO country code), mapped through
/// <see cref="CountryCentroids"/>. Each decompressed row is <c>type,startNum,endNum,CC</c>
/// (type <c>4</c>/<c>6</c>, the numeric IP bounds, and the ISO alpha-2 code). The dataset
/// is parsed once at construction into sorted, in-memory range tables (one for IPv4, one
/// for IPv6) and looked up by binary search. Never throws: any failure (unparsable/unmapped
/// IP, unknown country code, malformed data row) results in <c>null</c> — "location
/// unknown" — per the fail-safe contract.
/// </summary>
public sealed class CsvClientLocationResolver : IClientLocationResolver
{
    private readonly record struct V4Range(uint Start, uint End, string CountryCode);
    private readonly record struct V6Range(UInt128 Start, UInt128 End, string CountryCode);

    private readonly V4Range[] _v4;
    private readonly V6Range[] _v6;
    private readonly ILogger _logger;

    /// <summary>
    /// Production constructor: loads, decompresses, and parses the embedded <c>Resources/GeoIp.csv.gz</c>.
    /// </summary>
    public CsvClientLocationResolver(ILogger<CsvClientLocationResolver> logger)
        : this(OpenEmbeddedDataset(), logger)
    {
    }

    /// <summary>
    /// Testable constructor: parses ranges from an arbitrary CSV reader. The reader is
    /// disposed by this constructor once parsing completes.
    /// </summary>
    internal CsvClientLocationResolver(TextReader reader, ILogger logger)
    {
        _logger = logger;

        var v4 = new List<V4Range>();
        var v6 = new List<V6Range>();
        var interned = new Dictionary<string, string>(StringComparer.Ordinal);
        var malformed = 0;

        using (reader)
        {
            string? line;
            while ((line = reader.ReadLine()) is not null)
            {
                if (line.Length < 2)
                {
                    continue;
                }

                try
                {
                    // Each row is: type,startNum,endNum,CC  (e.g. 4,16778240,16779263,AU).
                    if (!TryParseRow(line.AsSpan(), interned, out var isV6, out var start, out var end, out var countryCode))
                    {
                        malformed++;
                        continue;
                    }

                    if (isV6)
                    {
                        v6.Add(new V6Range(start, end, countryCode));
                    }
                    else
                    {
                        v4.Add(new V4Range((uint)start, (uint)end, countryCode));
                    }
                }
                catch
                {
                    malformed++;
                }
            }
        }

        v4.Sort(static (a, b) => a.Start.CompareTo(b.Start));
        v6.Sort(static (a, b) => a.Start.CompareTo(b.Start));
        _v4 = [.. v4];
        _v6 = [.. v6];

        if (malformed > 0)
        {
            _logger.LogWarning("Skipped {Count} malformed GeoIp.csv row(s) while loading IP-location data.", malformed);
        }

        _logger.LogInformation("Loaded GeoIp location data: {V4} IPv4 ranges, {V6} IPv6 ranges.", _v4.Length, _v6.Length);
    }

    public (double Lat, double Lng)? Resolve(string? clientIp)
    {
        if (string.IsNullOrWhiteSpace(clientIp) || !IPAddress.TryParse(clientIp, out var address))
        {
            return null;
        }

        string? countryCode;
        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            countryCode = LookupV4(ToUInt32(address));
        }
        else if (address.AddressFamily == AddressFamily.InterNetworkV6)
        {
            // An IPv4-mapped IPv6 address (::ffff:a.b.c.d) is really an IPv4 client.
            countryCode = address.IsIPv4MappedToIPv6
                ? LookupV4(ToUInt32(address.MapToIPv4()))
                : LookupV6(ToUInt128(address));
        }
        else
        {
            return null;
        }

        if (countryCode is null)
        {
            _logger.LogDebug("No country could be resolved for client IP {ClientIp}", clientIp);
            return null;
        }

        var centroid = CountryCentroids.TryGetCentroid(countryCode);
        if (centroid is null)
        {
            _logger.LogDebug("Resolved country {CountryCode} for client IP {ClientIp} has no known centroid", countryCode, clientIp);
            return null;
        }

        return centroid.Value;
    }

    private string? LookupV4(uint ip)
    {
        var ranges = _v4;
        int lo = 0, hi = ranges.Length - 1, candidate = -1;
        while (lo <= hi)
        {
            var mid = lo + ((hi - lo) >> 1);
            if (ranges[mid].Start <= ip)
            {
                candidate = mid;
                lo = mid + 1;
            }
            else
            {
                hi = mid - 1;
            }
        }

        return candidate >= 0 && ip <= ranges[candidate].End ? ranges[candidate].CountryCode : null;
    }

    private string? LookupV6(UInt128 ip)
    {
        var ranges = _v6;
        int lo = 0, hi = ranges.Length - 1, candidate = -1;
        while (lo <= hi)
        {
            var mid = lo + ((hi - lo) >> 1);
            if (ranges[mid].Start <= ip)
            {
                candidate = mid;
                lo = mid + 1;
            }
            else
            {
                hi = mid - 1;
            }
        }

        return candidate >= 0 && ip <= ranges[candidate].End ? ranges[candidate].CountryCode : null;
    }

    private static bool TryParseRow(
        ReadOnlySpan<char> row,
        Dictionary<string, string> interned,
        out bool isV6,
        out UInt128 start,
        out UInt128 end,
        out string countryCode)
    {
        isV6 = false;
        start = default;
        end = default;
        countryCode = string.Empty;

        // Row layout: type,startNum,endNum,CC  (comma-separated, no quotes).
        var type = NextField(ref row);
        var startNum = NextField(ref row);
        var endNum = NextField(ref row);
        var cc = NextField(ref row);

        if (type.IsEmpty || startNum.IsEmpty || endNum.IsEmpty || cc.Length != 2)
        {
            return false;
        }

        if (!UInt128.TryParse(startNum, out start) || !UInt128.TryParse(endNum, out end))
        {
            return false;
        }

        isV6 = type[0] == '6';

        var ccKey = cc.ToString();
        if (!interned.TryGetValue(ccKey, out var pooled))
        {
            pooled = ccKey;
            interned[ccKey] = pooled;
        }

        countryCode = pooled;
        return true;
    }

    private static ReadOnlySpan<char> NextField(ref ReadOnlySpan<char> row)
    {
        var separator = row.IndexOf(',');
        if (separator < 0)
        {
            var whole = row;
            row = default;
            return whole;
        }

        var field = row[..separator];
        row = row[(separator + 1)..];
        return field;
    }

    private static uint ToUInt32(IPAddress address)
    {
        Span<byte> bytes = stackalloc byte[4];
        address.TryWriteBytes(bytes, out _);
        return BinaryPrimitives.ReadUInt32BigEndian(bytes);
    }

    private static UInt128 ToUInt128(IPAddress address)
    {
        Span<byte> bytes = stackalloc byte[16];
        address.TryWriteBytes(bytes, out _);
        return BinaryPrimitives.ReadUInt128BigEndian(bytes);
    }

    private static TextReader OpenEmbeddedDataset()
    {
        var assembly = typeof(CsvClientLocationResolver).Assembly;
        var resourceName = Array.Find(
            assembly.GetManifestResourceNames(),
            name => name.EndsWith("GeoIp.csv.gz", StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("Embedded resource 'GeoIp.csv.gz' was not found in the assembly.");

        var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Embedded resource '{resourceName}' could not be opened.");

        var gzip = new GZipStream(stream, CompressionMode.Decompress);
        return new StreamReader(gzip);
    }
}
