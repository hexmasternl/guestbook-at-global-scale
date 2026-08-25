import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  GuestbookEntryDto,
  ListGuestbookEntriesResponse,
} from '../../core/guestbook/guestbook-entry.models';
import { GuestbookList } from './guestbook-list';

describe('GuestbookList', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<GuestbookList>;
  let el: HTMLElement;

  const url = `${environment.apiBaseUrl}/greetings`;

  const entry = (id: string, message: string): GuestbookEntryDto => ({
    id,
    message,
    lat: 52.3676,
    lng: 4.9041,
    region: 'westeurope',
    handledByRegion: 'westeurope',
    ts: '2026-08-25T10:00:00Z',
  });

  const page = (
    entries: GuestbookEntryDto[],
    continuationToken: string | null = null,
  ): ListGuestbookEntriesResponse => ({ entries, continuationToken });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuestbookList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Creates the component and answers its initial request with `response`. */
  function createAndFlush(response: ListGuestbookEntriesResponse): void {
    fixture = TestBed.createComponent(GuestbookList);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === url);
    expect(req.request.method).toBe('GET');
    req.flush(response);
    fixture.detectChanges();
  }

  const previousButton = () =>
    el.querySelectorAll<HTMLButtonElement>('.guestbook-list__page-button')[0];
  const nextButton = () =>
    el.querySelectorAll<HTMLButtonElement>('.guestbook-list__page-button')[1];
  const messages = () =>
    Array.from(el.querySelectorAll('.entry-card__message')).map((n) => n.textContent?.trim());

  it('requests the first page on init, with no continuation token', () => {
    fixture = TestBed.createComponent(GuestbookList);
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === url);
    expect(req.request.params.has('continuationToken')).toBe(false);
    req.flush(page([]));
  });

  it('requests an explicit page size within the range the API accepts', () => {
    fixture = TestBed.createComponent(GuestbookList);
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === url);
    const pageSize = Number(req.request.params.get('pageSize'));

    // Explicit, so a modest guestbook still produces more than one page; within 10–250,
    // or the API clamps it server-side.
    expect(pageSize).toBeGreaterThanOrEqual(10);
    expect(pageSize).toBeLessThanOrEqual(250);
    req.flush(page([]));
  });

  it('renders entries in the order the API returned them', () => {
    createAndFlush(page([entry('1', 'newest'), entry('2', 'middle'), entry('3', 'oldest')]));

    expect(messages()).toEqual(['newest', 'middle', 'oldest']);
  });

  it('marks the entries up as a list', () => {
    createAndFlush(page([entry('1', 'hello')]));

    expect(el.querySelector('ul.guestbook-list__entries')).toBeTruthy();
    expect(el.querySelectorAll('li.guestbook-list__entry').length).toBe(1);
  });

  it('shows page 1 with no total, and disables Previous on the first page', () => {
    createAndFlush(page([entry('1', 'hello')], 'token-2'));

    const indicator = el.querySelector('.guestbook-list__page-indicator')?.textContent ?? '';
    expect(indicator).toContain('Page 1');
    expect(indicator).not.toContain('of');
    expect(previousButton().disabled).toBe(true);
  });

  it('enables Next while the API reports more pages and disables it on the last', () => {
    createAndFlush(page([entry('1', 'hello')], 'token-2'));
    expect(nextButton().disabled).toBe(false);

    nextButton().click();
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === url).flush(page([entry('2', 'world')], null));
    fixture.detectChanges();

    expect(nextButton().disabled).toBe(true);
  });

  it('fetches the next page with the token the previous response returned', () => {
    createAndFlush(page([entry('1', 'first page')], 'token-2'));

    nextButton().click();
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === url);
    expect(req.request.params.get('continuationToken')).toBe('token-2');
    req.flush(page([entry('2', 'second page')], null));
    fixture.detectChanges();

    expect(messages()).toEqual(['second page']);
    expect(el.querySelector('.guestbook-list__page-indicator')?.textContent).toContain('Page 2');
  });

  it('re-fetches the prior page when Previous is used', () => {
    createAndFlush(page([entry('1', 'first page')], 'token-2'));

    nextButton().click();
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === url).flush(page([entry('2', 'second page')], 'token-3'));
    fixture.detectChanges();

    expect(previousButton().disabled).toBe(false);
    previousButton().click();
    fixture.detectChanges();

    // Back to page one, which is the request that carries no token at all.
    const req = httpMock.expectOne((r) => r.url === url);
    expect(req.request.params.has('continuationToken')).toBe(false);
    req.flush(page([entry('1', 'first page')], 'token-2'));
    fixture.detectChanges();

    expect(messages()).toEqual(['first page']);
    expect(el.querySelector('.guestbook-list__page-indicator')?.textContent).toContain('Page 1');
    expect(previousButton().disabled).toBe(true);
  });

  it('disables both pagination controls while a request is in flight', () => {
    createAndFlush(page([entry('1', 'hello')], 'token-2'));

    nextButton().click();
    fixture.detectChanges();

    expect(nextButton().disabled).toBe(true);
    expect(previousButton().disabled).toBe(true);

    httpMock.expectOne((r) => r.url === url).flush(page([entry('2', 'world')], null));
  });

  it('marks the results region busy while loading and not busy once loaded', () => {
    fixture = TestBed.createComponent(GuestbookList);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    expect(el.querySelector('.guestbook-list__results')?.getAttribute('aria-busy')).toBe('true');

    httpMock.expectOne((r) => r.url === url).flush(page([entry('1', 'hello')]));
    fixture.detectChanges();

    expect(el.querySelector('.guestbook-list__results')?.getAttribute('aria-busy')).toBe('false');
  });

  it('announces the results region politely', () => {
    createAndFlush(page([entry('1', 'hello')]));
    expect(el.querySelector('.guestbook-list__results')?.getAttribute('aria-live')).toBe('polite');
  });

  it('moves focus to the heading after a page loads', () => {
    createAndFlush(page([entry('1', 'hello')], 'token-2'));

    const heading = el.querySelector('.guestbook-list__heading');
    expect(heading?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(heading);
  });

  it('shows an inviting empty state, distinct from an error, when there are no entries', () => {
    createAndFlush(page([]));

    expect(el.querySelector('.guestbook-list__empty')).toBeTruthy();
    expect(el.querySelector('.guestbook-list__empty-title')?.textContent).toContain(
      'No greetings have been posted yet',
    );
    expect(el.querySelector('.guestbook-list__error')).toBeNull();
    expect(el.querySelector('ul.guestbook-list__entries')).toBeNull();
  });

  it('reports an empty page after the first as the end of the list, not an empty guestbook', () => {
    // The API returns a continuation token whenever a query *might* have more results, so
    // following one can land on an empty page even though entries exist. Verified against
    // the running API with exactly one page worth of entries.
    createAndFlush(page([entry('1', 'the only page')], 'token-2'));

    nextButton().click();
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === url).flush(page([], null));
    fixture.detectChanges();

    const empty = el.querySelector('.guestbook-list__empty-title')?.textContent ?? '';
    expect(empty).toContain('end of the guestbook');
    expect(empty).not.toContain('No greetings have been posted');
  });

  it('offers a way back to the previous page from an empty page past the end', () => {
    createAndFlush(page([entry('1', 'the only page')], 'token-2'));

    nextButton().click();
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === url).flush(page([], null));
    fixture.detectChanges();

    const back = el.querySelector<HTMLButtonElement>('.guestbook-list__empty button');
    expect(back?.textContent).toContain('previous page');

    back?.click();
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url === url);
    expect(req.request.params.has('continuationToken')).toBe(false);
    req.flush(page([entry('1', 'the only page')], 'token-2'));
    fixture.detectChanges();

    expect(messages()).toEqual(['the only page']);
  });

  it('shows an error with a retry control when the request fails', () => {
    fixture = TestBed.createComponent(GuestbookList);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url === url)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const error = el.querySelector('.guestbook-list__error');
    expect(error).toBeTruthy();
    expect(error?.getAttribute('role')).toBe('alert');
    // An error must never be presentable as "no greetings yet".
    expect(el.querySelector('.guestbook-list__empty')).toBeNull();
  });

  it('keeps the already-rendered entries when a later page request fails', () => {
    createAndFlush(page([entry('1', 'still here')], 'token-2'));

    nextButton().click();
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === url)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.querySelector('.guestbook-list__error')).toBeTruthy();
    expect(messages()).toEqual(['still here']);
  });

  it('re-requests the same page when retry is used after a failure', () => {
    createAndFlush(page([entry('1', 'first page')], 'token-2'));

    nextButton().click();
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === url)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const retry = el.querySelector<HTMLButtonElement>('.guestbook-list__error button');
    retry?.click();
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === url);
    expect(req.request.params.get('continuationToken')).toBe('token-2');
    req.flush(page([entry('2', 'second page')], null));
    fixture.detectChanges();

    expect(el.querySelector('.guestbook-list__error')).toBeNull();
    expect(messages()).toEqual(['second page']);
  });

  it('offers a back link to the landing page in every state', () => {
    createAndFlush(page([]));
    const back = el.querySelector('.guestbook-list__back');

    expect(back).toBeTruthy();
    expect(back?.getAttribute('href')).toBe('/');
  });
});
