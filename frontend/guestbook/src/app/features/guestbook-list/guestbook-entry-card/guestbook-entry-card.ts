import { Component, computed, input } from '@angular/core';
import { GuestbookEntryDto } from '../../../core/guestbook/guestbook-entry.models';
import { formatCoordinates, resolveApproximateCountry } from '../country-lookup';
import { regionDisplayName } from '../region-names';
import { formatRelativeTime } from '../relative-time';

/**
 * Presentational card for a single guestbook entry: the message, where it came from,
 * which datacenter served it, and when. Purely derived rendering — it fetches nothing
 * and holds no state of its own.
 *
 * The location shown is an approximation derived in the browser from the entry's
 * coordinates (there is no place name in the API payload), so the card deliberately
 * shows the country **and** the coordinates it was derived from, and labels the country
 * as approximate. The region badge shows `handledByRegion` — the backend instance that
 * served the create request — not `region`, which is the Cosmos storage partition.
 */
@Component({
  selector: 'gkb-guestbook-entry-card',
  templateUrl: './guestbook-entry-card.html',
  styleUrl: './guestbook-entry-card.scss',
})
export class GuestbookEntryCard {
  readonly entry = input.required<GuestbookEntryDto>();

  /**
   * Reference point for the relative timestamp. Defaults to the moment the card is
   * created and is overridable so the page can share one instant across a whole page of
   * cards, and so tests can pin it.
   */
  readonly now = input<Date>(new Date());

  protected readonly approximateCountry = computed(() =>
    resolveApproximateCountry(this.entry().lat, this.entry().lng),
  );

  protected readonly coordinates = computed(() =>
    formatCoordinates(this.entry().lat, this.entry().lng),
  );

  protected readonly regionName = computed(() => regionDisplayName(this.entry().handledByRegion));

  protected readonly relativeTime = computed(() =>
    formatRelativeTime(this.entry().ts, this.now()),
  );
}
