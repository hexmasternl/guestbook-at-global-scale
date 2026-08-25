import { resolveCurrentPosition } from './geolocation';

/** Captures the options `getCurrentPosition` was called with, so the timeout can be asserted. */
function stubGeolocation(outcome: 'success' | 'error'): { options?: PositionOptions } {
  const captured: { options?: PositionOptions } = {};
  Object.defineProperty(navigator, 'geolocation', {
    value: {
      getCurrentPosition: (
        success: PositionCallback,
        error: PositionErrorCallback,
        options?: PositionOptions,
      ) => {
        captured.options = options;
        if (outcome === 'success') {
          success({ coords: { latitude: 52.3676, longitude: 4.9041 } } as GeolocationPosition);
        } else {
          error({ code: 3, message: 'timeout' } as GeolocationPositionError);
        }
      },
    },
    configurable: true,
  });
  return captured;
}

/** Stubs the Permissions API to report the given geolocation permission state. */
function stubPermissions(state: PermissionState | 'unsupported'): void {
  Object.defineProperty(navigator, 'permissions', {
    value: state === 'unsupported' ? undefined : { query: () => Promise.resolve({ state }) },
    configurable: true,
  });
}

describe('resolveCurrentPosition', () => {
  const originalGeolocation = navigator.geolocation;
  const originalPermissions = navigator.permissions;

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
    });
    Object.defineProperty(navigator, 'permissions', {
      value: originalPermissions,
      configurable: true,
    });
  });

  it('resolves with coordinates when geolocation succeeds', async () => {
    stubPermissions('granted');
    stubGeolocation('success');

    await expect(resolveCurrentPosition()).resolves.toEqual({ lat: 52.3676, lng: 4.9041 });
  });

  it('resolves to undefined when geolocation is denied', async () => {
    stubPermissions('denied');
    stubGeolocation('error');

    await expect(resolveCurrentPosition()).resolves.toBeUndefined();
  });

  it('resolves to undefined when geolocation is unavailable', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    });

    await expect(resolveCurrentPosition()).resolves.toBeUndefined();
  });

  // Regression: browsers count the time a permission prompt sits on screen against
  // `timeout`, and a fired timeout is final — the visitor clicking "Allow" afterwards
  // never reaches the success callback. Waiting on a prompt must not use the short,
  // already-granted deadline or first-time visitors silently get no position.
  it('allows far longer than the granted-state deadline while a prompt may be shown', async () => {
    stubPermissions('prompt');
    const captured = stubGeolocation('success');

    await resolveCurrentPosition();

    expect(captured.options?.timeout).toBeGreaterThan(60_000);
  });

  it('uses the short deadline once permission is already granted', async () => {
    stubPermissions('granted');
    const captured = stubGeolocation('success');

    await resolveCurrentPosition();

    expect(captured.options?.timeout).toBe(8_000);
  });

  it('assumes a prompt may be shown when the Permissions API is unsupported', async () => {
    stubPermissions('unsupported');
    const captured = stubGeolocation('success');

    await resolveCurrentPosition();

    expect(captured.options?.timeout).toBeGreaterThan(60_000);
  });
});
