namespace HexMaster.Guestbook.Api.Endpoints;

/// <summary>
/// Resolves and clamps the effective page size for <c>GET /greetings</c>, per the
/// bounds described in the guestbook-entry-listing spec (default 50, min 10, max 250).
/// </summary>
public static class GuestbookPageSizeResolver
{
    public const int DefaultPageSize = 50;
    public const int MinPageSize = 10;
    public const int MaxPageSize = 250;

    /// <summary>
    /// Resolves <paramref name="rawPageSize"/> into an effective page size.
    /// Returns <c>false</c> with an <paramref name="error"/> message when the raw
    /// value is present but not a positive integer; otherwise clamps into
    /// <see cref="MinPageSize"/>..<see cref="MaxPageSize"/> (defaulting when absent).
    /// </summary>
    public static bool TryResolve(string? rawPageSize, out int pageSize, out string? error)
    {
        if (string.IsNullOrWhiteSpace(rawPageSize))
        {
            pageSize = DefaultPageSize;
            error = null;
            return true;
        }

        if (!int.TryParse(rawPageSize, out var parsed) || parsed <= 0)
        {
            pageSize = 0;
            error = "PageSize must be a positive integer.";
            return false;
        }

        pageSize = Math.Clamp(parsed, MinPageSize, MaxPageSize);
        error = null;
        return true;
    }
}
