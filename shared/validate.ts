// Input validation for the API. Throws ValidationError with a message that is
// safe to show to the user.

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

function str(v: unknown, field: string, max: number, required = false): string {
  if (v === undefined || v === null) v = '';
  if (typeof v !== 'string') throw new ValidationError(`${field} must be text`);
  if (v.length > max) {
    throw new ValidationError(`${field} is too long (max ${max} characters)`);
  }
  if (required && !v.trim()) throw new ValidationError(`${field} is required`);
  return v;
}

function oneOf<T extends string>(
  v: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (typeof v !== 'string' || !allowed.includes(v as T)) {
    throw new ValidationError(`${field} must be one of ${allowed.join(', ')}`);
  }
  return v as T;
}

function int(v: unknown, field: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
    throw new ValidationError(`${field} must be a whole number ${min}–${max}`);
  }
  return v;
}

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
// Relative, forward slashes, no empty or dot segments, no control characters.
const PATH_RE = /^(?!\/)(?!.*\/\/)(?!.*(^|\/)\.{1,2}(\/|$))[^\u0000-\u001f\\]+(?<!\/)$/;

function validateFiles(raw: unknown): ReviewFile[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new ValidationError('Add at least one file');
  }
  if (raw.length > LIMITS.files) {
    throw new ValidationError(`Too many files (max ${LIMITS.files})`);
  }
  const seen = new Set<string>();
  let total = 0;
  const files = raw.map((f, i): ReviewFile => {
    if (!f || typeof f !== 'object') {
      throw new ValidationError(`File ${i + 1} is malformed`);
    }
    const o = f as Record<string, unknown>;
    const path = str(o.path, 'File path', LIMITS.path, true);
    if (!PATH_RE.test(path)) throw new ValidationError(`Bad file path: ${path}`);
    if (seen.has(path)) throw new ValidationError(`Duplicate file: ${path}`);
    seen.add(path);
    const code = str(o.code, `${path}`, LIMITS.code);
    if (code.split('\n').length > LIMITS.lines) {
      throw new ValidationError(`${path} is too long (max ${LIMITS.lines} lines)`);
    }
    const original = str(o.original, `${path} (original)`, LIMITS.code);
    total += code.length + original.length;
    return {
      path,
      language: str(o.language, 'Language', 32, true),
      code,
      original,
      formatter: str(o.formatter, 'Formatter', 80),
    };
  });
  if (total > LIMITS.totalCode) {
    throw new ValidationError('The project is too large to review in one go');
  }
  if (files.every((f) => !f.code.trim())) {
    throw new ValidationError('There is no code to review');
  }
  return files;
}

export function validateReviewInput(body: unknown): ReviewInput {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Expected a JSON object');
  }
  const b = body as Record<string, unknown>;
  const files = validateFiles(b.files);
  const lineCount = new Map(files.map((f) => [f.path, f.code.split('\n').length]));
  if (!Array.isArray(b.comments)) {
    throw new ValidationError('comments must be a list');
  }
  if (b.comments.length > LIMITS.comments) {
    throw new ValidationError(`Too many comments (max ${LIMITS.comments})`);
  }
  const seen = new Set<string>();
  const comments: CommentInput[] = b.comments.map((raw, i) => {
    if (!raw || typeof raw !== 'object') {
      throw new ValidationError(`Comment ${i + 1} is malformed`);
    }
    const c = raw as Record<string, unknown>;
    if (typeof c.id !== 'string' || !ID_RE.test(c.id) || seen.has(c.id)) {
      throw new ValidationError(`Comment ${i + 1} has a bad id`);
    }
    seen.add(c.id);
    const lines = typeof c.file === 'string' ? lineCount.get(c.file) : undefined;
    if (lines === undefined) {
      throw new ValidationError(`Comment ${i + 1} is on a file that isn’t in the review`);
    }
    const line = int(c.line, 'Comment line', 1, lines);
    const endLine = int(c.endLine ?? line, 'Comment end line', line, lines);
    return {
      id: c.id,
      file: c.file as string,
      line,
      endLine,
      severity: oneOf<Severity>(c.severity, SEVERITIES, 'Severity'),
      text: str(c.text, 'Comment', LIMITS.commentText, true),
      suggestion: str(c.suggestion, 'Suggestion', LIMITS.suggestion),
    };
  });
  return {
    title: str(b.title, 'Title', LIMITS.title),
    files,
    summary: str(b.summary, 'Summary', LIMITS.summary),
    verdict: oneOf<Verdict>(b.verdict, VERDICTS, 'Verdict'),
    reviewer: str(b.reviewer, 'Name', LIMITS.reviewer),
    expiry: oneOf<Expiry>(b.expiry, EXPIRIES, 'Expiry'),
    allowResolve: b.allowResolve !== false,
    allowReplies: b.allowReplies !== false,
    comments,
  };
}

export function validateReply(body: unknown): string {
  const b = (body ?? {}) as Record<string, unknown>;
  const text = str(b.text, 'Reply', LIMITS.reply, true).trim();
  return text;
}
