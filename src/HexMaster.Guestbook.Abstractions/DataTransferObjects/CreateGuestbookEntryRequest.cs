namespace HexMaster.Guestbook.Abstractions.DataTransferObjects;

public sealed record CreateGuestbookEntryRequest(string Message, double Lat, double Lng);
