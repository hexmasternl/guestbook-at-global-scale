using HexMaster.Guestbook.Abstractions.DataTransferObjects;
using HexMaster.Guestbook.Api.Endpoints;

namespace HexMaster.Guestbook.Tests.Api.Endpoints;

public sealed class CreateGuestbookEntryRequestValidatorTests
{
    [Fact]
    public void TryValidate_ShouldSucceed_WhenRequestIsValid()
    {
        var request = new CreateGuestbookEntryRequest("hi from Amsterdam", 52.37, 4.9);

        var success = CreateGuestbookEntryRequestValidator.TryValidate(request, out var errors);

        Assert.True(success);
        Assert.Empty(errors);
    }

    [Fact]
    public void TryValidate_ShouldFail_WhenMessageIsEmpty()
    {
        var request = new CreateGuestbookEntryRequest(string.Empty, 52.37, 4.9);

        var success = CreateGuestbookEntryRequestValidator.TryValidate(request, out var errors);

        Assert.False(success);
        Assert.True(errors.ContainsKey("message"));
    }

    [Fact]
    public void TryValidate_ShouldSucceed_WhenLatAndLngAreOmitted()
    {
        var request = new CreateGuestbookEntryRequest("hi", null, null);

        var success = CreateGuestbookEntryRequestValidator.TryValidate(request, out var errors);

        Assert.True(success);
        Assert.Empty(errors);
    }

    [Fact]
    public void TryValidate_ShouldFail_WhenOnlyLatIsSupplied()
    {
        var request = new CreateGuestbookEntryRequest("hi", 52.37, null);

        var success = CreateGuestbookEntryRequestValidator.TryValidate(request, out var errors);

        Assert.False(success);
        Assert.True(errors.ContainsKey("lat"));
        Assert.True(errors.ContainsKey("lng"));
        Assert.Equal("Lat and Lng must both be present, or both omitted.", errors["lat"][0]);
        Assert.Equal("Lat and Lng must both be present, or both omitted.", errors["lng"][0]);
    }

    [Fact]
    public void TryValidate_ShouldFail_WhenOnlyLngIsSupplied()
    {
        var request = new CreateGuestbookEntryRequest("hi", null, 4.9);

        var success = CreateGuestbookEntryRequestValidator.TryValidate(request, out var errors);

        Assert.False(success);
        Assert.True(errors.ContainsKey("lat"));
        Assert.True(errors.ContainsKey("lng"));
        Assert.Equal("Lat and Lng must both be present, or both omitted.", errors["lat"][0]);
        Assert.Equal("Lat and Lng must both be present, or both omitted.", errors["lng"][0]);
    }

    [Theory]
    [InlineData(-91)]
    [InlineData(91)]
    public void TryValidate_ShouldFail_WhenLatIsOutOfRange(double lat)
    {
        var request = new CreateGuestbookEntryRequest("hi", lat, 4.9);

        var success = CreateGuestbookEntryRequestValidator.TryValidate(request, out var errors);

        Assert.False(success);
        Assert.True(errors.ContainsKey("lat"));
        Assert.Equal("Lat must be between -90 and 90.", errors["lat"][0]);
    }

    [Theory]
    [InlineData(-181)]
    [InlineData(181)]
    public void TryValidate_ShouldFail_WhenLngIsOutOfRange(double lng)
    {
        var request = new CreateGuestbookEntryRequest("hi", 52.37, lng);

        var success = CreateGuestbookEntryRequestValidator.TryValidate(request, out var errors);

        Assert.False(success);
        Assert.True(errors.ContainsKey("lng"));
        Assert.Equal("Lng must be between -180 and 180.", errors["lng"][0]);
    }

    [Fact]
    public void TryValidate_ShouldReportAllErrors_WhenMultipleFieldsAreInvalid()
    {
        var request = new CreateGuestbookEntryRequest(string.Empty, 91, 200);

        var success = CreateGuestbookEntryRequestValidator.TryValidate(request, out var errors);

        Assert.False(success);
        Assert.Equal(3, errors.Count);
        Assert.True(errors.ContainsKey("message"));
        Assert.True(errors.ContainsKey("lat"));
        Assert.True(errors.ContainsKey("lng"));
    }
}
