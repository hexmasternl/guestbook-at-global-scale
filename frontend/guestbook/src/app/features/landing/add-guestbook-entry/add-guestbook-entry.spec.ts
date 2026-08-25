import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AddGuestbookEntry } from './add-guestbook-entry';
import { GuestbookApi } from './guestbook-api';
import { GuestbookEntryDto } from './guestbook-entry.models';

/** Stubs `navigator.geolocation` to resolve (or fail) with the given coordinates. */
function stubGeolocation(coords: { lat: number; lng: number } | undefined): void {
  Object.defineProperty(navigator, 'geolocation', {
    value: coords
      ? {
          getCurrentPosition: (success: PositionCallback) =>
            success({
              coords: { latitude: coords.lat, longitude: coords.lng },
            } as GeolocationPosition),
        }
      : {
          getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) =>
            error({ code: 1, message: 'denied' } as GeolocationPositionError),
        },
    configurable: true,
  });
}

/** Lets the location chain (permission query → `getCurrentPosition`) settle before asserting. */
async function settleLocation(fixture: ComponentFixture<AddGuestbookEntry>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await fixture.whenStable();
}

describe('AddGuestbookEntry', () => {
  let dialogRefMock: { close: ReturnType<typeof vi.fn> };
  let guestbookApiMock: { createEntry: ReturnType<typeof vi.fn> };
  const originalGeolocation = navigator.geolocation;

  beforeEach(async () => {
    dialogRefMock = { close: vi.fn() };
    guestbookApiMock = { createEntry: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AddGuestbookEntry],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: GuestbookApi, useValue: guestbookApiMock },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
    });
  });

  it('should create', () => {
    stubGeolocation({ lat: 52.3676, lng: 4.9041 });
    const fixture = TestBed.createComponent(AddGuestbookEntry);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('blocks submission and shows validation errors when the message is empty', async () => {
    stubGeolocation({ lat: 52.3676, lng: 4.9041 });
    const fixture = TestBed.createComponent(AddGuestbookEntry);
    const instance = fixture.componentInstance;
    fixture.detectChanges();
    await settleLocation(fixture);

    instance['model'].set({ message: '' });
    instance['submitForm']();

    expect(guestbookApiMock.createEntry).not.toHaveBeenCalled();
    expect(instance['entryForm'].message().touched()).toBe(true);
    expect(instance['entryForm'].message().invalid()).toBe(true);
  });

  it('blocks submission when location is unavailable', async () => {
    stubGeolocation(undefined);
    const fixture = TestBed.createComponent(AddGuestbookEntry);
    const instance = fixture.componentInstance;
    fixture.detectChanges();
    await settleLocation(fixture);

    expect(instance['locationStatus']()).toBe('unavailable');

    instance['model'].set({ message: 'hi from nowhere' });
    instance['submitForm']();

    expect(guestbookApiMock.createEntry).not.toHaveBeenCalled();
  });

  it('re-resolves location when retrying after it was unavailable', async () => {
    stubGeolocation(undefined);
    const fixture = TestBed.createComponent(AddGuestbookEntry);
    const instance = fixture.componentInstance;
    fixture.detectChanges();
    await settleLocation(fixture);

    expect(instance['locationStatus']()).toBe('unavailable');

    stubGeolocation({ lat: 52.3676, lng: 4.9041 });
    instance['retryLocation']();
    expect(instance['locationStatus']()).toBe('resolving');
    await settleLocation(fixture);

    expect(instance['locationStatus']()).toBe('available');
  });

  it('submits a valid entry using the resolved location, shows success, and closes the dialog', async () => {
    stubGeolocation({ lat: 52.3676, lng: 4.9041 });
    const fixture = TestBed.createComponent(AddGuestbookEntry);
    const instance = fixture.componentInstance;
    fixture.detectChanges();
    await settleLocation(fixture);

    const dto: GuestbookEntryDto = {
      id: 'a1',
      message: 'hi from Amsterdam',
      lat: 52.3676,
      lng: 4.9041,
      region: 'westeurope',
      handledByRegion: 'westeurope',
      ts: '2026-08-24T10:00:00Z',
    };
    guestbookApiMock.createEntry.mockReturnValue(of(dto));

    instance['model'].set({ message: dto.message });
    instance['submitForm']();

    expect(guestbookApiMock.createEntry).toHaveBeenCalledWith({
      message: dto.message,
      lat: dto.lat,
      lng: dto.lng,
    });
    expect(instance['status']()).toBe('success');
    expect(dialogRefMock.close).toHaveBeenCalledWith(dto);
  });

  it('shows an inline error and keeps the dialog open when submission fails', async () => {
    stubGeolocation({ lat: 52.3676, lng: 4.9041 });
    const fixture = TestBed.createComponent(AddGuestbookEntry);
    const instance = fixture.componentInstance;
    fixture.detectChanges();
    await settleLocation(fixture);

    guestbookApiMock.createEntry.mockReturnValue(throwError(() => new Error('network error')));

    instance['model'].set({ message: 'hi from Amsterdam' });
    instance['submitForm']();

    expect(instance['status']()).toBe('error');
    expect(instance['errorMessage']()).toBeTruthy();
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });
});
