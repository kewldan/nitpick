// The Nitpick JSON API. Mounted by server/index.ts in production and by the
// Vite dev server (vite.config.ts) during development.

import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';

import {
  EXPIRY_MS,
  LIMITS,
  type Comment,
  type Review,
  type ReviewInput,
  type ReviewStatus,
} from '../shared/types.ts';
import {
  ValidationError,
  validateReply,
  validateReviewInput,
} from '../shared/validate.ts';
import { randomId, type Store } from './store.ts';
import { pickLocale, SERVER_MESSAGES, type Locale } from '../shared/i18n.ts';

/** The caller's locale: the app sends X-Lang, browsers send Accept-Language. */
export function localeOf(c: Context): Locale {
  return pickLocale(c.req.header('x-lang'), c.req.header('accept-language'));
}
const msg = (c: Context) => SERVER_MESSAGES[localeOf(c)];

export interface AppOptions {
  store: Store;
  /** Trust X-Forwarded-For when running behind a reverse proxy. */
  trustProxy?: boolean;
}

const ID_PARAM = /^[A-Za-z0-9]{6,10}$/;

function expiresAt(expiry: ReviewInput['expiry'], from: number): string | null {
  const ms = EXPIRY_MS[expiry];
  return ms === null ? null : new Date(from + ms).toISOString();
}

export function isExpired(review: Review, now = Date.now()): boolean {
  return review.expiresAt !== null && Date.parse(review.expiresAt) < now;
}

function mergeComments(input: ReviewInput, prev: Comment[]): Comment[] {
  const byId = new Map(prev.map((c) => [c.id, c]));
  return input.comments.map((c) => {
    const old = byId.get(c.id);
    return {
      ...c,
      resolved: old?.resolved ?? false,
      replies: old?.replies ?? [],
    };
  });
}

function statusOf(review: Review): ReviewStatus {
  const actionable = review.comments.filter((c) => c.severity !== 'praise');
  return {
    id: review.id,
    title: review.title,
    verdict: review.verdict,
    total: review.comments.length,
    actionable: actionable.length,
    fixed: actionable.filter((c) => c.resolved).length,
    replies: review.comments.reduce(
      (n, c) => n + c.replies.filter((r) => r.author === 'mentee').length,
      0,
    ),
    updatedAt: review.updatedAt,
    expiresAt: review.expiresAt,
  };
}

/** A tiny fixed-window rate limiter, per client and action. */
function rateLimiter() {
  const hits = new Map<string, { n: number; reset: number }>();
  return (key: string, limit: number, windowMs: number): boolean => {
    const now = Date.now();
    if (hits.size > 50_000) {
      for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    }
    const h = hits.get(key);
    if (!h || h.reset < now) {
      hits.set(key, { n: 1, reset: now + windowMs });
      return true;
    }
    h.n++;
    return h.n <= limit;
  };
}

export function createApp({ store, trustProxy = false }: AppOptions) {
  const app = new Hono();
  const allow = rateLimiter();

  const clientIp = (c: Context): string => {
    if (trustProxy) {
      // The proxy appends the address it saw; earlier entries come from the
      // client and can be forged, so the last one is the one to trust.
      const fwd = c.req.header('x-forwarded-for');
      if (fwd) return fwd.split(',').pop()!.trim();
    }
    const env = c.env as
      | { incoming?: { socket?: { remoteAddress?: string } } }
      | undefined;
    return env?.incoming?.socket?.remoteAddress ?? 'local';
  };

  const limited = (c: Context, action: string, n: number, windowMs: number) =>
    !allow(`${action}:${clientIp(c)}`, n, windowMs);

  /** Loads a live review or produces the matching error response. */
  const load = (c: Context): Review | Response => {
    const id = c.req.param('id') ?? '';
    if (!ID_PARAM.test(id)) return c.json({ error: msg(c).notFound }, 404);
    const review = store.get(id);
    if (!review) return c.json({ error: msg(c).notFound }, 404);
    if (isExpired(review)) {
      return c.json({ error: msg(c).expired, expired: true }, 410);
    }
    return review;
  };

  const editKey = (c: Context) => c.req.header('x-edit-key');

  app.use('/api/*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  });
  app.use(
    '/api/*',
    bodyLimit({
      maxSize: 12 * 1024 * 1024,
      onError: (c) => c.json({ error: msg(c).tooLarge }, 413),
    }),
  );

  app.onError((err, c) => {
    if (err instanceof ValidationError) {
      return c.json({ error: err.message }, 400);
    }
    if (err instanceof SyntaxError) {
      return c.json({ error: msg(c).malformedJson }, 400);
    }
    console.error(err);
    return c.json({ error: msg(c).serverError }, 500);
  });

  app.get('/api/health', (c) => c.json({ ok: true }));

  // Publish a new review.
  app.post('/api/reviews', async (c) => {
    if (limited(c, 'create', 60, 3600_000)) {
      return c.json({ error: msg(c).tooManyReviews }, 429);
    }
    const input = validateReviewInput(await c.req.json(), localeOf(c));
    const now = Date.now();
    const iso = new Date(now).toISOString();
    const review: Omit<Review, 'id'> = {
      ...input,
      createdAt: iso,
      updatedAt: iso,
      expiresAt: expiresAt(input.expiry, now),
      comments: mergeComments(input, []),
    };
    const { id, editKey: key } = store.create(review);
    return c.json({ id, editKey: key, review: { ...review, id } }, 201);
  });

  // Status of several reviews at once, for the mentor's list.
  app.post('/api/reviews/status', async (c) => {
    const body = (await c.req.json()) as { ids?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.slice(0, 100) : [];
    const out: ReviewStatus[] = [];
    for (const id of ids) {
      if (typeof id !== 'string' || !ID_PARAM.test(id)) continue;
      const review = store.get(id);
      if (!review) {
        out.push({ id, missing: true } as ReviewStatus);
        continue;
      }
      out.push({ ...statusOf(review), expired: isExpired(review) });
    }
    return c.json(out);
  });

  app.get('/api/reviews/:id', (c) => {
    const review = load(c);
    return review instanceof Response ? review : c.json(review);
  });

  // Checks an edit key without changing anything.
  app.get('/api/reviews/:id/access', (c) => {
    const review = load(c);
    if (review instanceof Response) return review;
    if (limited(c, 'key', 120, 600_000)) {
      return c.json({ error: msg(c).tooManyAttempts }, 429);
    }
    return store.checkKey(review.id, editKey(c))
      ? c.json({ ok: true })
      : c.json({ error: msg(c).badEditKey }, 403);
  });

  // Republish: replace the mentor's content, keep the mentee's state.
  app.put('/api/reviews/:id', async (c) => {
    const found = load(c);
    if (found instanceof Response) return found;
    if (!store.checkKey(found.id, editKey(c))) {
      return c.json({ error: msg(c).badEditKey }, 403);
    }
    const input = validateReviewInput(await c.req.json(), localeOf(c));
    const now = Date.now();
    const next = store.update(found.id, (prev) => ({
      ...prev,
      ...input,
      updatedAt: new Date(now).toISOString(),
      expiresAt:
        input.expiry === prev.expiry
          ? prev.expiresAt
          : expiresAt(input.expiry, now),
      comments: mergeComments(input, prev.comments),
    }));
    return next ? c.json(next) : c.json({ error: msg(c).notFound }, 404);
  });

  app.delete('/api/reviews/:id', (c) => {
    const id = c.req.param('id');
    if (!ID_PARAM.test(id) || !store.checkKey(id, editKey(c))) {
      return c.json({ error: msg(c).badEditKey }, 403);
    }
    store.remove(id);
    return c.body(null, 204);
  });

  // The mentee ticks a comment off (or un-ticks it).
  app.post('/api/reviews/:id/comments/:cid/resolve', async (c) => {
    const found = load(c);
    if (found instanceof Response) return found;
    if (limited(c, 'write', 600, 600_000)) {
      return c.json({ error: msg(c).slowDown }, 429);
    }
    const isMentor = store.checkKey(found.id, editKey(c));
    if (!found.allowResolve && !isMentor) {
      return c.json({ error: msg(c).resolveOff }, 403);
    }
    const body = (await c.req.json()) as { resolved?: unknown };
    const resolved = body.resolved === true;
    const cid = c.req.param('cid');
    let hit: Comment | undefined;
    const next = store.update(found.id, (prev) => ({
      ...prev,
      comments: prev.comments.map((cm) => {
        if (cm.id !== cid || cm.severity === 'praise') return cm;
        hit = { ...cm, resolved };
        return hit;
      }),
    }));
    if (!next || !hit) return c.json({ error: msg(c).commentNotFound }, 404);
    return c.json(hit);
  });

  // A reply in a comment thread. With a valid edit key it is the mentor's.
  app.post('/api/reviews/:id/comments/:cid/replies', async (c) => {
    const found = load(c);
    if (found instanceof Response) return found;
    if (limited(c, 'write', 600, 600_000)) {
      return c.json({ error: msg(c).slowDown }, 429);
    }
    const isMentor = store.checkKey(found.id, editKey(c));
    if (!found.allowReplies && !isMentor) {
      return c.json({ error: msg(c).repliesOff }, 403);
    }
    const text = validateReply(await c.req.json(), localeOf(c));
    const cid = c.req.param('cid');
    let hit: Comment | undefined;
    let tooMany = false;
    store.update(found.id, (prev) => ({
      ...prev,
      comments: prev.comments.map((cm) => {
        if (cm.id !== cid) return cm;
        if (cm.replies.length >= LIMITS.repliesPerComment) {
          tooMany = true;
          return cm;
        }
        hit = {
          ...cm,
          replies: [
            ...cm.replies,
            {
              id: randomId(8),
              author: isMentor ? 'mentor' : 'mentee',
              text,
              at: new Date().toISOString(),
            },
          ],
        };
        return hit;
      }),
    }));
    if (tooMany) return c.json({ error: msg(c).threadFull }, 409);
    if (!hit) return c.json({ error: msg(c).commentNotFound }, 404);
    return c.json(hit, 201);
  });

  app.all('/api/*', (c) => c.json({ error: msg(c).apiNotFound }, 404));

  return app;
}
