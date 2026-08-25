using Microsoft.Extensions.Configuration;

namespace HexMaster.Guestbook.Services;

/// <summary>
/// Resolves the current region from the "Guestbook:Region" configuration value —
/// supplied per deployment as the <c>Guestbook__Region</c> environment variable on each
/// regional Container App (see infra/modules/region.bicep) — and defaulting to "local"
/// for the emulator/dev scenario.
/// </summary>
public sealed class ConfigurationGuestbookRegionProvider(IConfiguration configuration) : IGuestbookRegionProvider
{
    public string GetCurrentRegion() => configuration["Guestbook:Region"] ?? "local";
}
