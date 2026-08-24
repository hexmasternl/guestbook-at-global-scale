using HexMaster.Guestbook.Api.Endpoints;

namespace HexMaster.Guestbook.Tests.Api.Endpoints;

public sealed class GuestbookPageSizeResolverTests
{
    [Fact]
    public void TryResolve_ShouldReturnDefault_WhenRawValueIsAbsent()
    {
        var success = GuestbookPageSizeResolver.TryResolve(null, out var pageSize, out var error);

        Assert.True(success);
        Assert.Equal(GuestbookPageSizeResolver.DefaultPageSize, pageSize);
        Assert.Null(error);
    }

    [Fact]
    public void TryResolve_ShouldHonorValue_WhenWithinBounds()
    {
        var success = GuestbookPageSizeResolver.TryResolve("100", out var pageSize, out var error);

        Assert.True(success);
        Assert.Equal(100, pageSize);
        Assert.Null(error);
    }

    [Fact]
    public void TryResolve_ShouldClampToMinimum_WhenBelowLowerBound()
    {
        var success = GuestbookPageSizeResolver.TryResolve("5", out var pageSize, out var error);

        Assert.True(success);
        Assert.Equal(GuestbookPageSizeResolver.MinPageSize, pageSize);
        Assert.Null(error);
    }

    [Fact]
    public void TryResolve_ShouldClampToMaximum_WhenAboveUpperBound()
    {
        var success = GuestbookPageSizeResolver.TryResolve("1000", out var pageSize, out var error);

        Assert.True(success);
        Assert.Equal(GuestbookPageSizeResolver.MaxPageSize, pageSize);
        Assert.Null(error);
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("0")]
    [InlineData("-5")]
    public void TryResolve_ShouldFail_WhenValueIsNotAPositiveInteger(string rawPageSize)
    {
        var success = GuestbookPageSizeResolver.TryResolve(rawPageSize, out _, out var error);

        Assert.False(success);
        Assert.NotNull(error);
    }
}
