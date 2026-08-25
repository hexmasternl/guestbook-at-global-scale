import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AddGuestbookEntry } from './add-guestbook-entry/add-guestbook-entry';
import { Landing } from './landing';

describe('Landing', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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

  it('should link the secondary call-to-action to the guestbook list route', () => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const secondary = compiled.querySelector('.hero__cta-secondary') as HTMLAnchorElement;

    // An anchor, not a button: unlike the primary CTA, this one navigates.
    expect(secondary.tagName).toBe('A');
    expect(secondary.getAttribute('href')).toBe('/list');
    expect(secondary.textContent).toContain('View the guestbook');
  });

  it('should keep the "how it works" section and its anchor target', () => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#how-it-works')).toBeTruthy();
  });

  it('should point the footer at the guestbook list', () => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const footerLink = compiled.querySelector('.site-footer__link') as HTMLAnchorElement;

    expect(footerLink.getAttribute('href')).toBe('/list');
  });
});

