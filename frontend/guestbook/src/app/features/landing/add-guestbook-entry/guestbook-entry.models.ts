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
