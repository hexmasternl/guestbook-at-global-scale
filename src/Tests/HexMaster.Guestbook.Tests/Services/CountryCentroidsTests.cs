using HexMaster.Guestbook.Services;

namespace HexMaster.Guestbook.Tests.Services;

public sealed class CountryCentroidsTests
{
    [Theory]
    [InlineData("NL")]
    [InlineData("nl")]
    [InlineData("US")]
    [InlineData("JP")]
    public void TryGetCentroid_ShouldReturnCentroid_WhenCountryCodeIsKnown(string isoCountryCode)
    {
        var centroid = CountryCentroids.TryGetCentroid(isoCountryCode);

        Assert.NotNull(centroid);
        Assert.InRange(centroid!.Value.Lat, -90, 90);
        Assert.InRange(centroid.Value.Lng, -180, 180);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("ZZ")]
    [InlineData("not-a-code")]
    public void TryGetCentroid_ShouldReturnNull_WhenCountryCodeIsUnknownOrEmpty(string? isoCountryCode)
    {
        var centroid = CountryCentroids.TryGetCentroid(isoCountryCode);

        Assert.Null(centroid);
    }
}
