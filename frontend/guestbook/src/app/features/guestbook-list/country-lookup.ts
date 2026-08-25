import { COUNTRIES, CountryRow } from './countries.data';

/**
 * Resolves a coordinate pair to an **approximate** country name, entirely offline.
 *
 * Two passes, in order:
 *  1. Narrow to countries whose bounding box contains the point, then take the nearest
 *     centroid among those. The box filter is what keeps a point in northern Norway from
 *     resolving to Sweden just because Sweden's centroid happens to be closer.
 *  2. If no box contains the point — mid-ocean coordinates, the `(0, 0)` sentinel the API
 *     falls back to when it cannot resolve a location — take the nearest centroid overall,
 *     so there is always a best guess rather than a blank.
 *
 * Distance is squared degrees, not great-circle: it is monotonic with real distance for
 * the comparison being made here, and this runs once per rendered entry.
 *
 * Returns `undefined` only for coordinates that are not finite or out of range. Callers
 * must treat the result as a display aid and keep the real coordinates visible — see the
 * accuracy caveats on `COUNTRIES`.
 */
export function resolveApproximateCountry(lat: number, lng: number): string | undefined {
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
 * Zero is rendered on the positive side of each axis (`0.0° N`, `0.0° E`) rather than
 * given a special case — the API's unresolved-location sentinel is exactly `(0, 0)`, and
 * showing it plainly is more honest than dressing it up.
 */
export function formatCoordinates(lat: number, lng: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return '';
  }

  const latHemisphere = lat < 0 ? 'S' : 'N';
  const lngHemisphere = lng < 0 ? 'W' : 'E';

  return `${Math.abs(lat).toFixed(1)}° ${latHemisphere}, ${Math.abs(lng).toFixed(1)}° ${lngHemisphere}`;
}
