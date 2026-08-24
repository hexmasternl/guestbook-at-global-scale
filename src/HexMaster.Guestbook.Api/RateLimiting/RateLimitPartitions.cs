namespace HexMaster.Guestbook.Api.RateLimiting;

/// <summary>
/// Shared configuration for the ASP.NET Core rate limiting middleware
/// (<see cref="Microsoft.AspNetCore.RateLimiting"/>).
/// </summary>
public static class RateLimitPartitions
{
    /// <summary>
    /// Name of the policy applied to the guestbook write endpoint (<c>POST /greet</c>).
    /// </summary>
    public const string CreateGreetingPolicy = "create-greeting";

    /// <summary>
    /// Resolves the partition key used to isolate rate limit counters per client.
    /// Prefers the caller's IP address, falling back to a shared key when unavailable
    /// (e.g. behind a proxy that doesn't forward the remote address).
    /// </summary>
    public static string ResolveClientKey(HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}
