using HexMaster.Guestbook.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace HexMaster.Guestbook.Tests.Services;

public sealed class MaxMindClientLocationResolverTests
{
    private static readonly string TestDatabasePath = Path.Combine(
        AppContext.BaseDirectory, "TestData", "GeoIP2-Country-Test.mmdb");

    [Theory]
    [InlineData("81.2.69.142", 53.9784, -2.8529)] // GB
    [InlineData("50.114.0.0", 38.8208, -96.3316)] // US
    [InlineData("89.160.20.128", 62.7342, 17.0624)] // SE
    public void Resolve_ShouldReturnCountryCentroid_WhenIpIsKnown(string clientIp, double expectedLat, double expectedLng)
    {
        using var resolver = new MaxMindClientLocationResolver(TestDatabasePath, NullLogger<MaxMindClientLocationResolver>.Instance);

        var (lat, lng) = resolver.Resolve(clientIp);

        Assert.Equal(expectedLat, lat);
        Assert.Equal(expectedLng, lng);
    }

    [Theory]
    [InlineData("192.168.1.1")] // private/reserved range, not present in the database
    [InlineData("not-an-ip")]
    [InlineData(null)]
    [InlineData("")]
    public void Resolve_ShouldReturnFallback_WhenIpCannotBeResolved(string? clientIp)
    {
        using var resolver = new MaxMindClientLocationResolver(TestDatabasePath, NullLogger<MaxMindClientLocationResolver>.Instance);

        var (lat, lng) = resolver.Resolve(clientIp);

        Assert.Equal(0, lat);
        Assert.Equal(0, lng);
    }

    [Fact]
    public void Resolve_ShouldReturnFallback_WhenDatabasePathIsMissing()
    {
        using var resolver = new MaxMindClientLocationResolver(
            databasePath: null, NullLogger<MaxMindClientLocationResolver>.Instance);

        var (lat, lng) = resolver.Resolve("81.2.69.142");

        Assert.Equal(0, lat);
        Assert.Equal(0, lng);
    }

    [Fact]
    public void Resolve_ShouldReturnFallback_WhenDatabaseFileDoesNotExist()
    {
        using var resolver = new MaxMindClientLocationResolver(
            databasePath: Path.Combine(AppContext.BaseDirectory, "TestData", "does-not-exist.mmdb"),
            NullLogger<MaxMindClientLocationResolver>.Instance);

        var (lat, lng) = resolver.Resolve("81.2.69.142");

        Assert.Equal(0, lat);
        Assert.Equal(0, lng);
    }
}
