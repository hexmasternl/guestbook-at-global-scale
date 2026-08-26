namespace HexMaster.Guestbook.Features.CreateGuestbookEntry;

/// <summary>
/// <paramref name="Lat"/>/<paramref name="Lng"/> are the coordinates the client shared, if it
/// shared any (GPS access is optional). When they are null the handler falls back to
/// <paramref name="ClientIp"/>, and when that resolves to nothing the entry's location is
/// stored as unknown.
/// </summary>
public sealed record CreateGuestbookEntryCommand(string Message, double? Lat, double? Lng, string? ClientIp);

/// <summary>
/// <paramref name="Lat"/>/<paramref name="Lng"/> are null when the entry's location is unknown.
/// </summary>
public sealed record CreateGuestbookEntryResult(
    Guid Id,
    string Message,
    double? Lat,
    double? Lng,
    string Region,
    string HandledByRegion,
    DateTimeOffset Ts);
