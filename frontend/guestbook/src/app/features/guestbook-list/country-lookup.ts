import { COUNTRIES, CountryRow } from './countries.data';

/**
 * Resolves a coordinate pair to an **approximate** country name, entirely offline.
 *
 * Two passes, in order:
 *  1. Narrow to countries whose bounding box contains the point, then take the nearest
 *     centroid among those. The box filter is what keeps a point in northern Norway from
 *     resolving to Sweden just because Sweden's centroid happens to be closer.
 *  2. If no box contains the point — mid-ocean coordinates, for instance — take the
 *     nearest centroid overall, so there is always a best guess rather than a blank.
 *
 * Distance is squared degrees, not great-circle: it is monotonic with real distance for
 * the comparison being made here, and this runs once per rendered entry.
 *
 * Returns `undefined` for an entry with no location at all (`lat`/`lng` are `null` when
 * the visitor shared no coordinates and the API could not approximate any from their IP
 * address) and for coordinates that are not finite or out of range. Callers must treat
 * the result as a display aid and keep the real coordinates visible — see the accuracy
 * caveats on `COUNTRIES`.
 */
export function resolveApproximateCountry(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string | undefined {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return undefined;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return undefined;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return undefined;
  }

  const withinBox = COUNTRIES.filter((row) => containsPoint(row, lat, lng));
  const candidates = withinBox.length > 0 ? withinBox : COUNTRIES;

  return nearestByCentroid(candidates, lat, lng)?.[1];
}

function containsPoint(row: CountryRow, lat: number, lng: number): boolean {
  const [, , , , minLat, minLng, maxLat, maxLng] = row;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

function nearestByCentroid(
  rows: readonly CountryRow[],
  lat: number,
  lng: number,
): CountryRow | undefined {
  let nearest: CountryRow | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const row of rows) {
    const [, , centroidLat, centroidLng] = row;
    const dLat = centroidLat - lat;
    const dLng = centroidLng - lng;
    const distance = dLat * dLat + dLng * dLng;

    if (distance < nearestDistance) {
      nearest = row;
      nearestDistance = distance;
    }
  }

  return nearest;
}

/**
 * Formats a coordinate pair for display, e.g. `52.4° N, 4.9° E`. One decimal place is
 * deliberate: it is roughly city-scale precision, which is all a guestbook pin conveys,
 * and it keeps the label short enough to sit beside a country name on a phone.
 *
 * Returns an empty string when there is nothing to format: an entry whose location is
 * unknown (`null` coordinates), or values that are not finite. Callers render their own
 * "unknown location" wording in that case rather than a fabricated coordinate — `(0, 0)`
 * is a real place in the Gulf of Guinea, and the API never invents it.
 */
export function formatCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return '';
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return '';
  }

  const latHemisphere = lat < 0 ? 'S' : 'N';
  const lngHemisphere = lng < 0 ? 'W' : 'E';

  return `${Math.abs(lat).toFixed(1)}° ${latHemisphere}, ${Math.abs(lng).toFixed(1)}° ${lngHemisphere}`;
}
