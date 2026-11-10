// Injects per-review <title> and Open Graph tags into the app shell, so a
// share link pasted into a messenger shows the review's title and counts.

import type { Review } from '../shared/types.ts';

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

const plural = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? '' : 's'}`;

const VERDICT_LABEL: Record<Review['verdict'], string> = {
  changes: 'Changes requested',
  approved: 'Approved',
  comment: 'Comments only',
};

export function describe(review: Review): { title: string; text: string } {
  const title = review.title.trim() || 'Code review';
  const blockers = review.comments.filter((c) => c.severity === 'blocker');
  const parts = [
    VERDICT_LABEL[review.verdict],
    plural(review.comments.length, 'comment'),
  ];
  if (blockers.length) parts.push(plural(blockers.length, 'blocker'));
  const by = review.reviewer.trim() ? ` by ${review.reviewer.trim()}` : '';
  const what =
    review.files.length === 1 ? review.files[0].path : plural(review.files.length, 'file');
  return {
    title,
    text: `Review of ${what}${by} · ${parts.join(' · ')}`,
  };
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
    .replace('</head>', () => `    ${tags}\n  </head>`);
}
