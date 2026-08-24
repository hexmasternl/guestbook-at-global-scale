import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateGuestbookEntryRequest, GuestbookEntryDto } from './guestbook-entry.models';

/** Thin wrapper around `HttpClient` for calling the `HexMaster.Guestbook.Api` guestbook endpoints. */
@Service()
export class GuestbookApi {
  private readonly http = inject(HttpClient);

  createEntry(request: CreateGuestbookEntryRequest): Observable<GuestbookEntryDto> {
    return this.http.post<GuestbookEntryDto>(`${environment.apiBaseUrl}/greet`, request);
  }
}
