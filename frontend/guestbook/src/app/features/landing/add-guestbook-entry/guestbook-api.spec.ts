import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { GuestbookApi } from './guestbook-api';
import { GuestbookEntryDto } from './guestbook-entry.models';

describe('GuestbookApi', () => {
  let api: GuestbookApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(GuestbookApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('POSTs the request to {apiBaseUrl}/greet and returns the mapped response', () => {
    const request = { message: 'hi from Amsterdam', lat: 52.3676, lng: 4.9041 };
    const response: GuestbookEntryDto = {
      id: 'a1b2',
      message: request.message,
      lat: request.lat,
      lng: request.lng,
      region: 'westeurope',
      ts: '2026-08-24T10:00:00Z',
    };

    let result: GuestbookEntryDto | undefined;
    api.createEntry(request).subscribe((dto) => (result = dto));

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/greet`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(response);

    expect(result).toEqual(response);
  });
});
