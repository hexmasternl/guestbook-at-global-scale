using HexMaster.Guestbook.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace HexMaster.Guestbook.Tests.Services;

public sealed class CsvClientLocationResolverTests
{
    // A tiny in-memory slice in the decompressed dataset format:
    // type,startNum,endNum,CC. The numeric columns are the integer forms of the IP
    // bounds (the same values the resolver computes from a client IP).
    private const string SampleCsv =
        "4,16778240,16779263,AU\n" +                                                            // 1.0.4.0 - 1.0.7.255
        "4,1359103360,1359103423,GB\n" +                                                        // 81.2.69.128 - .191
        "6,58569105395146355079250494851844669440,58569105474374517593514832445388619775,ZA\n"; // 2c0f:ffd8::/32

    private static CsvClientLocationResolver CreateResolver() =>
        new(new StringReader(SampleCsv), NullLogger<CsvClientLocationResolver>.Instance);

    [Theory]
    [InlineData("1.0.4.0", "AU")]   // IPv4 range start (inclusive)
    [InlineData("1.0.5.5", "AU")]   // IPv4 mid-range
    [InlineData("81.2.69.142", "GB")]
    [InlineData("2c0f:ffd8::", "ZA")] // IPv6 range start (inclusive)
    public void Resolve_ShouldReturnCountryCentroid_WhenIpIsKnown(string clientIp, string expectedCountry)
    {
        var resolver = CreateResolver();
        var expected = CountryCentroids.TryGetCentroid(expectedCountry);

        var actual = resolver.Resolve(clientIp);

        Assert.NotNull(expected);
        Assert.NotNull(actual);
        Assert.Equal(expected!.Value, actual!.Value);
    }

    [Fact]
    public void Resolve_ShouldMapIpv4MappedIpv6ToIpv4Table()
    {
        var resolver = CreateResolver();
        var expected = CountryCentroids.TryGetCentroid("GB")!.Value;

        var actual = resolver.Resolve("::ffff:81.2.69.142");

        Assert.NotNull(actual);
        Assert.Equal(expected, actual!.Value);
    }

    [Theory]
    [InlineData("192.168.1.1")] // not present in the sample data
    [InlineData("8.8.8.8")]     // outside every sample range
    [InlineData("not-an-ip")]
    [InlineData(null)]
    [InlineData("")]
    public void Resolve_ShouldReturnNull_WhenIpCannotBeResolved(string? clientIp)
    {
        var resolver = CreateResolver();

        var location = resolver.Resolve(clientIp);

        // Null means "unknown", which the caller stores as such — never a fabricated (0, 0).
        Assert.Null(location);
    }

    [Fact]
    public void Resolve_ShouldReturnNull_WhenDatasetIsEmpty()
    {
        var resolver = new CsvClientLocationResolver(
            new StringReader(string.Empty), NullLogger<CsvClientLocationResolver>.Instance);

        Assert.Null(resolver.Resolve("1.0.5.5"));
    }
}
