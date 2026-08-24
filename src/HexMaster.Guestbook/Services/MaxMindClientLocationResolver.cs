using MaxMind.Db;
using MaxMind.GeoIP2;
using MaxMind.GeoIP2.Exceptions;
using Microsoft.Extensions.Logging;

namespace HexMaster.Guestbook.Services;

/// <summary>
/// Resolves an approximate location from a client IP using an embedded, country-level
/// MaxMind GeoLite2-Country database (see <c>Guestbook:GeoIp:DatabasePath</c>), mapped
/// through <see cref="CountryCentroids"/>. Never throws: any failure (missing/corrupt
/// database, unparsable/unmapped IP, unknown country code) results in the fixed
/// <c>(0, 0)</c> sentinel per the design's fail-safe requirement.
/// </summary>
public sealed class MaxMindClientLocationResolver : IClientLocationResolver, IDisposable
{
    private static readonly (double Lat, double Lng) UnknownLocation = (0, 0);

    private readonly ILogger<MaxMindClientLocationResolver> _logger;
    private readonly DatabaseReader? _reader;

    public MaxMindClientLocationResolver(string? databasePath, ILogger<MaxMindClientLocationResolver> logger)
    {
        _logger = logger;

        if (string.IsNullOrWhiteSpace(databasePath))
        {
            _logger.LogWarning(
                "Guestbook:GeoIp:DatabasePath is not configured; IP-based location resolution will always fall back to (0, 0).");
            return;
        }

        try
        {
            _reader = new DatabaseReader(databasePath, FileAccessMode.Memory);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to load the GeoLite2-Country database from {DatabasePath}; IP-based location resolution will always fall back to (0, 0).",
                databasePath);
            _reader = null;
        }
    }

    public (double Lat, double Lng) Resolve(string? clientIp)
    {
        if (string.IsNullOrWhiteSpace(clientIp) || _reader is null)
            return UnknownLocation;

        try
        {
            if (!_reader.TryCountry(clientIp, out var response) || response?.Country?.IsoCode is not { } isoCode)
            {
                _logger.LogDebug("No country could be resolved for client IP {ClientIp}", clientIp);
                return UnknownLocation;
            }

            var centroid = CountryCentroids.TryGetCentroid(isoCode);
            if (centroid is null)
            {
                _logger.LogDebug("Resolved country {IsoCode} for client IP {ClientIp} has no known centroid", isoCode, clientIp);
                return UnknownLocation;
            }

            return centroid.Value;
        }
        catch (AddressNotFoundException)
        {
            _logger.LogDebug("Client IP {ClientIp} was not found in the GeoLite2-Country database", clientIp);
            return UnknownLocation;
        }
        catch (Exception ex) when (ex is InvalidDatabaseException or GeoIP2Exception or FormatException)
        {
            _logger.LogDebug(ex, "Failed to resolve a location for client IP {ClientIp}", clientIp);
            return UnknownLocation;
        }
    }

    public void Dispose() => _reader?.Dispose();
}
