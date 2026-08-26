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
    private readonly Mock<IClientLocationResolver> _mockClientLocationResolver;
    private readonly Mock<ILogger<CreateGuestbookEntryCommandHandler>> _mockLogger;
    private readonly CreateGuestbookEntryCommandHandler _handler;

    public CreateGuestbookEntryCommandHandlerTests()
    {
        _mockRepository = new Mock<IGuestbookEntryRepository>();
        _mockRegionProvider = new Mock<IGuestbookRegionProvider>();
        _mockRegionProvider.Setup(x => x.GetCurrentRegion()).Returns("westeurope");
        _mockClientLocationResolver = new Mock<IClientLocationResolver>();
        _mockLogger = new Mock<ILogger<CreateGuestbookEntryCommandHandler>>();

        _handler = new CreateGuestbookEntryCommandHandler(
            _mockRepository.Object,
            _mockRegionProvider.Object,
            _mockClientLocationResolver.Object,
            _mockLogger.Object);
    }

    [Fact]
    public async Task Handle_ShouldPersistEntry_WhenCommandIsValid()
    {
        var (message, lat, lng) = GuestbookEntryFaker.CreateValidInput();
        var command = new CreateGuestbookEntryCommand(message, lat, lng, "203.0.113.1");

        var result = await _handler.Handle(command, CancellationToken.None);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal(message, result.Message);
        Assert.Equal("westeurope", result.Region);
        Assert.Equal("westeurope", result.HandledByRegion);
        _mockRepository.Verify(x => x.AddAsync(It.IsAny<GuestbookEntry>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_ShouldThrowAndNotPersist_WhenMessageIsEmpty()
    {
        var command = new CreateGuestbookEntryCommand(string.Empty, 0, 0, "203.0.113.1");

        await Assert.ThrowsAsync<Core.DomainException>(() => _handler.Handle(command, CancellationToken.None));

        _mockRepository.Verify(x => x.AddAsync(It.IsAny<GuestbookEntry>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_ShouldNotCallResolver_WhenLatAndLngAreSupplied()
    {
        var (message, lat, lng) = GuestbookEntryFaker.CreateValidInput();
        var command = new CreateGuestbookEntryCommand(message, lat, lng, "203.0.113.1");

        await _handler.Handle(command, CancellationToken.None);

        _mockClientLocationResolver.Verify(x => x.Resolve(It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task Handle_ShouldResolveLocationFromClientIp_WhenLatAndLngAreOmitted()
    {
        const string clientIp = "81.2.69.142";
        const double resolvedLat = 53.9784;
        const double resolvedLng = -2.8529;
        _mockClientLocationResolver.Setup(x => x.Resolve(clientIp)).Returns((resolvedLat, resolvedLng));

        var (message, _, _) = GuestbookEntryFaker.CreateValidInput();
        var command = new CreateGuestbookEntryCommand(message, null, null, clientIp);

        var result = await _handler.Handle(command, CancellationToken.None);

        _mockClientLocationResolver.Verify(x => x.Resolve(clientIp), Times.Once);
        Assert.Equal(resolvedLat, result.Lat);
        Assert.Equal(resolvedLng, result.Lng);
    }

    [Fact]
    public async Task Handle_ShouldStoreUnknownLocation_WhenCoordinatesAreOmittedAndIpCannotBeResolved()
    {
        const string clientIp = "192.168.1.1";
        _mockClientLocationResolver.Setup(x => x.Resolve(clientIp)).Returns((ValueTuple<double, double>?)null);

        var (message, _, _) = GuestbookEntryFaker.CreateValidInput();
        var command = new CreateGuestbookEntryCommand(message, null, null, clientIp);

        GuestbookEntry? persisted = null;
        _mockRepository
            .Setup(x => x.AddAsync(It.IsAny<GuestbookEntry>(), It.IsAny<CancellationToken>()))
            .Callback<GuestbookEntry, CancellationToken>((entry, _) => persisted = entry)
            .Returns(Task.CompletedTask);

        var result = await _handler.Handle(command, CancellationToken.None);

        _mockClientLocationResolver.Verify(x => x.Resolve(clientIp), Times.Once);
        Assert.Null(result.Lat);
        Assert.Null(result.Lng);
        Assert.NotNull(persisted);
        Assert.False(persisted!.HasLocation);
    }
}
