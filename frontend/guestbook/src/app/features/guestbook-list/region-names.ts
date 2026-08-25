/**
 * Display names for the Azure regions this app can be served from.
 *
 * Covers every region listed in `infra/main.bicep`'s `regions` parameter — including the
 * entries currently commented out there, since uncommenting one should not silently
 * regress the badge to a raw slug — plus the Static Web App locations that file allows,
 * and `local`, which is what `ConfigurationGuestbookRegionProvider` reports when
 * `Guestbook:Region` is unset (i.e. every developer machine).
 *
 * Anything unmapped falls through to the raw slug rather than to "Unknown": a truthful
 * `germanywestcentral` beats a confidently wrong or blank label.
 */
const REGION_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  local: 'Local development',

  // Regions referenced by infra/main.bicep's `regions` parameter.
  australiacentral: 'Australia Central',
  eastus: 'East US',
  southafricanorth: 'South Africa North',
  swedencentral: 'Sweden Central',
  westeurope: 'West Europe',
  westindia: 'West India',
  westus: 'West US',

  // Additional Static Web App locations allowed by infra/main.bicep.
  centralus: 'Central US',
  eastasia: 'East Asia',
  eastus2: 'East US 2',
  westus2: 'West US 2',
};

/**
 * Human-readable name for an Azure region slug, or the slug itself when it is not one
 * we know about. Comparison is case-insensitive and tolerates surrounding whitespace,
 * since the value travels from configuration through the API as a bare string.
 */
export function regionDisplayName(slug: string): string {
  const normalized = slug?.trim().toLowerCase();

  if (!normalized) {
    return slug;
  }

  return REGION_DISPLAY_NAMES[normalized] ?? slug;
}
