namespace HexMaster.Guestbook.Features.CreateGuestbookEntry;

public sealed record CreateGuestbookEntryCommand(string Message, double? Lat, double? Lng, string? ClientIp);

public sealed record CreateGuestbookEntryResult(
    Guid Id,
    string Message,
    double Lat,
    double Lng,
    string Region,
    string HandledByRegion,
    DateTimeOffset Ts);
