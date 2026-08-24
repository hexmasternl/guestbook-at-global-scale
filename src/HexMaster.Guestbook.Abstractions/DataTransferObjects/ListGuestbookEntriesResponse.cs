namespace HexMaster.Guestbook.Abstractions.DataTransferObjects;

public sealed record ListGuestbookEntriesResponse(
    IReadOnlyList<GuestbookEntryDto> Entries,
    string? ContinuationToken);
