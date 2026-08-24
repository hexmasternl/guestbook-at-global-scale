namespace HexMaster.Guestbook.Services;

/// <summary>
/// Resolves an approximate <c>(lat, lng)</c> for a client IP address when a guestbook
/// submission omits coordinates. Implementations MUST never throw: resolution failure
/// (unmappable IP, missing/corrupt dataset, etc.) is signaled by returning the fixed
/// <c>(0, 0)</c> sentinel rather than surfacing an exception to the caller.
/// </summary>
public interface IClientLocationResolver
{
    /// <summary>
    /// Resolves an approximate location for <paramref name="clientIp"/>. Returns
    /// <c>(0, 0)</c> when <paramref name="clientIp"/> is null/empty or cannot be
    /// resolved to a known country.
    /// </summary>
    (double Lat, double Lng) Resolve(string? clientIp);
}
