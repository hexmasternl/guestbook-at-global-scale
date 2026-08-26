namespace HexMaster.Guestbook.Abstractions.DataTransferObjects;

/// <param name="Lat">
/// Latitude of the entry's origin, or <c>null</c> when the location is unknown — the visitor
/// shared no GPS coordinates and their IP address could not be approximated to a country.
/// Always <c>null</c> together with <paramref name="Lng"/>.
/// </param>
/// <param name="Lng">Longitude of the entry's origin, or <c>null</c> when the location is unknown.</param>
/// <param name="Region">Cosmos DB partition the entry lives in.</param>
/// <param name="HandledByRegion">
/// Azure region of the backend instance that handled the create request — what proves
/// which datacenter served a given greeting.
/// </param>
public sealed record GuestbookEntryDto(
    Guid Id,
    string Message,
    double? Lat,
    double? Lng,
    string Region,
    string HandledByRegion,
    DateTimeOffset Ts);
