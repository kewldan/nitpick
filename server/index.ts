// Production entry: serves the built app from dist/ and the API.
//   node server/index.ts
// Env: PORT (8787), HOST (0.0.0.0), DATA_DIR (./data), TRUST_PROXY (0/1),
//      PUBLIC_URL (used in link previews, e.g. https://nitpick.example.com).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

import { createApp, isExpired } from './app.ts';
import { renderPage } from './html.ts';
import { openStore } from './store.ts';

const port = Number(process.env.PORT ?? 8787);
const hostname = process.env.HOST ?? '0.0.0.0';
const dataDir = process.env.DATA_DIR ?? './data';
const distDir = process.env.DIST_DIR ?? './dist';

const store = openStore(join(dataDir, 'nitpick.db'));
const api = createApp({ store, trustProxy: process.env.TRUST_PROXY === '1' });
const template = readFileSync(join(distDir, 'index.html'), 'utf8');

const app = new Hono();

app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('X-Frame-Options', 'DENY');
  c.header(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      'font-src https://fonts.gstatic.com',
      "img-src 'self' data:",
      "connect-src 'self'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ].join('; '),
  );
});

app.route('/', api);

app.use(
  '/assets/*',
  serveStatic({
    root: distDir,
    onFound: (_path, c) => {
      c.header('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }),
);
// Other files from dist/ (favicon and the like); anything without an
// extension is an app route and falls through to the page below.
const rootFiles = serveStatic({ root: distDir });
app.use('/*', (c, next) =>
  /\/[^/]+\.[A-Za-z0-9]+$/.test(c.req.path) ? rootFiles(c, next) : next(),
);

// Every other GET is the single-page app. Share links get their own title
// and description so the preview in Telegram says what the review is.
app.get('*', (c) => {
  const match = /^\/([A-Za-z0-9]{6,10})\/?$/.exec(c.req.path);
  let review = match ? store.get(match[1]) : null;
  if (review && isExpired(review)) review = null;
  c.header('Cache-Control', 'no-cache');
  return c.html(renderPage(template, review, process.env.PUBLIC_URL));
});

const purge = () => {
  const n = store.purgeExpired();
  if (n) console.log(`purged ${n} expired review(s)`);
};
purge();
setInterval(purge, 3600_000).unref();

const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`Nitpick listening on http://${info.address}:${info.port}`);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    server.close();
    store.close();
    process.exit(0);
  });
}
