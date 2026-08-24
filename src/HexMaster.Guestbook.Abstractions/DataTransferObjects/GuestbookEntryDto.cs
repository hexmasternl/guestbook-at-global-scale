namespace HexMaster.Guestbook.Abstractions.DataTransferObjects;

public sealed record GuestbookEntryDto(
    Guid Id,
    string Message,
    double Lat,
    double Lng,
    string Region,
    DateTimeOffset Ts);
