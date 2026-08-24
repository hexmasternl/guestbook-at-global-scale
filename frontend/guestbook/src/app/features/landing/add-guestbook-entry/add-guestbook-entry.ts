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
import { ResolvedPosition, resolveCurrentPosition } from './geolocation';
import { GuestbookApi } from './guestbook-api';
import { GuestbookEntryDto } from './guestbook-entry.models';

interface GuestbookEntryFormModel {
  message: string;
}

type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';
type LocationStatus = 'resolving' | 'available' | 'unavailable';

const GENERIC_ERROR_MESSAGE = 'Something went wrong submitting your greeting. Please try again.';
const LOCATION_UNAVAILABLE_MESSAGE =
  "We couldn't detect your location. Please enable location access in your browser and try again.";

/**
 * Modal form for composing and submitting a guestbook greeting, opened from
 * the landing page's "Sign the guestbook" CTA via `MatDialog`. Latitude and
 * longitude are never entered by hand — they are resolved from the visitor's
 * geolocation and, if unavailable, submission is blocked with guidance to
 * enable location access rather than sending a request without coordinates.
 * Purely a UI concern — the actual `POST /greet` call is delegated to
 * `GuestbookApi`.
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

  protected submitForm(): void {
    if (this.status() === 'submitting' || this.locationStatus() !== 'available' || !this.position) {
      return;
    }

    if (!this.entryForm().valid()) {
      this.entryForm().markAsTouched();
      return;
    }

    const { message } = this.model();
    const { lat, lng } = this.position;
    this.status.set('submitting');
    this.errorMessage.set(undefined);

    this.guestbookApi.createEntry({ message, lat, lng }).subscribe({
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
