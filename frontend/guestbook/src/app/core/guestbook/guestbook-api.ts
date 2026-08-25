import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateGuestbookEntryRequest,
  GuestbookEntryDto,
  ListGuestbookEntriesOptions,
  ListGuestbookEntriesResponse,
} from './guestbook-entry.models';

/** Thin wrapper around `HttpClient` for calling the `HexMaster.Guestbook.Api` guestbook endpoints. */
@Service()
export class GuestbookApi {
  private readonly http = inject(HttpClient);

  createEntry(request: CreateGuestbookEntryRequest): Observable<GuestbookEntryDto> {
    return this.http.post<GuestbookEntryDto>(`${environment.apiBaseUrl}/greet`, request);
  }

  /**
   * Fetches one page of guestbook entries, newest first. Pagination is forward-only:
   * pass the `continuationToken` from a previous response to fetch the page after it,
   * and treat a `null` token in the response as "this was the last page".
   *
   * Parameters are only sent when actually supplied, so an omitted `pageSize` lets the
   * API apply its own default rather than this client duplicating that value.
   */
  listEntries(options?: ListGuestbookEntriesOptions): Observable<ListGuestbookEntriesResponse> {
    let params = new HttpParams();

    if (options?.pageSize !== undefined) {
      params = params.set('pageSize', options.pageSize);
    }

    if (options?.continuationToken !== undefined) {
      params = params.set('continuationToken', options.continuationToken);
    }

    return this.http.get<ListGuestbookEntriesResponse>(`${environment.apiBaseUrl}/greetings`, {
      params,
    });
  }
}
