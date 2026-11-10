// Step 1: paste code or upload a project (.zip or files), pick languages and
// a style, see each file formatted.

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { LIMITS } from '../../shared/types.ts';
import { FileTree, type TreeItem } from '../components/FileTree.tsx';
import { Header } from '../components/Header.tsx';
import { Icon } from '../components/Icon.tsx';
import { Seg, Select, Steps } from '../components/controls.tsx';
import { Toks } from '../components/CodeView.tsx';
import { diffLines } from '../lib/diff.ts';
import {
  defaultFileName,
  filePath,
  newFile,
  SAMPLES,
  type Draft,
  type DraftFile,
} from '../lib/draft.ts';
import {
  CLANG_STYLES,
  formatCode,
  formatterControls,
  formatterLabel,
  formatterName,
  indentFor,
  preloadFormatter,
  styleDefaults,
  withIndent,
  type ClangStyle,
  type FormatResult,
} from '../lib/format.ts';
import { highlight } from '../lib/highlight.ts';
import { useToast } from '../lib/hooks.tsx';
import {
  guessLanguage,
  language,
  languageFromFileName,
  languageName,
  LANGUAGES,
} from '../lib/languages.ts';
import { t } from '../i18n/index.ts';
import { readUpload, sortPaths, type ImportResult } from '../lib/zip.ts';

type Patch = (p: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => void;

function uniquePath(path: string, taken: Set<string>): string {
  if (!taken.has(path)) return path;
  const m = /^(.*?)(\.[^./]+)?$/.exec(path)!;
  for (let i = 2; ; i++) {
    const p = `${m[1]}-${i}${m[2] ?? ''}`;
    if (!taken.has(p)) return p;
  }
}

function SkippedNote({ result, onClose }: { result: ImportResult; onClose: () => void }) {
  const m = t().import;
  const reasons = new Map<string, number>();
  for (const s of result.skipped) reasons.set(s.reason, (reasons.get(s.reason) ?? 0) + 1);
  return (
    <div className="import-note" role="status">
      <Icon name="check" size={14} />
      <div className="grow">
        <p>
          {m.imported(result.files.length)}
          {result.skipped.length > 0 &&
            m.leftOut(
              result.skipped.length,
              [...reasons].map(([r, n]) => `${n} — ${m.reason[r as keyof typeof m.reason]}`).join(', '),
            )}
        </p>
        {result.skipped.length > 0 && (
          <details>
            <summary>{m.showLeftOut}</summary>
            <ul className="import-note__list">
              {result.skipped.slice(0, 200).map((s) => (
                <li key={s.path}>
                  <span className="mono">{s.path}</span> — {m.reason[s.reason]}
                </li>
              ))}
              {result.skipped.length > 200 && <li>{m.andMore(result.skipped.length - 200)}</li>}
            </ul>
          </details>
        )}
      </div>
      <button type="button" className="np-btn np-btn--icon" aria-label={m.dismiss} onClick={onClose}>
        <Icon name="close" />
      </button>
    </div>
  );
}

export function CodeStep({
  draft,
  patch,
  selectedId,
  onSelect,
  onStart,
  published,
  footer,
}: {
  draft: Draft;
  patch: Patch;
  selectedId: string;
  onSelect: (id: string) => void;
  onStart: (results: Map<string, FormatResult>) => void;
  published: boolean;
  footer?: ReactNode;
}) {
  const toast = useToast();
  const m = t().code;
  const [view, setView] = useState<'formatted' | 'diff'>('formatted');
  const [result, setResult] = useState<FormatResult | null>(null);
  const [pending, setPending] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [failed, setFailed] = useState<Map<string, string>>(new Map());
  const seq = useRef(0);
  const uploadRef = useRef<HTMLInputElement>(null);

  const file: DraftFile = draft.files.find((f) => f.id === selectedId) ?? draft.files[0];
  const multi = draft.files.length > 1;
  const lang = language(file.language);
  const controls = formatterControls(lang.formatter);

  useEffect(() => preloadFormatter(file.language), [file.language]);

  // Re-format the open file as the mentor types, a moment after they stop.
  useEffect(() => {
    const n = ++seq.current;
    if (!file.raw.trim()) {
      setResult(null);
      setPending(false);
      return;
    }
    setPending(true);
    const t = window.setTimeout(async () => {
      const r = await formatCode(file.raw, file.language, draft.fmt);
      if (n === seq.current) {
        setResult(r);
        setPending(false);
      }
    }, 220);
    return () => window.clearTimeout(t);
  }, [file.raw, file.language, draft.fmt]);

  const patchFile = (id: string, p: Partial<DraftFile>) =>
    patch((d) => ({ files: d.files.map((f) => (f.id === id ? { ...f, ...p } : f)) }));

  const rawLines = file.raw ? file.raw.split('\n').length : 0;
  const fmtCode = result?.code ?? '';
  const fmtLineArr = useMemo(() => (fmtCode ? fmtCode.split('\n') : []), [fmtCode]);
  const fmtHl = useMemo(() => highlight(fmtCode, file.language), [fmtCode, file.language]);
  const tooLong = draft.files.find(
    (f) => f.raw.split('\n').length > LIMITS.lines || f.raw.length > LIMITS.code,
  );
  const hasCode = draft.files.some((f) => f.raw.trim());

  const diff = useMemo(() => {
    if (view !== 'diff' || !fmtCode) return [];
    const a = file.raw.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
    const rawHl = highlight(a, file.language);
    return diffLines(a.split('\n'), fmtLineArr).map((r) => ({
      ...r,
      toks: r.t === '-' ? (rawHl[r.a! - 1] ?? []) : (fmtHl[r.b! - 1] ?? []),
    }));
  }, [view, fmtCode, file.raw, file.language, fmtLineArr, fmtHl]);
  const changed = diff.filter((r) => r.t !== ' ').length;

  /* ---------- File operations ---------- */

  const setLanguage = (id: string) => {
    const p: Partial<DraftFile> = { language: id };
    if (file.path && /\.[A-Za-z0-9]+$/.test(file.path) && languageFromFileName(file.path) !== id) {
      p.path = file.path.replace(/\.[A-Za-z0-9]+$/, `.${language(id).ext}`);
    }
    rename(file, p.path ?? file.path, p);
  };

  /** Renames a file and moves its comments along. */
  const rename = (f: DraftFile, path: string, extra: Partial<DraftFile> = {}) => {
    patch((d) => {
      const before = filePath(f);
      const next = { ...f, ...extra, path };
      const after = filePath(next);
      return {
        files: d.files.map((x) => (x.id === f.id ? { ...x, ...extra, path } : x)),
        comments:
          before === after ? d.comments : d.comments.map((c) => (c.file === before ? { ...c, file: after } : c)),
      };
    });
  };

  const addFile = () => {
    const taken = new Set(draft.files.map(filePath));
    const f = newFile(file.language, uniquePath(`untitled.${language(file.language).ext}`, taken));
    patch((d) => ({
      files: [
        // Give a nameless single file its default name before it has company.
        ...d.files.map((x) => (x.path ? x : { ...x, path: filePath(x) })),
        f,
      ],
    }));
    onSelect(f.id);
  };

  const removeFile = (id: string) => {
    const f = draft.files.find((x) => x.id === id);
    if (!f) return;
    const n = draft.comments.filter((c) => c.file === filePath(f)).length;
    if (n && !window.confirm(m.removeFileConfirm(filePath(f), n))) {
      return;
    }
    const rest = draft.files.filter((x) => x.id !== id);
    patch((d) => ({
      files: rest.length ? d.files.filter((x) => x.id !== id) : [newFile(f.language)],
      comments: d.comments.filter((c) => c.file !== filePath(f)),
    }));
    if (id === selectedId && rest.length) onSelect(rest[0].id);
  };

  const importFiles = async (list: FileList | File[]) => {
    if (!list.length) return;
    let res: ImportResult;
    try {
      res = await readUpload(list);
    } catch (err) {
      toast(err instanceof Error ? err.message : m.readFailed);
      return;
    }
    if (!res.files.length) {
      toast(m.nothingToReview);
      setImported(res);
      return;
    }
    const current = draft.files.filter((f) => f.raw.trim());
    if (current.length) {
      const keep = new Set(res.files.map((f) => f.path));
      const lost = draft.comments.filter((c) => !keep.has(c.file)).length;
      const ok = window.confirm(m.replaceConfirm(res.files.length, lost));
      if (!ok) return;
    }
    const byPath = new Map(draft.files.map((f) => [filePath(f), f]));
    const files: DraftFile[] = sortPaths(
      res.files.map((f) => {
        const old = byPath.get(f.path);
        return {
          ...newFile(f.language, f.path, f.text),
          ...(old ? { id: old.id, code: old.code, formatter: old.formatter } : {}),
        };
      }),
    );
    const paths = new Set(files.map((f) => f.path));
    patch((d) => ({
      files,
      title: d.title || res.name,
      comments: d.comments.filter((c) => paths.has(c.file)),
    }));
    setImported(res);
    setFailed(new Map());
    const first =
      files.find((f) => /(^|\/)main\.[^/]+$/.test(f.path)) ??
      files.find((f) => language(f.language).formatter) ??
      files[0];
    onSelect(first.id);
  };

  /* ---------- Start: format every file ---------- */

  const start = async () => {
    const results = new Map<string, FormatResult>();
    const bad = new Map<string, string>();
    const todo = draft.files.filter((f) => f.raw.trim());
    for (let i = 0; i < todo.length; i++) {
      const f = todo[i];
      if (todo.length > 1) setStarting(m.formattingProgress(i + 1, todo.length));
      const r =
        f.id === file.id && result && !pending ? result : await formatCode(f.raw, f.language, draft.fmt);
      results.set(f.id, r);
      if (r.error) bad.set(f.id, r.error);
    }
    setStarting(null);
    setFailed(bad);
    if (bad.size && todo.length > 1) {
      toast(m.filesUnparsed(bad.size), 'info');
    }
    onStart(results);
  };

  /* ---------- Input helpers ---------- */

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (file.raw.trim()) return;
    const text = e.clipboardData.getData('text');
    const guess = guessLanguage(text);
    if (guess && guess !== file.language && !multi) setLanguage(guess);
  };

  const onTab = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab' || e.shiftKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setRangeText('  ', el.selectionStart, el.selectionEnd, 'end');
    patchFile(file.id, { raw: el.value });
  };

  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setDragging(true);
  };
  const onDrop = (e: DragEvent) => {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    setDragging(false);
    importFiles(e.dataTransfer.files);
  };

  const fm = t().formatter;
  const fmtName = formatterName(formatterLabel(file.language, draft.fmt));
  const status = !file.raw.trim()
    ? null
    : pending
      ? { dot: 'var(--text-faint)', text: fm.formatting(fmtName) }
      : result?.error
        ? { dot: 'var(--issue)', text: fm.cantParse(fmtName) }
        : lang.formatter
          ? { dot: 'var(--praise)', text: fmtName }
          : { dot: 'var(--nit)', text: fm.none(languageName(file.language)) };

  const treeItems: TreeItem[] = draft.files.map((f) => ({
    key: f.id,
    path: filePath(f),
    warn: failed.get(f.id) ? fm.fileWarn : undefined,
  }));

  const uploadButton = (label: string, cls = 'np-btn np-btn--ghost np-btn--sm') => (
    <button type="button" className={cls} onClick={() => uploadRef.current?.click()}>
      <Icon name="file" />
      {label}
    </button>
  );

  return (
    <div
      className="page"
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <input
        ref={uploadRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) importFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          <div className="drop-overlay__box">
            <Icon name="file" size={24} />
            <p>{m.drop}</p>
          </div>
        </div>
      )}
      <Header
        crumb={<span className="crumb">{published ? draft.title || t().common.untitled : m.newReview}</span>}
        middle={<Steps current={1} />}
      />
      <main className="container container--code stack-20">
        <div className="code-toolbar">
          <div className="np-field title-field">
            <label htmlFor="np-title" className="np-label">
              {m.titleLabel}
            </label>
            <input
              id="np-title"
              className="np-title-input"
              type="text"
              value={draft.title}
              maxLength={LIMITS.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={t().common.untitled}
            />
          </div>
          <div className="code-toolbar__controls">
            <div className="np-field">
              <label htmlFor="np-lang" className="np-label">
                {multi ? m.languageOfFile : m.language}
              </label>
              <Select
                id="np-lang"
                value={file.language}
                minWidth={140}
                onChange={setLanguage}
                options={LANGUAGES.map((l) => ({ id: l.id, label: languageName(l.id) }))}
              />
            </div>
            {controls.style && (
              <div className="np-field">
                <label htmlFor="np-style" className="np-label">
                  {m.style}
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
                  {m.indent}
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
                  {m.braces}
                </span>
                <Seg
                  labelledBy="np-braces-l"
                  value={draft.fmt.braces}
                  onChange={(braces) => patch({ fmt: { ...draft.fmt, braces } })}
                  items={[
                    { id: 'attach' as const, label: m.attach },
                    { id: 'allman' as const, label: m.allman },
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        {imported && <SkippedNote result={imported} onClose={() => setImported(null)} />}

        <div className={`code-split${multi ? ' code-split--tree' : ''}`}>
          {multi && (
            <FileTree
              items={treeItems}
              selected={file.id}
              onSelect={onSelect}
              onRemove={removeFile}
              title={m.filesTitle(draft.files.length)}
              actions={
                <>
                  <button
                    type="button"
                    className="np-btn np-btn--icon"
                    aria-label={m.addFileAria}
                    title={m.addFileAria}
                    onClick={addFile}
                  >
                    <Icon name="plus" size={14} />
                  </button>
                  <button
                    type="button"
                    className="np-btn np-btn--icon"
                    aria-label={m.uploadAria}
                    title={m.uploadAria}
                    onClick={() => uploadRef.current?.click()}
                  >
                    <Icon name="file" size={14} />
                  </button>
                </>
              }
            />
          )}
          <section className="np-panel pane" aria-label={m.originalAria}>
            <div className="np-panel__head">
              <div className="pane__title">
                <input
                  key={file.id}
                  className="file-input"
                  aria-label={m.fileName}
                  defaultValue={file.path}
                  maxLength={LIMITS.path}
                  placeholder={defaultFileName(file.language)}
                  onBlur={(e) => {
                    const path = e.target.value.trim().replace(/^\/+/, '');
                    if (path === file.path) return;
                    const taken = new Set(draft.files.filter((f) => f.id !== file.id).map(filePath));
                    const finalPath = path ? uniquePath(path, taken) : multi ? filePath(file) : '';
                    e.target.value = finalPath;
                    const byExt = languageFromFileName(finalPath);
                    rename(file, finalPath, byExt && byExt !== file.language ? { language: byExt } : {});
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                />
                <span className="np-file__meta">
                  {file.raw ? t().plural.lines(rawLines) : m.original}
                </span>
              </div>
              <div className="pane__actions">
                {!multi && uploadButton(m.uploadZip)}
                {!multi && (
                  <button type="button" className="np-btn np-btn--ghost np-btn--sm" onClick={addFile}>
                    <Icon name="plus" />
                    {m.addFile}
                  </button>
                )}
                {!multi && SAMPLES[file.language] && (
                  <button
                    type="button"
                    className="np-btn np-btn--ghost np-btn--sm"
                    onClick={() => patchFile(file.id, { raw: SAMPLES[file.language] })}
                  >
                    {m.loadExample}
                  </button>
                )}
                <button
                  type="button"
                  className="np-btn np-btn--ghost np-btn--sm"
                  disabled={!file.raw}
                  onClick={() => patchFile(file.id, { raw: '' })}
                >
                  {m.clear}
                </button>
              </div>
            </div>
            <textarea
              key={file.id}
              className="code-input"
              aria-label={m.codeAria}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              value={file.raw}
              onChange={(e) => patchFile(file.id, { raw: e.target.value })}
              onPaste={onPaste}
              onKeyDown={onTab}
              placeholder={multi ? m.pasteFilePlaceholder : m.pastePlaceholder}
              autoFocus={!file.raw && !multi}
            />
          </section>

          <section className="np-panel pane" aria-label={m.formattedAria}>
            <div className="np-panel__head">
              <div className="pane__title">
                <Seg
                  onBg
                  label={m.previewMode}
                  value={view}
                  onChange={setView}
                  items={[
                    { id: 'formatted', label: m.formatted },
                    { id: 'diff', label: m.diff },
                  ]}
                />
                <span className="np-file__meta">
                  {fmtCode
                    ? view === 'diff'
                      ? changed
                        ? m.linesChanged(changed)
                        : m.noChanges
                      : t().plural.lines(fmtLineArr.length)
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
                  {fm.parseNote}{' '}
                  <span className="pane-note__detail">{result.error}</span>
                </span>
              </div>
            )}
            {!fmtCode ? (
              <div className="pane-empty">
                <Icon name="lines" size={28} />
                <p className="pane-empty__title">{m.emptyTitle}</p>
                <p className="pane-empty__text">{m.emptyText}</p>
                {!multi && !file.raw && uploadButton(m.uploadAny, 'np-btn np-btn--secondary')}
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
              ? m.tooLong(filePath(tooLong), LIMITS.lines)
              : published
                ? m.nextPublished
                : multi
                  ? m.nextMulti(draft.files.length)
                  : m.nextSingle}
          </p>
          <button
            type="button"
            className="np-btn np-btn--primary np-btn--lg"
            disabled={!hasCode || !!tooLong || !!starting || (!multi && (!result || pending))}
            onClick={start}
          >
            {starting ?? (published ? m.backToReview : m.startReview)}
            {!starting && <Icon name="arrow-right" />}
          </button>
        </div>
        {footer}
      </main>
    </div>
  );
}
