using HexMaster.Guestbook.Features.ListGuestbookEntries;
using HexMaster.Guestbook.Tests.Factories;
using Moq;

namespace HexMaster.Guestbook.Tests.ListGuestbookEntries;

public sealed class ListGuestbookEntriesQueryHandlerTests
{
    private readonly Mock<IGuestbookEntryRepository> _mockRepository;
    private readonly ListGuestbookEntriesQueryHandler _handler;

    public ListGuestbookEntriesQueryHandlerTests()
    {
        _mockRepository = new Mock<IGuestbookEntryRepository>();
        _handler = new ListGuestbookEntriesQueryHandler(_mockRepository.Object);
    }

    [Fact]
    public async Task Handle_ShouldPassPageSizeAndContinuationToken_ToRepository()
    {
        _mockRepository
            .Setup(x => x.ListAsync(It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GuestbookEntryPage([], null));

        var query = new ListGuestbookEntriesQuery(100, "some-token");

        await _handler.Handle(query, CancellationToken.None);

        _mockRepository.Verify(x => x.ListAsync(100, "some-token", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_ShouldReturnEntriesAndContinuationToken_FromRepositoryPage()
    {
        var entries = GuestbookEntryFaker.CreateOrderedEntries(3);
        _mockRepository
            .Setup(x => x.ListAsync(It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GuestbookEntryPage(entries, "next-token"));

        var result = await _handler.Handle(new ListGuestbookEntriesQuery(50, null), CancellationToken.None);

        Assert.Equal(entries, result.Entries);
        Assert.Equal("next-token", result.ContinuationToken);
    }

    [Fact]
    public async Task Handle_ShouldReturnNullContinuationToken_WhenRepositoryReturnsNone()
    {
        _mockRepository
            .Setup(x => x.ListAsync(It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GuestbookEntryPage([], null));

        var result = await _handler.Handle(new ListGuestbookEntriesQuery(50, null), CancellationToken.None);

        Assert.Empty(result.Entries);
        Assert.Null(result.ContinuationToken);
    }
}
