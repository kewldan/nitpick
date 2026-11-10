# Changelog

All notable changes to Nitpick. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-11-10

The first release: code review for mentors. Paste code or drop a project,
comment line by line, send one short link. No accounts for anyone.

### Paste and format

- Real formatters compiled to WebAssembly and run in the browser: clang-format for C++, C, Java and C# (Google, LLVM, Chromium, Mozilla, WebKit, Microsoft and GNU styles, indent and brace placement), Ruff for Python, gofmt for Go, Prettier for TypeScript, JavaScript and JSON.
- A diff view of what the formatter changed; code the formatter can't parse is shown as pasted, with the reason.
- Highlighting for 19 languages, including Rust, Kotlin, SQL, CMake, Makefile, YAML, Markdown and shell; the language is guessed from pasted code and file names.

### Projects

- Upload a `.zip` or several files, or drop them on the page. Build and tool folders, binaries, empty and oversized files are left out and listed with the reason.
- A file tree with open comments per file on every screen; files can be added, renamed and removed.
- Re-uploading a fixed version keeps every comment on its line in files that kept their path.
- Mentees can download the formatted project as a `.zip`.
- Limits: 300 files, 5,000 lines per file, about 5 MB of code per review.

### Comments

- Five fixed severities: Blocker, Issue, Suggestion, Nit, Praise.
- Comment on a line, a Shift-clicked range, or a selection through the right-click menu, which quotes the selection and can turn the lines into a suggested change.
- Inline code in backticks, links, suggested changes with highlighting and a copy button.
- Reply threads between mentor and mentee.
- A summary and a verdict: Changes requested, Approved or Comments only.

### Sharing

- A short share link for the mentee and a private edit link for the mentor; the edit key stays in the URL fragment and is stored hashed.
- Links expire after 1, 7 or 30 days, or never; expired reviews are purged.
- A ready-made Telegram message and a link preview with the title, verdict and counts.
- Republishing keeps the link, the mentee's ticks and replies.
- The home page lists the mentor's reviews with the mentee's progress.

### Mentee page

- Progress, a checklist sorted blockers first, filters, "Mark as fixed" and replies, each switchable off by the mentor.
- Opens on the file with the most pressing comment.

### Interface

- Russian and English, switchable at any time, with proper Russian plurals; API errors and link previews are localized too.
- Dark and light themes from the Nitpick design system; works at phone width.

### Server and deployment

- Node 24 with Hono and the built-in `node:sqlite`; one JSON document per review.
- Input validation, rate limits, a 12 MB request limit and strict security headers (CSP, no framing, no referrer).
- Docker image and a GitHub Actions workflow that checks, builds, pushes to GHCR and deploys over SSH with a key bound to a single deploy command.

[1.0.0]: https://github.com/kewldan/nitpick/releases/tag/v1.0.0
