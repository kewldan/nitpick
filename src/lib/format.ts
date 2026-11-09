// Real formatters, compiled to WebAssembly and loaded on first use:
// clang-format for C, C++, Java and C#; Ruff for Python; gofmt for Go;
// Prettier for TypeScript and JavaScript.

import { language, type FormatterId } from './languages.ts';

export const CLANG_STYLES = [
  'Google',
  'LLVM',
  'Chromium',
  'Mozilla',
  'WebKit',
  'Microsoft',
  'GNU',
] as const;
export type ClangStyle = (typeof CLANG_STYLES)[number];
export type Braces = 'attach' | 'allman';

export type Indent = 2 | 4;

export interface FormatOptions {
  style: ClangStyle;
  /** clang-format indent; follows the chosen style unless changed. */
  indent: Indent;
  braces: Braces;
  /** Indent for the other formatters, each with its own convention. */
  indents?: Partial<Record<FormatterId, Indent>>;
}

export const DEFAULT_FORMAT: FormatOptions = {
  style: 'Google',
  indent: 2,
  braces: 'attach',
  indents: { ruff: 4, prettier: 2 },
};

/** The indent a formatter uses under these options. */
export function indentFor(f: FormatterId | null, o: FormatOptions): Indent {
  if (f === 'clang-format' || !f) return o.indent;
  return o.indents?.[f] ?? DEFAULT_FORMAT.indents?.[f] ?? 4;
}

export function withIndent(f: FormatterId | null, o: FormatOptions, v: Indent): FormatOptions {
  if (f === 'clang-format' || !f) return { ...o, indent: v };
  return { ...o, indents: { ...o.indents, [f]: v } };
}

/** The indent and brace placement each clang-format preset starts from. */
export function styleDefaults(style: ClangStyle): Pick<FormatOptions, 'indent' | 'braces'> {
  switch (style) {
    case 'WebKit':
      return { indent: 4, braces: 'attach' };
    case 'Microsoft':
      return { indent: 4, braces: 'allman' };
    default:
      return { indent: 2, braces: 'attach' };
  }
}

/** Which controls make sense for a formatter. */
export function formatterControls(f: FormatterId | null) {
  return {
    style: f === 'clang-format',
    indent: f === 'clang-format' || f === 'prettier' || f === 'ruff',
    braces: f === 'clang-format',
  };
}

export function formatterLabel(langId: string, opts: FormatOptions): string {
  const f = language(langId).formatter;
  switch (f) {
    case 'clang-format':
      return `clang-format · ${opts.style}`;
    case 'prettier':
      return 'Prettier';
    case 'gofmt':
      return 'gofmt';
    case 'ruff':
      return 'Ruff';
    default:
      return 'As pasted';
  }
}

export interface FormatResult {
  code: string;
  /** Set when the formatter refused the input; `code` is then the input. */
  error?: string;
}

type Fn = (code: string, langId: string, opts: FormatOptions) => string;
const loaded = new Map<FormatterId, Promise<Fn>>();

function load(id: FormatterId): Promise<Fn> {
  let p = loaded.get(id);
  if (p) return p;
  p = (async (): Promise<Fn> => {
    switch (id) {
      case 'clang-format': {
        const m = await import('@wasm-fmt/clang-format/vite');
        await m.default();
        return (code, langId, o) => {
          const style = JSON.stringify({
            BasedOnStyle: o.style,
            IndentWidth: o.indent,
            BreakBeforeBraces: o.braces === 'allman' ? 'Allman' : 'Attach',
            ...(langId === 'java' || langId === 'csharp'
              ? {}
              : { DerivePointerAlignment: false }),
          });
          return m.format(code, `main.${language(langId).ext}`, style);
        };
      }
      case 'gofmt': {
        const m = await import('@wasm-fmt/gofmt/vite');
        await m.default();
        return (code) => m.format(code);
      }
      case 'ruff': {
        const m = await import('@wasm-fmt/ruff_fmt/vite');
        await m.default();
        return (code, _l, o) =>
          m.format(code, 'main.py', {
            indent_width: indentFor('ruff', o),
            line_width: 88,
          });
      }
      case 'prettier': {
        const [prettier, ts, estree, babel] = await Promise.all([
          import('prettier/standalone'),
          import('prettier/plugins/typescript'),
          import('prettier/plugins/estree'),
          import('prettier/plugins/babel'),
        ]);
        // Prettier is async; this formatter is wrapped below.
        const fn = (code: string, langId: string, o: FormatOptions) =>
          prettier.format(code, {
            parser: langId === 'typescript' ? 'typescript' : 'babel',
            plugins: [ts.default ?? ts, estree.default ?? estree, babel.default ?? babel],
            tabWidth: indentFor('prettier', o),
          });
        return fn as unknown as Fn;
      }
    }
  })();
  loaded.set(id, p);
  p.catch(() => loaded.delete(id));
  return p;
}

const tidy = (s: string) =>
  s.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');

function firstLine(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.split('\n').find((l) => l.trim())?.trim().slice(0, 200) ?? 'unknown error';
}

export async function formatCode(
  code: string,
  langId: string,
  opts: FormatOptions,
): Promise<FormatResult> {
  const input = tidy(code);
  const f = language(langId).formatter;
  if (!f || !input.trim()) return { code: input };
  try {
    const fn = await load(f);
    const out = await fn(input, langId, opts);
    return { code: tidy(out) };
  } catch (err) {
    return { code: input, error: firstLine(err) };
  }
}

/** Starts downloading a formatter before it is needed. */
export function preloadFormatter(langId: string) {
  const f = language(langId).formatter;
  if (f) load(f).catch(() => {});
}
