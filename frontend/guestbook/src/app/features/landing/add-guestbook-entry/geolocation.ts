/** A resolved geographic coordinate pair. */
export interface ResolvedPosition {
  lat: number;
  lng: number;
}

/**
 * Wraps `navigator.geolocation.getCurrentPosition` in a promise, using the same
 * timeout/max-age options as the landing page's `Globe` component. Resolves to
 * `undefined` (rather than rejecting) when geolocation is unavailable, denied,
 * or times out, so callers can treat "no position" as a normal, silent outcome.
 */
export function resolveCurrentPosition(): Promise<ResolvedPosition | undefined> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(undefined),
      { timeout: 8000, maximumAge: 300_000 },
    );
  });
}
