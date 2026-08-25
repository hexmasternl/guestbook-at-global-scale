/** Request payload for `POST /greet`, matching the API's `CreateGuestbookEntryRequest`. */
export interface CreateGuestbookEntryRequest {
  message: string;
  lat: number;
  lng: number;
}

/** Response shape for a persisted guestbook entry, matching the API's `GuestbookEntryDto`. */
export interface GuestbookEntryDto {
  id: string;
  message: string;
  lat: number;
  lng: number;
  region: string;
  /** Azure region of the backend instance that handled the request. */
  handledByRegion: string;
  ts: string;
}

/** Query parameters for `GET /greetings`. Both are optional; omitting `pageSize` lets the API apply its own default. */
export interface ListGuestbookEntriesOptions {
  pageSize?: number;
  continuationToken?: string;
}

/**
 * Response shape for `GET /greetings`, matching the API's `ListGuestbookEntriesResponse`.
 * `continuationToken` is `null` once the last page has been reached.
 */
export interface ListGuestbookEntriesResponse {
  entries: GuestbookEntryDto[];
  continuationToken: string | null;
}
