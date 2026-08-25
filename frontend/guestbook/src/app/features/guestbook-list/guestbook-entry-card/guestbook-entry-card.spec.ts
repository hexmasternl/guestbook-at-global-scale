import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuestbookEntryDto } from '../../../core/guestbook/guestbook-entry.models';
import { GuestbookEntryCard } from './guestbook-entry-card';

describe('GuestbookEntryCard', () => {
  const now = new Date('2026-08-25T12:00:00Z');

  const entry = (overrides: Partial<GuestbookEntryDto> = {}): GuestbookEntryDto => ({
    id: 'a1b2',
    message: 'Hi from Amsterdam!',
    lat: 52.3676,
    lng: 4.9041,
    region: 'westeurope',
    handledByRegion: 'westeurope',
    ts: '2026-08-25T10:00:00Z',
    ...overrides,
  });

  async function render(
    dto: GuestbookEntryDto,
  ): Promise<{ fixture: ComponentFixture<GuestbookEntryCard>; el: HTMLElement }> {
    await TestBed.configureTestingModule({ imports: [GuestbookEntryCard] }).compileComponents();

    const fixture = TestBed.createComponent(GuestbookEntryCard);
    const ref: ComponentRef<GuestbookEntryCard> = fixture.componentRef;
    ref.setInput('entry', dto);
    ref.setInput('now', now);
    fixture.detectChanges();

    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders the message', async () => {
    const { el } = await render(entry({ message: 'Hallo uit Rotterdam' }));
    expect(el.querySelector('.entry-card__message')?.textContent).toContain('Hallo uit Rotterdam');
  });

  it('renders the handling region as a friendly name with the raw slug in the title', async () => {
    const { el } = await render(entry({ handledByRegion: 'swedencentral' }));
    const badge = el.querySelector('.entry-card__region');

    expect(badge?.textContent).toContain('Sweden Central');
    expect(badge?.getAttribute('title')).toBe('swedencentral');
  });

  it('shows handledByRegion rather than the storage partition region', async () => {
    const { el } = await render(entry({ region: 'westeurope', handledByRegion: 'eastus' }));
    const badge = el.querySelector('.entry-card__region');

    expect(badge?.textContent).toContain('East US');
    expect(badge?.textContent).not.toContain('West Europe');
  });

  it('falls back to the raw slug for an unmapped region', async () => {
    const { el } = await render(entry({ handledByRegion: 'germanywestcentral' }));
    expect(el.querySelector('.entry-card__region')?.textContent).toContain('germanywestcentral');
  });

  it('shows the approximate country alongside the exact coordinates', async () => {
    const { el } = await render(entry({ lat: 52.3676, lng: 4.9041 }));

    expect(el.querySelector('.entry-card__place')?.textContent).toContain('Netherlands');
    expect(el.querySelector('.entry-card__coords')?.textContent).toContain('52.4° N, 4.9° E');
  });

  it('labels the resolved country as approximate', async () => {
    const { el } = await render(entry());
    expect(el.querySelector('.entry-card__qualifier')?.textContent).toContain('approx.');
  });

  it('shows the coordinates without a place name when the country cannot be resolved', async () => {
    const { el } = await render(entry({ lat: Number.NaN, lng: Number.NaN }));

    expect(el.querySelector('.entry-card__place')).toBeNull();
    expect(el.querySelector('.entry-card__qualifier')).toBeNull();
    expect(el.querySelector('.entry-card__location')).toBeTruthy();
  });

  it('renders the timestamp as relative text carrying the exact ISO value', async () => {
    const { el } = await render(entry({ ts: '2026-08-25T10:00:00Z' }));
    const time = el.querySelector('time');

    expect(time?.getAttribute('datetime')).toBe('2026-08-25T10:00:00Z');
    expect(time?.textContent).toContain('2 hours');
  });
});
