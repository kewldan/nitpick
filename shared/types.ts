// Types shared by the browser app and the API server.

export const SEVERITIES = [
  'blocker',
  'issue',
  'suggestion',
  'nit',
  'praise',
] as const;
export type Severity = (typeof SEVERITIES)[number];

export const VERDICTS = ['changes', 'approved', 'comment'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const EXPIRIES = ['1d', '7d', '30d', 'never'] as const;
export type Expiry = (typeof EXPIRIES)[number];

export const EXPIRY_MS: Record<Expiry, number | null> = {
  '1d': 24 * 3600 * 1000,
  '7d': 7 * 24 * 3600 * 1000,
  '30d': 30 * 24 * 3600 * 1000,
  never: null,
};

export type Author = 'mentor' | 'mentee';

export interface Reply {
  id: string;
  author: Author;
  text: string;
  at: string;
}

/** What the mentor writes. Line numbers are 1-based and inclusive. */
export interface CommentInput {
  id: string;
  /** Path of the file the comment is on. */
  file: string;
  line: number;
  endLine: number;
  severity: Severity;
  text: string;
  suggestion: string;
}

/** A comment as stored: the mentor's part plus the mentee's state. */
export interface Comment extends CommentInput {
  resolved: boolean;
  replies: Reply[];
}

/** One file of the reviewed code. */
export interface ReviewFile {
  /** Path inside the project, e.g. "src/main.cpp". Unique in a review. */
  path: string;
  language: string;
  /** The formatted code everyone reviews. */
  code: string;
  /** The code as pasted or uploaded, kept for the diff. */
  original: string;
  /** Human-readable formatter label, e.g. "clang-format · Google". */
  formatter: string;
}

/** Everything the mentor controls; sent on publish and on update. */
export interface ReviewInput {
  title: string;
  files: ReviewFile[];
  summary: string;
  verdict: Verdict;
  reviewer: string;
  expiry: Expiry;
  allowResolve: boolean;
  allowReplies: boolean;
  comments: CommentInput[];
}

export interface Review extends Omit<ReviewInput, 'comments'> {
  id: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  comments: Comment[];
}

export interface PublishResult {
  id: string;
  editKey: string;
  review: Review;
}

/** Compact status of a review for the mentor's list on the home page. */
export interface ReviewStatus {
  id: string;
  title: string;
  verdict: Verdict;
  total: number;
  actionable: number;
  fixed: number;
  replies: number;
  updatedAt: string;
  expiresAt: string | null;
  expired?: boolean;
  missing?: boolean;
}

export const LIMITS = {
  /** Per file. */
  code: 200_000,
  lines: 5_000,
  files: 300,
  /** All files together, formatted and original. */
  totalCode: 5_000_000,
  path: 300,
  comments: 1_000,
  commentText: 5_000,
  suggestion: 20_000,
  summary: 10_000,
  title: 200,
  reviewer: 80,
  reply: 2_000,
  repliesPerComment: 200,
} as const;

/** A stored review from before multi-file support. */
interface LegacyReview {
  language?: string;
  fileName?: string;
  code?: string;
  original?: string;
  formatter?: string;
}

const LEGACY_EXT: Record<string, string> = {
  cpp: 'cpp', c: 'c', java: 'java', csharp: 'cs', python: 'py', go: 'go',
  typescript: 'ts', javascript: 'js', rust: 'rs', kotlin: 'kt', sql: 'sql',
};

/** Upgrades a stored single-file review to the files layout. */
export function normalizeReview(doc: Review & LegacyReview): Review {
  if (Array.isArray(doc.files)) return doc;
  const language = doc.language ?? 'text';
  const path = doc.fileName || `main.${LEGACY_EXT[language] ?? 'txt'}`;
  const { fileName: _f, code, original, formatter, language: _l, ...rest } = doc;
  return {
    ...rest,
    files: [{ path, language, code: code ?? '', original: original ?? '', formatter: formatter ?? '' }],
    comments: doc.comments.map((c) => ({ ...c, file: c.file ?? path })),
  };
}
