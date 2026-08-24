using HexMaster.Guestbook.DomainModels;
using HexMaster.Guestbook.Features.CreateGuestbookEntry;
using HexMaster.Guestbook.Services;
using HexMaster.Guestbook.Tests.Factories;
using Microsoft.Extensions.Logging;
using Moq;

namespace HexMaster.Guestbook.Tests.CreateGuestbookEntry;

public sealed class CreateGuestbookEntryCommandHandlerTests
{
    private readonly Mock<IGuestbookEntryRepository> _mockRepository;
    private readonly Mock<IGuestbookRegionProvider> _mockRegionProvider;
    private readonly Mock<ILogger<CreateGuestbookEntryCommandHandler>> _mockLogger;
    private readonly CreateGuestbookEntryCommandHandler _handler;

    public CreateGuestbookEntryCommandHandlerTests()
    {
        _mockRepository = new Mock<IGuestbookEntryRepository>();
        _mockRegionProvider = new Mock<IGuestbookRegionProvider>();
        _mockRegionProvider.Setup(x => x.GetCurrentRegion()).Returns("westeurope");
        _mockLogger = new Mock<ILogger<CreateGuestbookEntryCommandHandler>>();

        _handler = new CreateGuestbookEntryCommandHandler(
            _mockRepository.Object,
            _mockRegionProvider.Object,
            _mockLogger.Object);
    }

    [Fact]
    public async Task Handle_ShouldPersistEntry_WhenCommandIsValid()
    {
        var (message, lat, lng) = GuestbookEntryFaker.CreateValidInput();
        var command = new CreateGuestbookEntryCommand(message, lat, lng);

        var result = await _handler.Handle(command, CancellationToken.None);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal(message, result.Message);
        Assert.Equal("westeurope", result.Region);
        _mockRepository.Verify(x => x.AddAsync(It.IsAny<GuestbookEntry>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_ShouldThrowAndNotPersist_WhenMessageIsEmpty()
    {
        var command = new CreateGuestbookEntryCommand(string.Empty, 0, 0);

        await Assert.ThrowsAsync<Core.DomainException>(() => _handler.Handle(command, CancellationToken.None));

        _mockRepository.Verify(x => x.AddAsync(It.IsAny<GuestbookEntry>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
