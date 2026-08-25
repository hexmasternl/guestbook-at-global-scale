using HexMaster.Guestbook.Core;
using HexMaster.Guestbook.DomainModels;
using HexMaster.Guestbook.Services;
using Microsoft.Extensions.Logging;

namespace HexMaster.Guestbook.Features.CreateGuestbookEntry;

public sealed class CreateGuestbookEntryCommandHandler(
    IGuestbookEntryRepository repository,
    IGuestbookRegionProvider regionProvider,
    IClientLocationResolver clientLocationResolver,
    ILogger<CreateGuestbookEntryCommandHandler> logger)
    : ICommandHandler<CreateGuestbookEntryCommand, CreateGuestbookEntryResult>
{
    public async Task<CreateGuestbookEntryResult> Handle(CreateGuestbookEntryCommand command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);

        var region = regionProvider.GetCurrentRegion();

        double lat, lng;
        if (command.Lat is { } suppliedLat && command.Lng is { } suppliedLng)
        {
            (lat, lng) = (suppliedLat, suppliedLng);
        }
        else
        {
            (lat, lng) = clientLocationResolver.Resolve(command.ClientIp);
        }

        var entry = GuestbookEntry.Create(command.Message, lat, lng, region);

        await repository.AddAsync(entry, ct);

        logger.LogInformation(
            "Guestbook entry {EntryId} created by backend region {HandledByRegion}",
            entry.Id,
            entry.HandledByRegion);

        return new CreateGuestbookEntryResult(
            entry.Id,
            entry.Message,
            entry.Lat,
            entry.Lng,
            entry.Region,
            entry.HandledByRegion,
            entry.Ts);
    }
}
