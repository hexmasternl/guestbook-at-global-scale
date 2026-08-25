/**
 * Formats an ISO timestamp as a short relative string ("just now", "2 hours ago",
 * "3 days ago") using the platform's `Intl.RelativeTimeFormat` — no date library.
 *
 * `now` is a required argument rather than being read from the clock inside: it keeps the
 * function pure and testable, and it means no `Date.now()` call hides inside a template
 * binding (see the repo's Angular conventions).
 *
 * Falls back to the raw input when it is not a parseable timestamp, so a malformed `ts`
 * from the API degrades to something visible rather than to "Invalid Date" or a crash.
 */
export function formatRelativeTime(isoTimestamp: string, now: Date): string {
  const then = new Date(isoTimestamp);

  if (Number.isNaN(then.getTime())) {
    return isoTimestamp;
  }

  const elapsedSeconds = Math.round((then.getTime() - now.getTime()) / 1000);
  const magnitude = Math.abs(elapsedSeconds);

  if (magnitude < 45) {
    return 'just now';
  }

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  for (const [unit, seconds] of UNIT_THRESHOLDS) {
    if (magnitude >= seconds) {
      return formatter.format(Math.round(elapsedSeconds / seconds), unit);
    }
  }

  return formatter.format(Math.round(elapsedSeconds / 60), 'minute');
}

/**
 * Largest unit first, so the loop picks the coarsest unit that still yields a count of
 * at least one. Months and years use average lengths — a greeting's age is never
 * calendar-sensitive, so approximating is fine and avoids date arithmetic.
 */
const UNIT_THRESHOLDS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
];
