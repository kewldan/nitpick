import type { Expiry, Severity, Verdict } from '../../shared/types.ts';

export const plural = (n: number, word: string, many = `${word}s`) =>
  `${n} ${n === 1 ? word : many}`;

export const SEVERITY: Record<
  Severity,
  { label: string; rank: number; hint: string }
> = {
  blocker: { label: 'Blocker', rank: 0, hint: 'Must fix. Wrong result, crash, or leak.' },
  issue: { label: 'Issue', rank: 1, hint: 'Should fix before this is done.' },
  suggestion: { label: 'Suggestion', rank: 2, hint: 'A better way worth learning.' },
  nit: { label: 'Nit', rank: 3, hint: 'Style or taste. Optional.' },
  praise: { label: 'Praise', rank: 4, hint: 'Good call. Keep doing this.' },
};

export const VERDICT: Record<Verdict, { label: string; badge: Severity }> = {
  changes: { label: 'Changes requested', badge: 'issue' },
  approved: { label: 'Approved', badge: 'praise' },
  comment: { label: 'Comments only', badge: 'nit' },
};

export const EXPIRY_LABEL: Record<Expiry, string> = {
  '1d': '1 day',
  '7d': '7 days',
  '30d': '30 days',
  never: 'Never',
};

export function expiryText(expiresAt: string | null, now = Date.now()): string {
  if (!expiresAt) return 'Never expires';
  const ms = Date.parse(expiresAt) - now;
  if (ms <= 0) return 'Expired';
  const h = Math.round(ms / 3600_000);
  if (h < 1) return 'Expires in less than an hour';
  if (h < 36) return `Expires in ${plural(h, 'hour')}`;
  return `Expires in ${plural(Math.round(h / 24), 'day')}`;
}

export function relativeTime(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${plural(h, 'hour')} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${plural(d, 'day')} ago`;
  return new Date(iso).toLocaleDateString();
}

/** A comment's text without backticks, cut to `max` characters. */
export function excerpt(text: string, max = 96): string {
  const s = text.replace(/`/g, '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

export function lineLabel(line: number, endLine: number): string {
  return endLine > line ? `lines ${line}–${endLine}` : `line ${line}`;
}

export function shortId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
