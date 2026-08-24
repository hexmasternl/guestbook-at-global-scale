import { Component, inject, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { AddGuestbookEntry } from './add-guestbook-entry/add-guestbook-entry';
import { Globe } from './globe/globe';

/**
 * Landing page: a full-viewport hero (headline, sub-headline, animated 3D
 * Earth graphic, CTA) followed by a "how it works" feature strip and a
 * footer. The "Sign the guestbook" CTA opens the `AddGuestbookEntry` modal
 * dialog; the page itself is otherwise purely presentational and makes no
 * direct calls to the guestbook API.
 */
@Component({
  selector: 'gkb-landing',
  imports: [MatButtonModule, Globe],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  private readonly dialog = inject(MatDialog);

  // TEMPORARY: kept in at the user's request to manually verify the
  // geolocation rotation/marker placement without needing real browser
  // location access. Remove this, the `debugSetAmsterdam` method, and the
  // debug button in landing.html once confirmed working.
  private readonly globe = viewChild.required(Globe);

  protected debugSetAmsterdam(): void {
    this.globe().setLocationForTesting(52.3676, 4.9041);
  }

  protected openAddGuestbookEntry(): void {
    this.dialog.open(AddGuestbookEntry, { ariaLabel: 'Sign the guestbook' });
  }
}

