// Input validation for the API. Throws ValidationError with a message that is
// safe to show to the user.

import {
  EXPIRIES,
  LIMITS,
  SEVERITIES,
  VERDICTS,
  type CommentInput,
  type Expiry,
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

export function validateReviewInput(body: unknown): ReviewInput {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Expected a JSON object');
  }
  const b = body as Record<string, unknown>;
  const code = str(b.code, 'Code', LIMITS.code, true);
  const lineCount = code.split('\n').length;
  if (lineCount > LIMITS.lines) {
    throw new ValidationError(`Code is too long (max ${LIMITS.lines} lines)`);
  }
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
    const line = int(c.line, 'Comment line', 1, lineCount);
    const endLine = int(c.endLine ?? line, 'Comment end line', line, lineCount);
    return {
      id: c.id,
      line,
      endLine,
      severity: oneOf<Severity>(c.severity, SEVERITIES, 'Severity'),
      text: str(c.text, 'Comment', LIMITS.commentText, true),
      suggestion: str(c.suggestion, 'Suggestion', LIMITS.suggestion),
    };
  });
  return {
    title: str(b.title, 'Title', LIMITS.title),
    language: str(b.language, 'Language', 32, true),
    fileName: str(b.fileName, 'File name', LIMITS.fileName),
    code,
    original: str(b.original, 'Original code', LIMITS.code),
    formatter: str(b.formatter, 'Formatter', 80),
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
