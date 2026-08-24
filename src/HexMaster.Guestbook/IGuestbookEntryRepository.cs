using HexMaster.Guestbook.DomainModels;

namespace HexMaster.Guestbook;

public interface IGuestbookEntryRepository
{
    Task AddAsync(GuestbookEntry entry, CancellationToken ct);

    Task<GuestbookEntryPage> ListAsync(int pageSize, string? continuationToken, CancellationToken ct);
}
