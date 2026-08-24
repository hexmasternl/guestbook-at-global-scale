using HexMaster.Guestbook.Core;
using HexMaster.Guestbook.DomainModels;
using HexMaster.Guestbook.Services;
using Microsoft.Extensions.Logging;

namespace HexMaster.Guestbook.Features.CreateGuestbookEntry;

public sealed class CreateGuestbookEntryCommandHandler(
    IGuestbookEntryRepository repository,
    IGuestbookRegionProvider regionProvider,
    ILogger<CreateGuestbookEntryCommandHandler> logger)
    : ICommandHandler<CreateGuestbookEntryCommand, CreateGuestbookEntryResult>
{
    public async Task<CreateGuestbookEntryResult> Handle(CreateGuestbookEntryCommand command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);

        var region = regionProvider.GetCurrentRegion();
        var entry = GuestbookEntry.Create(command.Message, command.Lat, command.Lng, region);

        await repository.AddAsync(entry, ct);

        logger.LogInformation("Guestbook entry {EntryId} created for region {Region}", entry.Id, entry.Region);

        return new CreateGuestbookEntryResult(entry.Id, entry.Message, entry.Lat, entry.Lng, entry.Region, entry.Ts);
    }
}
