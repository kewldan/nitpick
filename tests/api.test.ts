import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createApp } from '../server/app.ts';
import { describe as describeReview, renderPage } from '../server/html.ts';
import { openStore } from '../server/store.ts';

function setup() {
  const store = openStore(':memory:');
  const app = createApp({ store });
  const req = (method: string, path: string, body?: unknown, key?: string) =>
    app.request(path, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(key ? { 'x-edit-key': key } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  return { store, req };
}

const input = (over: Record<string, unknown> = {}) => ({
  title: 'HW 1',
  files: [
    {
      path: 'src/main.cpp',
      language: 'cpp',
      code: 'int a;\nint b;\nint c;',
      original: 'int a;int b;int c;',
      formatter: 'clang-format · Google',
    },
    { path: 'CMakeLists.txt', language: 'cmake', code: 'project(x)', original: 'project(x)', formatter: '' },
  ],
  summary: '',
  verdict: 'changes',
  reviewer: 'Daniel',
  expiry: '7d',
  allowResolve: true,
  allowReplies: true,
  comments: [
    { id: 'c1', file: 'src/main.cpp', line: 1, endLine: 1, severity: 'blocker', text: 'Leak', suggestion: '' },
    { id: 'c2', file: 'src/main.cpp', line: 2, endLine: 3, severity: 'praise', text: 'Nice', suggestion: '' },
  ],
  ...over,
});

test('publish, read, resolve, reply, update keeps mentee state', async () => {
  const { req } = setup();
  const res = await req('POST', '/api/reviews', input());
  assert.equal(res.status, 201);
  const { id, editKey } = (await res.json()) as { id: string; editKey: string };
  assert.match(id, /^[A-Za-z0-9]{6}$/);

  const r1 = await req('POST', `/api/reviews/${id}/comments/c1/resolve`, { resolved: true });
  assert.equal(r1.status, 200);
  const praise = await req('POST', `/api/reviews/${id}/comments/c2/resolve`, { resolved: true });
  assert.equal(praise.status, 404, 'praise cannot be resolved');

  const rep = await req('POST', `/api/reviews/${id}/comments/c1/replies`, { text: 'Why?' });
  assert.equal(rep.status, 201);
  const mentorRep = await req('POST', `/api/reviews/${id}/comments/c1/replies`, { text: 'Because' }, editKey);
  const thread = (await mentorRep.json()) as { replies: { author: string }[] };
  assert.deepEqual(thread.replies.map((r) => r.author), ['mentee', 'mentor']);

  const upd = await req('PUT', `/api/reviews/${id}`, input({ title: 'HW 1 v2', comments: [
    { id: 'c1', file: 'src/main.cpp', line: 2, endLine: 2, severity: 'issue', text: 'Leak!', suggestion: '' },
  ] }), editKey);
  assert.equal(upd.status, 200);
  const review = (await (await req('GET', `/api/reviews/${id}`)).json()) as {
    title: string;
    comments: { id: string; line: number; resolved: boolean; replies: unknown[] }[];
  };
  assert.equal(review.title, 'HW 1 v2');
  assert.equal(review.comments.length, 1);
  assert.equal(review.comments[0].line, 2);
  assert.equal(review.comments[0].resolved, true);
  assert.equal(review.comments[0].replies.length, 2);
});

test('edits need the edit key', async () => {
  const { req } = setup();
  const { id } = (await (await req('POST', '/api/reviews', input())).json()) as { id: string };
  assert.equal((await req('PUT', `/api/reviews/${id}`, input())).status, 403);
  assert.equal((await req('PUT', `/api/reviews/${id}`, input(), 'wrong')).status, 403);
  assert.equal((await req('DELETE', `/api/reviews/${id}`, undefined, 'wrong')).status, 403);
  assert.equal((await req('GET', `/api/reviews/${id}/access`, undefined, 'wrong')).status, 403);
});

test('switches turn off mentee writes', async () => {
  const { req } = setup();
  const { id, editKey } = (await (
    await req('POST', '/api/reviews', input({ allowResolve: false, allowReplies: false }))
  ).json()) as { id: string; editKey: string };
  assert.equal((await req('POST', `/api/reviews/${id}/comments/c1/resolve`, { resolved: true })).status, 403);
  assert.equal((await req('POST', `/api/reviews/${id}/comments/c1/replies`, { text: 'hi' })).status, 403);
  assert.equal((await req('POST', `/api/reviews/${id}/comments/c1/replies`, { text: 'hi' }, editKey)).status, 201);
});

test('validation rejects comments outside the code', async () => {
  const { req } = setup();
  const past = await req('POST', '/api/reviews', input({
    comments: [{ id: 'x', file: 'src/main.cpp', line: 9, endLine: 9, severity: 'issue', text: 'a', suggestion: '' }],
  }));
  assert.equal(past.status, 400);
  const ghost = await req('POST', '/api/reviews', input({
    comments: [{ id: 'x', file: 'nope.cpp', line: 1, endLine: 1, severity: 'issue', text: 'a', suggestion: '' }],
  }));
  assert.equal(ghost.status, 400);
});

test('validation rejects bad and duplicate paths', async () => {
  const { req } = setup();
  const file = { language: 'cpp', code: 'x', original: 'x', formatter: '' };
  for (const files of [
    [{ ...file, path: '../etc/passwd' }],
    [{ ...file, path: '/abs.cpp' }],
    [{ ...file, path: 'a.cpp' }, { ...file, path: 'a.cpp' }],
    [],
  ]) {
    const res = await req('POST', '/api/reviews', input({ files, comments: [] }));
    assert.equal(res.status, 400, JSON.stringify(files));
  }
});

test('single-file reviews stored before projects still load', async () => {
  const { store, req } = setup();
  const { id } = store.create({
    title: 'Old',
    language: 'cpp',
    fileName: 'main.cpp',
    code: 'int a;',
    original: 'int a;',
    formatter: 'clang-format · Google',
    summary: '',
    verdict: 'changes',
    reviewer: '',
    expiry: 'never',
    allowResolve: true,
    allowReplies: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: null,
    comments: [{ id: 'c1', line: 1, endLine: 1, severity: 'nit', text: 'x', suggestion: '', resolved: false, replies: [] }],
  } as never);
  const review = (await (await req('GET', `/api/reviews/${id}`)).json()) as {
    files: { path: string; code: string }[];
    comments: { file: string }[];
  };
  assert.deepEqual(review.files.map((f) => f.path), ['main.cpp']);
  assert.equal(review.files[0].code, 'int a;');
  assert.equal(review.comments[0].file, 'main.cpp');
});

test('expired reviews answer 410 and are purged', async () => {
  const { store, req } = setup();
  const { id } = (await (await req('POST', '/api/reviews', input({ expiry: '1d' }))).json()) as { id: string };
  store.update(id, (r) => ({ ...r, expiresAt: new Date(Date.now() - 1000).toISOString() }));
  const res = await req('GET', `/api/reviews/${id}`);
  assert.equal(res.status, 410);
  assert.equal(store.purgeExpired(), 1);
  assert.equal((await req('GET', `/api/reviews/${id}`)).status, 404);
});

test('share pages get escaped titles and previews', async () => {
  const { store, req } = setup();
  const { id } = (await (
    await req('POST', '/api/reviews', input({ title: 'A <b>$& title' }))
  ).json()) as { id: string };
  const review = store.get(id)!;
  const html = renderPage(
    '<html><head><title>Nitpick</title><meta name="description" content="x"></head></html>',
    review,
  );
  assert.match(html, /<title>A &#60;b&#62;\$&#38; title · Nitpick<\/title>/);
  assert.equal(html.match(/name="description"/g)?.length, 1);
  assert.match(describeReview(review).text, /1 блокер/);
});

test('errors follow the caller’s language', async () => {
  const { store } = setup();
  const app = createApp({ store });
  const ask = (headers: Record<string, string>) =>
    Promise.resolve(app.request('/api/reviews/ZZZZZZ', { headers })).then(
      (r) => r.json() as Promise<{ error: string }>,
    );
  assert.equal((await ask({ 'x-lang': 'en' })).error, 'Review not found');
  assert.equal((await ask({ 'x-lang': 'ru' })).error, 'Ревью не найдено');
  assert.equal((await ask({ 'accept-language': 'en-US,en;q=0.9' })).error, 'Review not found');
  assert.equal((await ask({})).error, 'Ревью не найдено');
});

test('link previews use the review’s language', async () => {
  const { store, req } = setup();
  const { id } = (await (await req('POST', '/api/reviews', input({ locale: 'en' }))).json()) as { id: string };
  const html = renderPage('<html lang="ru"><head><title>x</title></head></html>', store.get(id)!);
  assert.match(html, /<html lang="en"/);
  assert.match(html, /Review of 2 files by Daniel · Changes requested · 2 comments · 1 blocker/);
});
