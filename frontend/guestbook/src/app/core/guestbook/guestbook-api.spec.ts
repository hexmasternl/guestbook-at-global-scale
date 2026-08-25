import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { GuestbookApi } from './guestbook-api';
import { GuestbookEntryDto, ListGuestbookEntriesResponse } from './guestbook-entry.models';

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

  const entry = (overrides: Partial<GuestbookEntryDto> = {}): GuestbookEntryDto => ({
    id: 'a1b2',
    message: 'hi from Amsterdam',
    lat: 52.3676,
    lng: 4.9041,
    region: 'westeurope',
    handledByRegion: 'westeurope',
    ts: '2026-08-24T10:00:00Z',
    ...overrides,
  });

  describe('createEntry', () => {
    it('POSTs the request to {apiBaseUrl}/greet and returns the mapped response', () => {
      const request = { message: 'hi from Amsterdam', lat: 52.3676, lng: 4.9041 };
      const response = entry();

      let result: GuestbookEntryDto | undefined;
      api.createEntry(request).subscribe((dto) => (result = dto));

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/greet`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(response);

      expect(result).toEqual(response);
    });
  });

  describe('listEntries', () => {
    it('GETs {apiBaseUrl}/greetings and passes the response body through unchanged', () => {
      const response: ListGuestbookEntriesResponse = {
        entries: [entry(), entry({ id: 'c3d4', handledByRegion: 'eastus' })],
        continuationToken: 'token-for-page-2',
      };

      let result: ListGuestbookEntriesResponse | undefined;
      api.listEntries().subscribe((page) => (result = page));

      const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/greetings`);
      expect(req.request.method).toBe('GET');
      req.flush(response);

      expect(result).toEqual(response);
    });

    it('sends no query parameters when no options are supplied', () => {
      api.listEntries().subscribe();

      const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/greetings`);
      expect(req.request.params.keys()).toEqual([]);
      req.flush({ entries: [], continuationToken: null });
    });

    it('sends no query parameters when an empty options object is supplied', () => {
      api.listEntries({}).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/greetings`);
      expect(req.request.params.keys()).toEqual([]);
      req.flush({ entries: [], continuationToken: null });
    });

    it('sends pageSize and continuationToken when both are supplied', () => {
      api.listEntries({ pageSize: 25, continuationToken: 'token-for-page-2' }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/greetings`);
      expect(req.request.params.get('pageSize')).toBe('25');
      expect(req.request.params.get('continuationToken')).toBe('token-for-page-2');
      req.flush({ entries: [], continuationToken: null });
    });

    it('sends only pageSize when the continuation token is omitted', () => {
      api.listEntries({ pageSize: 10 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/greetings`);
      expect(req.request.params.get('pageSize')).toBe('10');
      expect(req.request.params.has('continuationToken')).toBe(false);
      req.flush({ entries: [], continuationToken: null });
    });

    it('surfaces a null continuation token as the last page', () => {
      let result: ListGuestbookEntriesResponse | undefined;
      api.listEntries().subscribe((page) => (result = page));

      httpMock
        .expectOne((r) => r.url === `${environment.apiBaseUrl}/greetings`)
        .flush({ entries: [entry()], continuationToken: null });

      expect(result?.continuationToken).toBeNull();
    });
  });
});
