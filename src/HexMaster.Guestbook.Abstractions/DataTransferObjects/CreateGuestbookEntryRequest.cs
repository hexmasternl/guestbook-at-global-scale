namespace HexMaster.Guestbook.Abstractions.DataTransferObjects;

/// <summary>
/// Request payload for <c>POST /greet</c>. <see cref="Lat"/>/<see cref="Lng"/> are optional:
/// a client only has coordinates to send when the visitor granted browser location access, so
/// omitting them (or sending `null`) is a normal, well-formed request — the server then
/// approximates the location from the client's IP address, and stores it as unknown if that
/// fails too. They are nullable rather than absent-only so that an explicit `null` doesn't
/// throw during JSON deserialization (non-nullable numeric properties do) and so that a
/// missing property can't be silently read as a real `(0, 0)` coordinate.
/// </summary>
public sealed record CreateGuestbookEntryRequest(string Message, double? Lat, double? Lng);
