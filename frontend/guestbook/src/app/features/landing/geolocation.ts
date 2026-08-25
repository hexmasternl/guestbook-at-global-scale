/** A resolved geographic coordinate pair. */
export interface ResolvedPosition {
  lat: number;
  lng: number;
}

/**
 * Deadline used when the browser has already granted location access: the
 * position is either cached or a quick re-acquire, so failing fast is right.
 */
const GRANTED_TIMEOUT_MS = 8_000;
/**
 * Deadline used when a permission prompt may still be on screen. Browsers count
 * the visitor's decision time against `timeout`, and once that deadline fires the
 * request is finished for good — clicking "Allow" afterwards never invokes the
 * success callback. A short timeout here is therefore the difference between
 * "works on the second page load" and "works on the first"; this one exists only
 * so a prompt the visitor ignores entirely doesn't leave callers waiting forever.
 */
const PROMPT_TIMEOUT_MS = 120_000;
const MAX_AGE_MS = 300_000;

/** Current geolocation permission state, or `undefined` where the Permissions API is missing or refuses the `geolocation` query (older Safari, jsdom). */
async function readPermissionState(): Promise<PermissionState | undefined> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return undefined;
  }

  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state;
  } catch {
    return undefined;
  }
}

/**
 * Wraps `navigator.geolocation.getCurrentPosition` in a promise. Resolves to
 * `undefined` (rather than rejecting) when geolocation is unavailable, denied,
 * or times out, so callers can treat "no position" as a normal, silent outcome.
 */
export async function resolveCurrentPosition(): Promise<ResolvedPosition | undefined> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return undefined;
  }

  const timeout = (await readPermissionState()) === 'granted' ? GRANTED_TIMEOUT_MS : PROMPT_TIMEOUT_MS;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(undefined),
      { timeout, maximumAge: MAX_AGE_MS },
    );
  });
}
