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

        // Location is best-effort, in descending order of accuracy: coordinates the client
        // shared (only available when the visitor granted GPS access), then an approximation
        // from their IP address, then nothing at all — an entry with an unknown location.
        double? lat = null, lng = null;
        if (command.Lat is { } suppliedLat && command.Lng is { } suppliedLng)
        {
            (lat, lng) = (suppliedLat, suppliedLng);
        }
        else if (clientLocationResolver.Resolve(command.ClientIp) is { } resolved)
        {
            (lat, lng) = (resolved.Lat, resolved.Lng);
        }

        var entry = GuestbookEntry.Create(command.Message, lat, lng, region);

        await repository.AddAsync(entry, ct);

        logger.LogInformation(
            "Guestbook entry {EntryId} created by backend region {HandledByRegion} with location {Location}",
            entry.Id,
            entry.HandledByRegion,
            entry.HasLocation ? $"{entry.Lat},{entry.Lng}" : "unknown");

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
