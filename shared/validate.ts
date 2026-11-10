// Input validation for the API. Throws ValidationError with a message, in the
// caller's locale, that is safe to show to the user.

import {
  DEFAULT_LOCALE,
  isLocale,
  SERVER_MESSAGES,
  type Field,
  type Locale,
  type ServerMessages,
} from './i18n.ts';
import {
  EXPIRIES,
  LIMITS,
  SEVERITIES,
  VERDICTS,
  type CommentInput,
  type Expiry,
  type ReviewFile,
  type ReviewInput,
  type Severity,
  type Verdict,
} from './types.ts';

export class ValidationError extends Error {}

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
// Relative, forward slashes, no empty or dot segments, no control characters.
const PATH_RE = /^(?!\/)(?!.*\/\/)(?!.*(^|\/)\.{1,2}(\/|$))[^\u0000-\u001f\\]+(?<!\/)$/;

function checker(m: ServerMessages) {
  const fail = (msg: string): never => {
    throw new ValidationError(msg);
  };
  const name = (f: Field | string) => (f in m.field ? m.field[f as Field] : f);

  const str = (v: unknown, field: Field | string, max: number, required = false): string => {
    if (v === undefined || v === null) v = '';
    if (typeof v !== 'string') fail(m.notText(name(field)));
    const s = v as string;
    if (s.length > max) fail(m.tooLong(name(field), max));
    if (required && !s.trim()) fail(m.required(name(field)));
    return s;
  };
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[], field: Field): T => {
    if (typeof v !== 'string' || !allowed.includes(v as T)) {
      fail(m.oneOf(name(field), allowed.join(', ')));
    }
    return v as T;
  };
  const int = (v: unknown, field: Field, min: number, max: number): number => {
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
      fail(m.wholeNumber(name(field), min, max));
    }
    return v as number;
  };
  return { fail, str, oneOf, int };
}

function validateFiles(raw: unknown, m: ServerMessages): ReviewFile[] {
  const { fail, str } = checker(m);
  if (!Array.isArray(raw) || raw.length === 0) fail(m.noFiles);
  const list = raw as unknown[];
  if (list.length > LIMITS.files) fail(m.tooManyFiles(LIMITS.files));
  const seen = new Set<string>();
  let total = 0;
  const files = list.map((f, i): ReviewFile => {
    if (!f || typeof f !== 'object') fail(m.fileMalformed(i + 1));
    const o = f as Record<string, unknown>;
    const path = str(o.path, 'path', LIMITS.path, true);
    if (!PATH_RE.test(path)) fail(m.badPath(path));
    if (seen.has(path)) fail(m.dupPath(path));
    seen.add(path);
    const code = str(o.code, path, LIMITS.code);
    if (code.split('\n').length > LIMITS.lines) fail(m.fileTooLong(path, LIMITS.lines));
    const original = str(o.original, path, LIMITS.code);
    total += code.length + original.length;
    return {
      path,
      language: str(o.language, 'language', 32, true),
      code,
      original,
      formatter: str(o.formatter, 'formatter', 80),
    };
  });
  if (total > LIMITS.totalCode) fail(m.projectTooLarge);
  if (files.every((f) => !f.code.trim())) fail(m.noCode);
  return files;
}

export function validateReviewInput(body: unknown, locale: Locale = DEFAULT_LOCALE): ReviewInput {
  const m = SERVER_MESSAGES[locale];
  const { fail, str, oneOf, int } = checker(m);
  if (!body || typeof body !== 'object') fail(m.expectedObject);
  const b = body as Record<string, unknown>;
  const files = validateFiles(b.files, m);
  const lineCount = new Map(files.map((f) => [f.path, f.code.split('\n').length]));
  if (!Array.isArray(b.comments)) fail(m.commentsList);
  const rawComments = b.comments as unknown[];
  if (rawComments.length > LIMITS.comments) fail(m.tooManyComments(LIMITS.comments));
  const seen = new Set<string>();
  const comments: CommentInput[] = rawComments.map((raw, i) => {
    if (!raw || typeof raw !== 'object') fail(m.commentMalformed(i + 1));
    const c = raw as Record<string, unknown>;
    if (typeof c.id !== 'string' || !ID_RE.test(c.id) || seen.has(c.id)) {
      fail(m.badCommentId(i + 1));
    }
    seen.add(c.id as string);
    const lines = typeof c.file === 'string' ? lineCount.get(c.file) : undefined;
    if (lines === undefined) fail(m.commentFileMissing(i + 1));
    const line = int(c.line, 'line', 1, lines!);
    const endLine = int(c.endLine ?? line, 'endLine', line, lines!);
    return {
      id: c.id as string,
      file: c.file as string,
      line,
      endLine,
      severity: oneOf<Severity>(c.severity, SEVERITIES, 'severity'),
      text: str(c.text, 'comment', LIMITS.commentText, true),
      suggestion: str(c.suggestion, 'suggestion', LIMITS.suggestion),
    };
  });
  return {
    title: str(b.title, 'title', LIMITS.title),
    files,
    summary: str(b.summary, 'summary', LIMITS.summary),
    verdict: oneOf<Verdict>(b.verdict, VERDICTS, 'verdict'),
    reviewer: str(b.reviewer, 'name', LIMITS.reviewer),
    expiry: oneOf<Expiry>(b.expiry, EXPIRIES, 'expiry'),
    allowResolve: b.allowResolve !== false,
    allowReplies: b.allowReplies !== false,
    locale: isLocale(b.locale) ? b.locale : locale,
    comments,
  };
}

export function validateReply(body: unknown, locale: Locale = DEFAULT_LOCALE): string {
  const { str } = checker(SERVER_MESSAGES[locale]);
  const b = (body ?? {}) as Record<string, unknown>;
  return str(b.text, 'reply', LIMITS.reply, true).trim();
}
