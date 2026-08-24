using HexMaster.Guestbook.DomainModels;

namespace HexMaster.Guestbook;

/// <summary>
/// A single page of guestbook entries returned by <see cref="IGuestbookEntryRepository.ListAsync"/>,
/// carrying the Cosmos DB continuation token needed to fetch the next page.
/// </summary>
public sealed record GuestbookEntryPage(IReadOnlyList<GuestbookEntry> Entries, string? ContinuationToken);
