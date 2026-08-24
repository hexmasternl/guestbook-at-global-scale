namespace HexMaster.Guestbook.Abstractions.DataTransferObjects;

/// <summary>
/// Request payload for <c>POST /greet</c>. <see cref="Lat"/>/<see cref="Lng"/> are
/// nullable so that a missing/`null` coordinate is a well-formed request that fails
/// endpoint validation with a clean <c>400 ValidationProblem</c>, rather than an
/// unhandled JSON-deserialization exception (non-nullable numeric properties throw
/// when the client sends `null`) or a silently-defaulted `(0, 0)` value (when the
/// property is entirely absent from the JSON body).
/// </summary>
public sealed record CreateGuestbookEntryRequest(string Message, double? Lat, double? Lng);
