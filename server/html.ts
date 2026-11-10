// Injects per-review <title> and Open Graph tags into the app shell, so a
// share link pasted into a messenger shows the review's title and counts.

import { SERVER_MESSAGES } from '../shared/i18n.ts';
import type { Review } from '../shared/types.ts';

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

export function describe(review: Review): { title: string; text: string } {
  const m = SERVER_MESSAGES[review.locale ?? 'ru'];
  const title = review.title.trim() || m.defaultTitle;
  const blockers = review.comments.filter((c) => c.severity === 'blocker');
  const parts = [m.verdict[review.verdict], m.comments(review.comments.length)];
  if (blockers.length) parts.push(m.blockers(blockers.length));
  const what = review.files.length === 1 ? review.files[0].path : m.files(review.files.length);
  return { title, text: `${m.reviewOf(what, review.reviewer.trim())} · ${parts.join(' · ')}` };
}

export function renderPage(
  template: string,
  review: Review | null,
  publicUrl?: string,
): string {
  if (!review) return template;
  const { title, text } = describe(review);
  const url = publicUrl ? `${publicUrl.replace(/\/$/, '')}/${review.id}` : '';
  const tags = [
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="Nitpick">`,
    `<meta property="og:locale" content="${review.locale === 'en' ? 'en_US' : 'ru_RU'}">`,
    `<meta property="og:title" content="${escape(title)}">`,
    `<meta property="og:description" content="${escape(text)}">`,
    url ? `<meta property="og:url" content="${escape(url)}">` : '',
    `<meta name="robots" content="noindex">`,
  ]
    .filter(Boolean)
    .join('\n    ');
  return template
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escape(title)} · Nitpick</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      () => `<meta name="description" content="${escape(text)}">`,
    )
    .replace(/<html lang="[^"]*"/, () => `<html lang="${review.locale ?? 'ru'}"`)
    .replace('</head>', () => `    ${tags}\n  </head>`);
}
