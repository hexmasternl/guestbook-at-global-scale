namespace HexMaster.Guestbook.Abstractions.DataTransferObjects;

/// <param name="Region">Cosmos DB partition the entry lives in.</param>
/// <param name="HandledByRegion">
/// Azure region of the backend instance that handled the create request — what proves
/// which datacenter served a given greeting.
/// </param>
public sealed record GuestbookEntryDto(
    Guid Id,
    string Message,
    double Lat,
    double Lng,
    string Region,
    string HandledByRegion,
    DateTimeOffset Ts);
