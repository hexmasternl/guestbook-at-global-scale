/**
 * Request payload for `POST /greet`, matching the API's `CreateGuestbookEntryRequest`.
 *
 * `lat`/`lng` are optional: the browser only has coordinates to send when the visitor
 * granted location access. Omit both (or send `null`) and the API approximates the
 * location from the client's IP address instead, storing it as unknown if that fails
 * too. They must be sent together — one without the other is rejected as a 400.
 */
export interface CreateGuestbookEntryRequest {
  message: string;
  lat?: number | null;
  lng?: number | null;
}

/** Response shape for a persisted guestbook entry, matching the API's `GuestbookEntryDto`. */
export interface GuestbookEntryDto {
  id: string;
  message: string;
  /** `null` when the entry's origin is unknown — no shared coordinates, no IP match. Always `null` together with `lng`. */
  lat: number | null;
  /** `null` when the entry's origin is unknown. See `lat`. */
  lng: number | null;
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
