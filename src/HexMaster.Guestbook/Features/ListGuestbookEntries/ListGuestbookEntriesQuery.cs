using HexMaster.Guestbook.DomainModels;

namespace HexMaster.Guestbook.Features.ListGuestbookEntries;

public sealed record ListGuestbookEntriesQuery(int PageSize, string? ContinuationToken);

public sealed record ListGuestbookEntriesResult(IReadOnlyList<GuestbookEntry> Entries, string? ContinuationToken);
