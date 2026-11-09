# Nitpick

Code review for mentors. Paste a student's code, it gets auto-formatted, you
comment line by line, and send one short link. The student opens it with no
account, works through the comments and ticks them off as they fix things.

## What it does

- **Paste & format.** Real formatters compiled to WebAssembly, run in the
  browser: clang-format for C++, C, Java and C# (style presets, indent,
  brace placement), Ruff for Python, gofmt for Go, Prettier for TypeScript and
  JavaScript. Rust, Kotlin, SQL and plain text are highlighted and reviewed as
  pasted. A diff view shows what the formatter changed.
- **Comment.** Click a line number to comment, Shift-click a second one for a
  range. Five fixed severities (Blocker, Issue, Suggestion, Nit, Praise),
  backticks for inline code, an optional suggested change. Summary and verdict
  in the sidebar. Editing the code later keeps comments on their lines.
- **Share.** Publishing gives a short link (`/k7Qx2a`) for the mentee and a
  private edit link (`/e/k7Qx2a#key=…`) for you; the key stays in the URL
  fragment, so it never reaches server logs. Links expire after 1, 7 or 30
  days, or never. Link previews in Telegram show the title and counts.
- **Mentee view.** Progress bar, checklist sorted blockers first, filters,
  "Mark as fixed", replies, copy buttons for code and suggestions. The mentor
  sees ticks and replies come in and can answer in the thread.
- **No accounts.** Your edit keys and an unpublished draft live in this
  browser's storage; the home page lists your reviews with the mentee's
  progress.

Dark and light themes, works at phone width. The look follows the Nitpick
design system (`design/tokens.json`, `src/styles/bundle.css`).

## Run it

Needs Node 24 or newer (it uses the built-in `node:sqlite` and runs the
TypeScript server directly).

```bash
npm install
npm run dev        # http://localhost:5173, API included
```

Production:

```bash
npm run build
npm start          # http://localhost:8787
```

Or with Docker:

```bash
docker build -t nitpick .
docker run -p 8787:8787 -v nitpick-data:/data nitpick
```

| Variable      | Default   | Meaning                                              |
| ------------- | --------- | ---------------------------------------------------- |
| `PORT`        | `8787`    | HTTP port                                            |
| `HOST`        | `0.0.0.0` | Bind address                                         |
| `DATA_DIR`    | `./data`  | Where `nitpick.db` (SQLite) lives                    |
| `PUBLIC_URL`  | —         | Public origin, used in link previews (`og:url`)      |
| `TRUST_PROXY` | `0`       | Set to `1` behind a reverse proxy (for rate limits)  |

Put it behind HTTPS (Caddy, nginx) for anything public: the clipboard API and
the edit links assume a secure origin.

## Develop

```bash
npm test           # API, storage and diff tests (node:test)
npm run typecheck
npm run tokens     # regenerate src/styles/tokens.css from design/tokens.json
```

Layout:

- `server/` — Hono API (`app.ts`), SQLite storage (`store.ts`), page meta
  for share links (`html.ts`), production entry (`index.ts`).
- `shared/` — types and input validation used by both sides.
- `src/lib/` — formatters, Prism highlighting, line diff, API client, local
  storage.
- `src/pages/` — paste (`CodeStep`), review (`ReviewStep`), the mentor flow
  (`Mentor`), the mentee page (`Shared`).

### Adding a language

Add an entry to `src/lib/languages.ts` (Prism grammar, extension, formatter)
and import its Prism grammar in `src/lib/highlight.ts`. If it has a WASM
formatter, wire it up in `src/lib/format.ts`.

## API

| Method   | Path                                         | Who                     |
| -------- | -------------------------------------------- | ----------------------- |
| `POST`   | `/api/reviews`                               | anyone, returns the key |
| `GET`    | `/api/reviews/:id`                           | anyone with the link    |
| `PUT`    | `/api/reviews/:id`                           | `X-Edit-Key`            |
| `DELETE` | `/api/reviews/:id`                           | `X-Edit-Key`            |
| `GET`    | `/api/reviews/:id/access`                    | checks `X-Edit-Key`     |
| `POST`   | `/api/reviews/:id/comments/:cid/resolve`     | mentee, if allowed      |
| `POST`   | `/api/reviews/:id/comments/:cid/replies`     | mentee, or mentor with key |
| `POST`   | `/api/reviews/status`                        | list status by ids      |
