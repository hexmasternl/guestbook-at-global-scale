import { resolveCurrentPosition } from './geolocation';

describe('resolveCurrentPosition', () => {
  const originalGeolocation = navigator.geolocation;

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
    });
  });

  it('resolves with coordinates when geolocation succeeds', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (success: PositionCallback) =>
          success({
            coords: { latitude: 52.3676, longitude: 4.9041 },
          } as GeolocationPosition),
      },
      configurable: true,
    });

    await expect(resolveCurrentPosition()).resolves.toEqual({ lat: 52.3676, lng: 4.9041 });
  });

  it('resolves to undefined when geolocation is denied', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (
          _success: PositionCallback,
          error: PositionErrorCallback,
        ) => error({ code: 1, message: 'denied' } as GeolocationPositionError),
      },
      configurable: true,
    });

    await expect(resolveCurrentPosition()).resolves.toBeUndefined();
  });

  it('resolves to undefined when geolocation is unavailable', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    });

    await expect(resolveCurrentPosition()).resolves.toBeUndefined();
  });
});
