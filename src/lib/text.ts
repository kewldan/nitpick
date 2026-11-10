import type { Severity, Verdict } from '../../shared/types.ts';
import { getLocale, t } from '../i18n/index.ts';

/** Rank, label and hint of a severity, in the current language. */
export const SEVERITY: Record<Severity, { rank: number; readonly label: string; readonly hint: string }> = {
  blocker: { rank: 0, get label() { return t().severity.blocker.label; }, get hint() { return t().severity.blocker.hint; } },
  issue: { rank: 1, get label() { return t().severity.issue.label; }, get hint() { return t().severity.issue.hint; } },
  suggestion: { rank: 2, get label() { return t().severity.suggestion.label; }, get hint() { return t().severity.suggestion.hint; } },
  nit: { rank: 3, get label() { return t().severity.nit.label; }, get hint() { return t().severity.nit.hint; } },
  praise: { rank: 4, get label() { return t().severity.praise.label; }, get hint() { return t().severity.praise.hint; } },
};

const BADGE: Record<Verdict, Severity> = { changes: 'issue', approved: 'praise', comment: 'nit' };

export function verdict(v: Verdict): { label: string; badge: Severity } {
  return { label: t().verdict[v], badge: BADGE[v] };
}

export function expiryText(expiresAt: string | null, now = Date.now()): string {
  const m = t().expiry;
  if (!expiresAt) return m.never;
  const ms = Date.parse(expiresAt) - now;
  if (ms <= 0) return m.expired;
  const h = Math.round(ms / 3600_000);
  if (h < 1) return m.lessThanHour;
  if (h < 36) return m.inHours(h);
  return m.inDays(Math.round(h / 24));
}

export function relativeTime(iso: string, now = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
  const s = Math.round((Date.parse(iso) - now) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(s / 3600), 'hour');
  if (abs < 30 * 86_400) return rtf.format(Math.round(s / 86_400), 'day');
  return new Date(iso).toLocaleDateString(getLocale());
}

/** A comment's text without backticks, cut to `max` characters. */
export function excerpt(text: string, max = 96): string {
  const s = text.replace(/`/g, '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

export const lineLabel = (line: number, endLine: number) => t().line(line, endLine);

export function shortId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
