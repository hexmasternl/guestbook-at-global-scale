import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { vi } from 'vitest';
import { AddGuestbookEntry } from './add-guestbook-entry/add-guestbook-entry';
import { Landing } from './landing';

describe('Landing', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Landing);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the headline, sub-headline, and a call-to-action', () => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Say hi');
    expect(compiled.querySelector('.hero__subheadline')).toBeTruthy();
    expect(compiled.querySelector('.hero__cta')).toBeTruthy();
  });

  it('should open the AddGuestbookEntry dialog when the call-to-action is clicked', () => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    const dialog = TestBed.inject(MatDialog);
    const openSpy = vi.spyOn(dialog, 'open');

    const compiled = fixture.nativeElement as HTMLElement;
    const cta = compiled.querySelector('.hero__cta') as HTMLButtonElement;
    expect(cta.tagName).toBe('BUTTON');

    cta.click();

    expect(openSpy).toHaveBeenCalledWith(AddGuestbookEntry, { ariaLabel: 'Sign the guestbook' });
  });

  // TEMPORARY: verifies the debug "set location to Amsterdam" button drives
  // the globe through its real eased-rotation flow. Remove alongside the
  // debug button/method once manually confirmed in a real browser.
  it('DEBUG: clicking the Amsterdam debug button rotates the globe to "located"', async () => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('.hero__debug-button') as HTMLButtonElement;
    expect(button).toBeTruthy();

    button.click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(compiled.querySelector('.globe-caption')?.textContent).toContain(
      'Rotated to your location',
    );
  });
});

