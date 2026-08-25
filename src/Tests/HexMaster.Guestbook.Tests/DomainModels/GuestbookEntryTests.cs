using HexMaster.Guestbook.Core;
using HexMaster.Guestbook.DomainModels;
using HexMaster.Guestbook.Tests.Factories;

namespace HexMaster.Guestbook.Tests.DomainModels;

public sealed class GuestbookEntryTests
{
    [Fact]
    public void Create_ShouldReturnEntry_WhenInputIsValid()
    {
        var (message, lat, lng) = GuestbookEntryFaker.CreateValidInput();

        var entry = GuestbookEntry.Create(message, lat, lng, "westeurope");

        Assert.NotEqual(Guid.Empty, entry.Id);
        Assert.Equal(message, entry.Message);
        Assert.Equal(lat, entry.Lat);
        Assert.Equal(lng, entry.Lng);
        Assert.Equal("westeurope", entry.Region);
        Assert.Equal("westeurope", entry.HandledByRegion);
    }

    [Fact]
    public void Restore_ShouldKeepHandledByRegion_WhenItDiffersFromThePartition()
    {
        var entry = GuestbookEntry.Restore(
            Guid.NewGuid(),
            "hi",
            0,
            0,
            "westeurope",
            "swedencentral",
            DateTimeOffset.UtcNow);

        Assert.Equal("westeurope", entry.Region);
        Assert.Equal("swedencentral", entry.HandledByRegion);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_ShouldThrowDomainException_WhenMessageIsEmpty(string message)
    {
        Assert.Throws<DomainException>(() => GuestbookEntry.Create(message, 0, 0, "westeurope"));
    }

    [Fact]
    public void Create_ShouldThrowDomainException_WhenMessageIsTooLong()
    {
        var message = new string('a', 281);

        Assert.Throws<DomainException>(() => GuestbookEntry.Create(message, 0, 0, "westeurope"));
    }

    [Theory]
    [InlineData(-91)]
    [InlineData(91)]
    public void Create_ShouldThrowDomainException_WhenLatIsOutOfRange(double lat)
    {
        Assert.Throws<DomainException>(() => GuestbookEntry.Create("hi", lat, 0, "westeurope"));
    }

    [Theory]
    [InlineData(-181)]
    [InlineData(181)]
    public void Create_ShouldThrowDomainException_WhenLngIsOutOfRange(double lng)
    {
        Assert.Throws<DomainException>(() => GuestbookEntry.Create("hi", 0, lng, "westeurope"));
    }
}
