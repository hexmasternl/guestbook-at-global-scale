import { formatCoordinates, resolveApproximateCountry } from './country-lookup';

describe('resolveApproximateCountry', () => {
  it('resolves clearly-inland points to the expected country', () => {
    // Amsterdam, Nairobi, Brasília, Canberra — each far from any land border.
    expect(resolveApproximateCountry(52.3676, 4.9041)).toBe('Netherlands');
    expect(resolveApproximateCountry(-1.2921, 36.8219)).toBe('Kenya');
    expect(resolveApproximateCountry(-15.7939, -47.8828)).toBe('Brazil');
    expect(resolveApproximateCountry(-35.2809, 149.13)).toBe('Australia');
  });

  it('resolves a point in a country whose centroid is far from it', () => {
    // Tromsø is ~700km from Norway's centroid and close to Sweden and Finland; the
    // bounding-box narrowing is what keeps this from drifting to a neighbour.
    expect(resolveApproximateCountry(69.6492, 18.9553)).toBe('Norway');
  });

  it('falls back to the nearest centroid for a mid-ocean point without throwing', () => {
    // Middle of the South Pacific — inside no country's bounding box.
    const result = resolveApproximateCountry(-35.0, -140.0);
    expect(result).toBeTypeOf('string');
    expect(result).not.toBe('');
  });

  it('resolves the (0, 0) sentinel to a name rather than failing', () => {
    // The API falls back to (0, 0) when it cannot resolve a location at all. The point
    // is in the Gulf of Guinea; any nearby West African country is a defensible answer,
    // so this asserts only that something sensible comes back.
    const result = resolveApproximateCountry(0, 0);
    expect(result).toBeTypeOf('string');
    expect(result).not.toBe('');
  });

  it('resolves a border-adjacent point to one of the neighbouring countries', () => {
    // Basel sits on the Swiss/French/German border. Nearest-centroid cannot reliably
    // pick the right one, and this test documents that imprecision rather than pinning
    // the assertion to whichever neighbour currently wins.
    const result = resolveApproximateCountry(47.5596, 7.5886);
    expect(['Switzerland', 'France', 'Germany']).toContain(result);
  });

  it('resolves the non-contiguous United States from its own bounding boxes', () => {
    expect(resolveApproximateCountry(61.2181, -149.9003)).toBe('United States'); // Anchorage
    expect(resolveApproximateCountry(21.3069, -157.8583)).toBe('United States'); // Honolulu
    expect(resolveApproximateCountry(47.6062, -122.3321)).toBe('United States'); // Seattle
  });

  it('documents the known misses this table cannot resolve correctly', () => {
    // Both are real observations from running the page against seeded data, kept as tests
    // so the behaviour is recorded rather than rediscovered. Toronto sits deep inside the
    // contiguous-US longitude span and closer to the US centroid than Canada's; Buenos
    // Aires is across the estuary from Uruguay and inside its box. Fixing either needs
    // real border polygons — see design.md decision 4.
    expect(resolveApproximateCountry(43.6532, -79.3832)).toBe('United States'); // actually Canada
    expect(resolveApproximateCountry(-34.6037, -58.3816)).toBe('Uruguay'); // actually Argentina
  });

  it('returns undefined for non-finite coordinates', () => {
    expect(resolveApproximateCountry(Number.NaN, 4.9)).toBeUndefined();
    expect(resolveApproximateCountry(52.4, Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  it('returns undefined for coordinates outside the valid range', () => {
    expect(resolveApproximateCountry(91, 0)).toBeUndefined();
    expect(resolveApproximateCountry(0, -181)).toBeUndefined();
  });
});

describe('formatCoordinates', () => {
  it('formats northern and eastern coordinates', () => {
    expect(formatCoordinates(52.3676, 4.9041)).toBe('52.4° N, 4.9° E');
  });

  it('formats southern and western coordinates as positive magnitudes', () => {
    expect(formatCoordinates(-33.8688, -151.2093)).toBe('33.9° S, 151.2° W');
  });

  it('formats mixed hemispheres', () => {
    expect(formatCoordinates(-1.2921, 36.8219)).toBe('1.3° S, 36.8° E');
    expect(formatCoordinates(40.7128, -74.006)).toBe('40.7° N, 74.0° W');
  });

  it('renders zero on the positive side of each axis', () => {
    expect(formatCoordinates(0, 0)).toBe('0.0° N, 0.0° E');
  });

  it('returns an empty string for non-finite coordinates', () => {
    expect(formatCoordinates(Number.NaN, 0)).toBe('');
  });
});
