using Microsoft.AspNetCore.Http;

namespace HexMaster.Guestbook.Api;

/// <summary>
/// Resolves the client IP address for a request, preferring Azure Front Door's
/// non-spoofable <c>X-Azure-SocketIP</c> header first, then <c>X-Azure-ClientIP</c>
/// and <c>X-Forwarded-For</c> (which may reflect a value the client itself supplied),
/// and finally the underlying connection's remote IP address for local/non-Front-Door
/// scenarios. Used only to feed the best-effort, cosmetic IP-based location fallback —
/// not a security control.
/// </summary>
public static class ClientIpResolver
{
    public static string? Resolve(HttpContext httpContext)
    {
        var headers = httpContext.Request.Headers;

        if (TryGetFirstNonEmpty(headers, "X-Azure-SocketIP", out var socketIp))
            return socketIp;

        if (TryGetFirstNonEmpty(headers, "X-Azure-ClientIP", out var clientIp))
            return clientIp;

        if (headers.TryGetValue("X-Forwarded-For", out var forwardedFor))
        {
            var lastValue = forwardedFor.ToString()
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .LastOrDefault();

            if (!string.IsNullOrWhiteSpace(lastValue))
                return lastValue;
        }

        return httpContext.Connection.RemoteIpAddress?.ToString();
    }

    private static bool TryGetFirstNonEmpty(IHeaderDictionary headers, string headerName, out string? value)
    {
        if (headers.TryGetValue(headerName, out var headerValue) && !string.IsNullOrWhiteSpace(headerValue))
        {
            value = headerValue.ToString();
            return true;
        }

        value = null;
        return false;
    }
}
