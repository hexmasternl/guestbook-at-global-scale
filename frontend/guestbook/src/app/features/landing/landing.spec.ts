import { TestBed } from '@angular/core/testing';
import { Landing } from './landing';

describe('Landing', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
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

  it('should not call the guestbook API from the call-to-action', () => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const cta = compiled.querySelector('.hero__cta') as HTMLAnchorElement;
    expect(cta.getAttribute('href')).toBe('#coming-soon');
  });
});
