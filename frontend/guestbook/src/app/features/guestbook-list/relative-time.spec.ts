import { formatRelativeTime } from './relative-time';

describe('formatRelativeTime', () => {
  const now = new Date('2026-08-25T12:00:00Z');
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

  it('reports a very recent timestamp as "just now"', () => {
    expect(formatRelativeTime(ago(0), now)).toBe('just now');
    expect(formatRelativeTime(ago(5), now)).toBe('just now');
    expect(formatRelativeTime(ago(44), now)).toBe('just now');
  });

  it('reports minutes', () => {
    expect(formatRelativeTime(ago(60), now)).toContain('minute');
    expect(formatRelativeTime(ago(60 * 5), now)).toContain('5 minutes');
  });

  it('reports hours', () => {
    expect(formatRelativeTime(ago(60 * 60 * 2), now)).toContain('2 hours');
  });

  it('reports days', () => {
    expect(formatRelativeTime(ago(60 * 60 * 24 * 3), now)).toContain('3 days');
  });

  it('reports weeks', () => {
    expect(formatRelativeTime(ago(60 * 60 * 24 * 14), now)).toContain('2 weeks');
  });

  it('reports months', () => {
    expect(formatRelativeTime(ago(60 * 60 * 24 * 90), now)).toContain('3 months');
  });

  it('reports a far-past timestamp in years', () => {
    expect(formatRelativeTime(ago(60 * 60 * 24 * 365 * 2), now)).toContain('2 years');
  });

  it('renders the elapsed direction as past, not future', () => {
    expect(formatRelativeTime(ago(60 * 60 * 3), now)).toContain('ago');
  });

  it('handles a timestamp slightly in the future without crashing', () => {
    const future = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(future, now)).toBeTypeOf('string');
  });

  it('returns the raw value when the timestamp cannot be parsed', () => {
    expect(formatRelativeTime('not-a-timestamp', now)).toBe('not-a-timestamp');
  });
});
