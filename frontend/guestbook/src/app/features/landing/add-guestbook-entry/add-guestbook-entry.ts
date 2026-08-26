import { Component, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ResolvedPosition, resolveCurrentPosition } from '../geolocation';
import { GuestbookApi } from '../../../core/guestbook/guestbook-api';
import { GuestbookEntryDto } from '../../../core/guestbook/guestbook-entry.models';

interface GuestbookEntryFormModel {
  message: string;
}

type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';
type LocationStatus = 'resolving' | 'available' | 'unavailable';

const GENERIC_ERROR_MESSAGE = 'Something went wrong submitting your greeting. Please try again.';
const LOCATION_UNAVAILABLE_MESSAGE =
  "We couldn't use your device location, so we'll estimate where you are from your network connection instead.";

/**
 * Modal form for composing and submitting a guestbook greeting, opened from
 * the landing page's "Sign the guestbook" CTA via `MatDialog`.
 *
 * Coordinates are never entered by hand, and sharing them is **optional**: the dialog
 * asks the browser for the visitor's location once on open, and if that is denied,
 * unavailable, or still pending when the form is submitted, the greeting is sent without
 * coordinates. The API then approximates the location from the client's IP address, and
 * records it as unknown if even that fails — so a visitor who never grants location
 * access can still sign the guestbook.
 *
 * Purely a UI concern — the actual `POST /greet` call is delegated to `GuestbookApi`.
 */
@Component({
  selector: 'gkb-add-guestbook-entry',
  imports: [
    FormField,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './add-guestbook-entry.html',
  styleUrl: './add-guestbook-entry.scss',
})
export class AddGuestbookEntry {
  private readonly dialogRef = inject(MatDialogRef<AddGuestbookEntry, GuestbookEntryDto | undefined>);
  private readonly guestbookApi = inject(GuestbookApi);

  protected readonly model = signal<GuestbookEntryFormModel>({ message: '' });

  protected readonly entryForm = form(this.model, (f) => {
    required(f.message, { message: 'Please enter a message.' });
  });

  protected readonly status = signal<SubmissionStatus>('idle');
  protected readonly errorMessage = signal<string | undefined>(undefined);

  protected readonly locationStatus = signal<LocationStatus>('resolving');
  private position: ResolvedPosition | undefined;

  constructor() {
    this.resolveLocation();
  }

  private resolveLocation(): void {
    this.locationStatus.set('resolving');
    resolveCurrentPosition().then((position) => {
      this.position = position;
      this.locationStatus.set(position ? 'available' : 'unavailable');
    });
  }

  protected retryLocation(): void {
    this.resolveLocation();
  }

  protected submitForm(event?: Event): void {
    // The dialog form has no `NgForm` directive (signal forms only bring `FormField`),
    // so the native submit must be cancelled here or the browser reloads the page.
    event?.preventDefault();

    if (this.status() === 'submitting') {
      return;
    }

    if (!this.entryForm().valid()) {
      this.entryForm().markAsTouched();
      return;
    }

    const { message } = this.model();
    this.status.set('submitting');
    this.errorMessage.set(undefined);

    // Coordinates are sent only when the visitor actually shared them; omitting them
    // hands the location question to the server (IP lookup, then "unknown").
    const request = this.position
      ? { message, lat: this.position.lat, lng: this.position.lng }
      : { message };

    this.guestbookApi.createEntry(request).subscribe({
      next: (dto) => {
        this.status.set('success');
        this.dialogRef.close(dto);
      },
      error: () => {
        this.status.set('error');
        this.errorMessage.set(GENERIC_ERROR_MESSAGE);
      },
    });
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected readonly locationUnavailableMessage = LOCATION_UNAVAILABLE_MESSAGE;
}
