// Step 1: paste the code, pick a language and style, see it formatted.

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { LIMITS } from '../../shared/types.ts';
import { Header } from '../components/Header.tsx';
import { Icon } from '../components/Icon.tsx';
import { Seg, Select, Steps } from '../components/controls.tsx';
import { Toks } from '../components/CodeView.tsx';
import { diffLines } from '../lib/diff.ts';
import { defaultFileName, SAMPLES, type Draft } from '../lib/draft.ts';
import {
  CLANG_STYLES,
  formatCode,
  formatterControls,
  formatterLabel,
  indentFor,
  preloadFormatter,
  withIndent,
  styleDefaults,
  type ClangStyle,
  type FormatResult,
} from '../lib/format.ts';
import { highlight } from '../lib/highlight.ts';
import {
  guessLanguage,
  language,
  languageFromFileName,
  LANGUAGES,
} from '../lib/languages.ts';
import { plural } from '../lib/text.ts';

export function CodeStep({
  draft,
  patch,
  onStart,
  published,
  footer,
}: {
  draft: Draft;
  patch: (p: Partial<Draft>) => void;
  onStart: (formatted: FormatResult) => void;
  published: boolean;
  footer?: ReactNode;
}) {
  const [view, setView] = useState<'formatted' | 'diff'>('formatted');
  const [result, setResult] = useState<FormatResult | null>(null);
  const [pending, setPending] = useState(false);
  const seq = useRef(0);
  const lang = language(draft.language);
  const controls = formatterControls(lang.formatter);

  useEffect(() => preloadFormatter(draft.language), [draft.language]);

  // Re-format as the mentor types, a moment after they stop.
  useEffect(() => {
    const n = ++seq.current;
    if (!draft.raw.trim()) {
      setResult(null);
      setPending(false);
      return;
    }
    setPending(true);
    const t = window.setTimeout(async () => {
      const r = await formatCode(draft.raw, draft.language, draft.fmt);
      if (n === seq.current) {
        setResult(r);
        setPending(false);
      }
    }, 220);
    return () => window.clearTimeout(t);
  }, [draft.raw, draft.language, draft.fmt]);

  const rawLines = draft.raw ? draft.raw.split('\n').length : 0;
  const fmtCode = result?.code ?? '';
  const fmtLineArr = useMemo(() => (fmtCode ? fmtCode.split('\n') : []), [fmtCode]);
  const fmtHl = useMemo(() => highlight(fmtCode, draft.language), [fmtCode, draft.language]);
  const tooLong = rawLines > LIMITS.lines || draft.raw.length > LIMITS.code;

  const diff = useMemo(() => {
    if (view !== 'diff' || !fmtCode) return [];
    const a = draft.raw.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
    const rawHl = highlight(a, draft.language);
    return diffLines(a.split('\n'), fmtLineArr).map((r) => ({
      ...r,
      toks: r.t === '-' ? rawHl[r.a! - 1] ?? [] : fmtHl[r.b! - 1] ?? [],
    }));
  }, [view, fmtCode, draft.raw, draft.language, fmtLineArr, fmtHl]);
  const changed = diff.filter((r) => r.t !== ' ').length;

  const setLanguage = (id: string) => {
    const p: Partial<Draft> = { language: id };
    if (!draft.fileName || languageFromFileName(draft.fileName) !== id) {
      if (draft.fileName && /\.[A-Za-z0-9]+$/.test(draft.fileName)) {
        p.fileName = draft.fileName.replace(/\.[A-Za-z0-9]+$/, `.${language(id).ext}`);
      }
    }
    patch(p);
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (draft.raw.trim()) return;
    const text = e.clipboardData.getData('text');
    const guess = guessLanguage(text);
    if (guess && guess !== draft.language) setLanguage(guess);
  };

  const onTab = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab' || e.shiftKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setRangeText('  ', el.selectionStart, el.selectionEnd, 'end');
    patch({ raw: el.value });
  };

  const fmtName = formatterLabel(draft.language, draft.fmt);
  const status = !draft.raw.trim()
    ? null
    : pending
      ? { dot: 'var(--text-faint)', text: `${fmtName} · formatting…` }
      : result?.error
        ? { dot: 'var(--issue)', text: `${fmtName} · couldn’t parse` }
        : lang.formatter
          ? { dot: 'var(--praise)', text: fmtName }
          : { dot: 'var(--nit)', text: `No formatter for ${lang.label}` };

  return (
    <div className="page">
      <Header
        crumb={<span className="crumb">{published ? draft.title || 'Untitled review' : 'New review'}</span>}
        middle={<Steps current={1} />}
      />
      <main className="container container--code stack-20">
        <div className="code-toolbar">
          <div className="np-field title-field">
            <label htmlFor="np-title" className="np-label">
              Review title
            </label>
            <input
              id="np-title"
              className="np-title-input"
              type="text"
              value={draft.title}
              maxLength={LIMITS.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Untitled review"
            />
          </div>
          <div className="code-toolbar__controls">
            <div className="np-field">
              <label htmlFor="np-lang" className="np-label">
                Language
              </label>
              <Select
                id="np-lang"
                value={draft.language}
                minWidth={140}
                onChange={setLanguage}
                options={LANGUAGES.map((l) => ({ id: l.id, label: l.label }))}
              />
            </div>
            {controls.style && (
              <div className="np-field">
                <label htmlFor="np-style" className="np-label">
                  Style
                </label>
                <Select
                  id="np-style"
                  value={draft.fmt.style}
                  minWidth={120}
                  onChange={(s) =>
                    patch({
                      fmt: { ...draft.fmt, style: s as ClangStyle, ...styleDefaults(s as ClangStyle) },
                    })
                  }
                  options={CLANG_STYLES.map((s) => ({ id: s, label: s }))}
                />
              </div>
            )}
            {controls.indent && (
              <div className="np-field">
                <span id="np-indent-l" className="np-label">
                  Indent
                </span>
                <Seg
                  labelledBy="np-indent-l"
                  value={indentFor(lang.formatter, draft.fmt)}
                  onChange={(v) => patch({ fmt: withIndent(lang.formatter, draft.fmt, v) })}
                  items={[
                    { id: 2 as const, label: '2' },
                    { id: 4 as const, label: '4' },
                  ]}
                />
              </div>
            )}
            {controls.braces && (
              <div className="np-field">
                <span id="np-braces-l" className="np-label">
                  Braces
                </span>
                <Seg
                  labelledBy="np-braces-l"
                  value={draft.fmt.braces}
                  onChange={(braces) => patch({ fmt: { ...draft.fmt, braces } })}
                  items={[
                    { id: 'attach' as const, label: 'Attach' },
                    { id: 'allman' as const, label: 'Allman' },
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        <div className="code-split">
          <section className="np-panel pane" aria-label="Original code">
            <div className="np-panel__head">
              <div className="pane__title">
                <input
                  className="file-input"
                  aria-label="File name"
                  value={draft.fileName}
                  maxLength={LIMITS.fileName}
                  placeholder={defaultFileName(draft.language)}
                  onChange={(e) => {
                    const fileName = e.target.value;
                    const byExt = languageFromFileName(fileName);
                    patch(byExt && byExt !== draft.language ? { fileName, language: byExt } : { fileName });
                  }}
                />
                <span className="np-file__meta">
                  {draft.raw ? plural(rawLines, 'line') : 'Original'}
                </span>
              </div>
              <div className="pane__actions">
                {SAMPLES[draft.language] && (
                  <button
                    type="button"
                    className="np-btn np-btn--ghost np-btn--sm"
                    onClick={() => patch({ raw: SAMPLES[draft.language] })}
                  >
                    Load example
                  </button>
                )}
                <button
                  type="button"
                  className="np-btn np-btn--ghost np-btn--sm"
                  disabled={!draft.raw}
                  onClick={() => patch({ raw: '' })}
                >
                  Clear
                </button>
              </div>
            </div>
            <textarea
              className="code-input"
              aria-label="Code to review"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              value={draft.raw}
              onChange={(e) => patch({ raw: e.target.value })}
              onPaste={onPaste}
              onKeyDown={onTab}
              placeholder="Paste the code you want to review…"
              autoFocus={!draft.raw}
            />
          </section>

          <section className="np-panel pane" aria-label="Formatted code">
            <div className="np-panel__head">
              <div className="pane__title">
                <Seg
                  onBg
                  label="Preview mode"
                  value={view}
                  onChange={setView}
                  items={[
                    { id: 'formatted', label: 'Formatted' },
                    { id: 'diff', label: 'Diff' },
                  ]}
                />
                <span className="np-file__meta">
                  {fmtCode
                    ? view === 'diff'
                      ? changed
                        ? `${plural(changed, 'line')} changed`
                        : 'No changes'
                      : plural(fmtLineArr.length, 'line')
                    : ''}
                </span>
              </div>
              {status && (
                <span className="np-badge np-pill np-pill--outline">
                  <span className="np-dot" style={{ background: status.dot }} />
                  {status.text}
                </span>
              )}
            </div>
            {result?.error && (
              <div className="pane-note" role="note">
                <Icon name="alert" size={14} />
                <span>
                  The formatter couldn’t parse this code, so it’s shown as pasted.{' '}
                  <span className="pane-note__detail">{result.error}</span>
                </span>
              </div>
            )}
            {!fmtCode ? (
              <div className="pane-empty">
                <Icon name="lines" size={28} />
                <p className="pane-empty__title">Formatted code shows up here</p>
                <p className="pane-empty__text">
                  Paste code on the left. It’s re-indented and re-spaced as you type, so you
                  review the logic, not the whitespace.
                </p>
              </div>
            ) : view === 'formatted' ? (
              <div className="np-code pane-scroll">
                {fmtHl.map((toks, i) => (
                  <div key={i} className="np-line">
                    <span className="np-line__num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="np-line__text">
                      <Toks toks={toks} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="np-code pane-scroll np-code--diff">
                {diff.map((r, i) => (
                  <div
                    key={i}
                    className={`np-line${r.t === '+' ? ' np-line--add' : r.t === '-' ? ' np-line--del' : ''}`}
                  >
                    <span className="np-line__num np-line__num--narrow" aria-hidden="true">
                      {r.a ?? ''}
                    </span>
                    <span className="np-line__num np-line__num--narrow" aria-hidden="true">
                      {r.b ?? ''}
                    </span>
                    <span className="np-line__sign" aria-hidden="true">
                      {r.t === ' ' ? '' : r.t === '+' ? '+' : '−'}
                    </span>
                    <span className="np-line__text">
                      <Toks toks={r.toks} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="action-bar">
          <p className="action-bar__text">
            {tooLong
              ? `That’s more than we can review in one go: up to ${LIMITS.lines.toLocaleString()} lines.`
              : published
                ? 'Comments stay on their lines when the code changes. Update the link afterwards so your mentee sees it.'
                : 'Next: comment line by line, then share a short link. No sign-up for you or your mentee.'}
          </p>
          <button
            type="button"
            className="np-btn np-btn--primary np-btn--lg"
            disabled={!result || pending || tooLong}
            onClick={() => result && onStart(result)}
          >
            {published ? 'Back to review' : 'Start review'}
            <Icon name="arrow-right" />
          </button>
        </div>
        {footer}
      </main>
    </div>
  );
}
