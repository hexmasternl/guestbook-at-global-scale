import { regionDisplayName } from './region-names';

describe('regionDisplayName', () => {
  it('maps a known region slug to its display name', () => {
    expect(regionDisplayName('westeurope')).toBe('West Europe');
    expect(regionDisplayName('swedencentral')).toBe('Sweden Central');
    expect(regionDisplayName('eastus')).toBe('East US');
  });

  it("maps the API's local-development fallback region", () => {
    expect(regionDisplayName('local')).toBe('Local development');
  });

  it('returns an unmapped slug verbatim rather than labelling it unknown', () => {
    expect(regionDisplayName('germanywestcentral')).toBe('germanywestcentral');
  });

  it('matches known slugs case-insensitively and ignores surrounding whitespace', () => {
    expect(regionDisplayName('WestEurope')).toBe('West Europe');
    expect(regionDisplayName('  westeurope  ')).toBe('West Europe');
  });

  it('returns empty and whitespace-only values unchanged', () => {
    expect(regionDisplayName('')).toBe('');
    expect(regionDisplayName('   ')).toBe('   ');
  });
});
