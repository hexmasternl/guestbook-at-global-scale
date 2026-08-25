import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { timeout } from 'rxjs';
import { GuestbookApi } from '../../core/guestbook/guestbook-api';
import { GuestbookEntryDto } from '../../core/guestbook/guestbook-entry.models';
import { GuestbookEntryCard } from './guestbook-entry-card/guestbook-entry-card';

type ListStatus = 'loading' | 'ready' | 'error';

const GENERIC_ERROR_MESSAGE =
  "We couldn't load the guestbook just now. This can happen if a region is briefly unavailable.";

/**
 * Entries per page. Explicit rather than letting the API apply its default of 50: fifty
 * cards is a long scroll on a phone, 12 divides evenly across the one-, two- and
 * three-column grid, and — most practically — a guestbook holding a few dozen greetings
 * would never produce a second page at 50, leaving the pagination permanently inert.
 * Must stay within the API's accepted 10–250 range, or it is clamped server-side.
 */
const PAGE_SIZE = 12;

/**
 * Deadline for a page request. Without one, an unreachable region does not fail — the
 * request simply hangs, and the page spins indefinitely instead of reaching the error
 * state. Observed directly: with the API stopped mid-session the request was still
 * pending after nine seconds. A visible "something went wrong, try again" is a far better
 * outcome than an eternal spinner, especially when a region is pulled during a live demo.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * The `/list` page: persisted guestbook entries, newest first, one page at a time.
 *
 * Pagination is forward-only because the API's is — Cosmos DB continuation tokens can
 * fetch the page *after* a position and nothing else, and there is no total count. So
 * this component keeps a stack of the tokens it has visited: "next" pushes the token the
 * latest response handed back, "previous" pops and re-requests the one now on top. That
 * re-request is deliberate over caching pages client-side: stepping back shows current
 * data, which in a multi-region demo may legitimately include entries that arrived since.
 *
 * Every fetch goes through `loadPage`, so the initial load, next, previous and retry all
 * share one set of state transitions.
 */
@Component({
  selector: 'gkb-guestbook-list',
  imports: [MatButtonModule, MatProgressSpinnerModule, RouterLink, GuestbookEntryCard],
  templateUrl: './guestbook-list.html',
  styleUrl: './guestbook-list.scss',
})
export class GuestbookList {
  private readonly guestbookApi = inject(GuestbookApi);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('listHeading');

  protected readonly entries = signal<GuestbookEntryDto[]>([]);
  protected readonly status = signal<ListStatus>('loading');
  protected readonly errorMessage = signal<string | undefined>(undefined);

  /**
   * One entry per page visited, oldest first; `undefined` is the first page (no token).
   * Its length is the current page number.
   */
  private readonly tokenStack = signal<(string | undefined)[]>([undefined]);

  /** Continuation token from the most recent response; `null` once the last page is reached. */
  private readonly nextToken = signal<string | null>(null);

  /** Shared reference instant for every card's relative timestamp on this page. */
  protected readonly renderedAt = signal<Date>(new Date());

  protected readonly pageNumber = computed(() => this.tokenStack().length);
  protected readonly isLoading = computed(() => this.status() === 'loading');

  /**
   * Empty is derived rather than being a fourth status: it is a property of a *successful*
   * response, and conflating the two would let a failed request read as "no greetings yet".
   */
  private readonly isEmpty = computed(
    () => this.status() === 'ready' && this.entries().length === 0,
  );

  /** An empty first page: the guestbook genuinely has nothing in it yet. */
  protected readonly isEmptyGuestbook = computed(() => this.isEmpty() && this.pageNumber() === 1);

  /**
   * An empty page after the first: the visitor has walked off the end of the list. The API
   * returns a continuation token whenever a query *might* have more results, so following
   * one can legitimately land on an empty page — telling someone here that "no greetings
   * have been posted yet" would be false.
   */
  protected readonly isPastLastPage = computed(() => this.isEmpty() && this.pageNumber() > 1);

  protected readonly canGoNext = computed(() => !this.isLoading() && this.nextToken() !== null);
  protected readonly canGoPrevious = computed(() => !this.isLoading() && this.pageNumber() > 1);

  constructor() {
    this.loadPage(undefined);
  }

  protected nextPage(): void {
    if (!this.canGoNext()) {
      return;
    }

    const token = this.nextToken();
    if (token === null) {
      return;
    }

    this.tokenStack.update((stack) => [...stack, token]);
    this.loadPage(token);
  }

  protected previousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    const stack = this.tokenStack();
    const remaining = stack.slice(0, -1);
    this.tokenStack.set(remaining);
    this.loadPage(remaining[remaining.length - 1]);
  }

  /** Re-requests the page currently being viewed, after a failure. */
  protected retry(): void {
    const stack = this.tokenStack();
    this.loadPage(stack[stack.length - 1]);
  }

  private loadPage(continuationToken: string | undefined): void {
    this.status.set('loading');
    this.errorMessage.set(undefined);

    this.guestbookApi
      .listEntries({ pageSize: PAGE_SIZE, continuationToken })
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (response) => {
          this.entries.set(response.entries ?? []);
          this.nextToken.set(response.continuationToken ?? null);
          this.renderedAt.set(new Date());
          this.status.set('ready');
          this.focusHeading();
        },
        error: () => {
          // Entries from the previous page are deliberately left in place: a failed
          // next-page request should not wipe out what the visitor is already reading.
          this.errorMessage.set(GENERIC_ERROR_MESSAGE);
          this.status.set('error');
        },
      });
  }

  /**
   * Moves focus to the list heading after a page loads, so a keyboard or screen-reader
   * user is not left with focus on a pagination button while the content behind them has
   * been replaced.
   */
  private focusHeading(): void {
    this.heading()?.nativeElement.focus({ preventScroll: true });
  }
}
