# Nitpick — notes for working in this repo

Code review for mentors: the browser formats and highlights code, the mentor
comments line by line and publishes one short link, the mentee ticks comments
off and replies. React 19 + Vite on the front, Hono on Node 24 with
`node:sqlite` behind it. See README.md for features and the architecture
diagram. Live at https://nitpick.m3105.ru.

## Layout

- `server/app.ts` — the whole JSON API (`createApp({ store })`). Mounted by
  `server/index.ts` in production and by the `nitpick-dev-api` plugin in
  `vite.config.ts` during `npm run dev` (loaded with `ssrLoadModule`, so edits
  apply without a restart).
- `server/store.ts` — one SQLite row per review, the whole review as JSON.
  Writes go through `store.update(id, fn)`; keep `fn` synchronous so the
  read-modify-write stays atomic.
- `shared/` — imported by both sides: `types.ts` (Review, ReviewFile,
  Comment, LIMITS, `normalizeReview` for single-file reviews stored before
  projects), `validate.ts`, `i18n.ts` (locales, `ruPlural`, the server's
  messages).
- `src/pages/Mentor.tsx` — the mentor flow and its routes: `/` and `/draft`
  for an unpublished draft (autosaved to localStorage), `/e/:id` and
  `/e/:id/code` for a published review. `CodeStep` is the paste/upload screen,
  `ReviewStep` the editor. `src/pages/Shared.tsx` is the mentee page at `/:id`.
- `src/lib/` — `format.ts` (WASM formatters, lazy), `highlight.ts` (Prism →
  `tok-*` classes, split into lines), `diff.ts` (line diff and `lineMap` that
  keeps comments on their lines), `zip.ts` (import filter and export),
  `draft.ts` (the mentor's working copy and `toInput`).
- `src/i18n/` — `ru.ts` is the source dictionary, `en.ts` mirrors it.
- Styles: `src/styles/tokens.css` is generated from `design/tokens.json`
  (`npm run tokens`), `bundle.css` is the design system's `np-*` components,
  `app.css` is layout. The design system is the "Nitpick" artifact on
  claude.ai (https://claude.ai/artifact/2FEKp3FZ5vSRcCrezTeZzv); the prototype
  is https://claude.ai/artifact/MAXr4zxFk2CtekGm3in6bT.

## Checks (run before every commit; CI runs the same)

```sh
npm run typecheck && npm test && npm run build
```

- Check UI changes in the browser (`npm run dev`), in both languages and both
  themes, and at phone width with real mobile emulation. Headless Chrome won't
  go below ~500 px wide, so its "phone" screenshots look broken when they
  aren't.

## Rules that bit us

- **Node runs the server's TypeScript directly** (type stripping): imports
  need the `.ts` extension and only erasable syntax works — no enums,
  namespaces or constructor parameter properties (`erasableSyntaxOnly` is on).
- **Every UI string goes through `t()`** and needs an entry in `ru.ts` and
  `en.ts`; `en.ts` is `satisfies Messages`, so a missing key fails the
  typecheck, and `tests/i18n.test.ts` compares the key sets. Use the plural
  helpers (`t().plural.*`, `ruPlural`) for counts — never `n + ' комментариев'`.
- **`t()` is not a hook.** `App` subscribes with `useLocale()`, which
  re-renders the tree on a switch. Components wrapped in `memo` don't
  re-render then, so keep translated text out of them (`Row` and `Toks` in
  `CodeView.tsx` only show code).
- **Stored values are codes, not text.** The formatter label `AS_PASTED` is
  stored in reviews and shown with `formatterName()`; zip skip reasons are
  `SkipReason` codes; API errors are localized on the server from the
  `X-Lang` header the client sends.
- **Comments point at files by path.** Renaming or replacing files must move
  or drop their comments (`rename` and `importFiles` in `CodeStep.tsx`);
  the server rejects a comment on a path that isn't in the review.
- **Never mutate `draft.files` in place.** `fingerprint()` caches the files'
  serialization per array identity to keep "Unsaved changes" cheap; an
  in-place edit makes it miss changes.
- **The edit key stays in the URL fragment** (`/e/:id#key=…`) and in
  localStorage. Don't move it to a query string: it would land in server and
  proxy logs. Navigation inside `/e/` must keep the `#key=`.
- **Selections and line numbers:** line wrappers are `.code-anchor#line-N`;
  comment cards live inside them, so `lineOf()` in `ReviewStep.tsx` ignores
  nodes inside `.np-card` / `.np-composer`.
- **Behind Traefik, trust the last `X-Forwarded-For` entry**, not the first:
  the client controls the earlier ones.

## Deploy

- Push to `main` → `.github/workflows/deploy.yml`: checks, image to
  `ghcr.io/kewldan/nitpick:<sha>`, `ssh root@m3105 "deploy <sha>"`, health
  check of https://nitpick.m3105.ru/api/health.
- The deploy key in `/root/.ssh/authorized_keys` is bound to
  `/usr/local/bin/nitpick-deploy` (a copy of `deploy/deploy.sh`). The script
  fetches `deploy/docker-compose.yml` from the deployed commit, so compose
  changes ship with a push; **changes to `deploy.sh` itself must be installed
  by hand**:
  `scp deploy/deploy.sh m3105:/tmp/nd && ssh m3105 install -m 0755 /tmp/nd /usr/local/bin/nitpick-deploy`.
- The server is shared (Traefik on the `virtual-hosts` network, resolver
  `myresolver`, many other stacks). Touch only `/root/nitpick` and the
  `nitpick-*` containers.
- Data is the `nitpick_data` volume (`/data/nitpick.db`). Expired reviews are
  purged hourly.

## Style

- TypeScript: 2-space indent, single quotes, semicolons, lines up to about 100
  columns. Comments explain why, not what.
- UI copy follows the design system's voice: sentence case, verbs first on
  buttons, the fixed severity words (Блокер / Проблема / Совет / Мелочь /
  Похвала and Blocker / Issue / Suggestion / Nit / Praise). Russian copy is
  gender-neutral.

## Git

- Work and commit on `main`; no feature branches.
- Conventional Commits: `feat(scope): …`, `fix: …`, `refactor: …`, `test: …`,
  `docs: …`, `chore: …`, `ci: …`. No AI attribution in commits, PRs or files.
