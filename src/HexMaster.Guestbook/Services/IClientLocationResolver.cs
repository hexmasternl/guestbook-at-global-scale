namespace HexMaster.Guestbook.Services;

/// <summary>
/// Resolves an approximate <c>(lat, lng)</c> for a client IP address when a guestbook
/// submission omits coordinates. Implementations MUST never throw: resolution failure
/// (unmappable IP, missing/corrupt dataset, etc.) is signaled by returning <c>null</c>,
/// meaning "location unknown", rather than surfacing an exception to the caller — or
/// fabricating a coordinate such as <c>(0, 0)</c>, which is a real place.
/// </summary>
public interface IClientLocationResolver
{
    /// <summary>
    /// Resolves an approximate location for <paramref name="clientIp"/>. Returns
    /// <c>null</c> when <paramref name="clientIp"/> is null/empty or cannot be
    /// resolved to a known country — the caller then stores the location as unknown.
    /// </summary>
    (double Lat, double Lng)? Resolve(string? clientIp);
}
