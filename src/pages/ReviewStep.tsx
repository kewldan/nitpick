// Step 2: comment line by line, write the summary, set up the share link.

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';

import { EXPIRIES, LIMITS, SEVERITIES, VERDICTS, type Comment } from '../../shared/types.ts';
import { CodeView, lineClasses } from '../components/CodeView.tsx';
import { CommentCard } from '../components/CommentCard.tsx';
import { Composer, type ComposerValue } from '../components/Composer.tsx';
import { ContextMenu } from '../components/ContextMenu.tsx';
import { FileTree, fileStats } from '../components/FileTree.tsx';
import { Header } from '../components/Header.tsx';
import { Icon } from '../components/Icon.tsx';
import { Seg, Steps, Switch } from '../components/controls.tsx';
import { filePath, type Draft } from '../lib/draft.ts';
import { highlight } from '../lib/highlight.ts';
import { language } from '../lib/languages.ts';
import { t } from '../i18n/index.ts';
import { AS_PASTED, formatterName } from '../lib/format.ts';
import { languageName } from '../lib/languages.ts';
import { excerpt, expiryText, SEVERITY, shortId, verdict } from '../lib/text.ts';

interface Cmp {
  line: number;
  endLine: number;
  anchor: number;
  editId?: string;
  /** Prefilled values when opened from the right-click menu. */
  preset?: ComposerValue;
  /** Changes on every open, so a new preset remounts the composer. */
  nonce?: number;
}

interface Menu {
  x: number;
  y: number;
  line: number;
  endLine: number;
  text: string;
}

/** The code line a DOM node belongs to; null inside comment cards. */
function lineOf(node: Node | null): number | null {
  const el = node instanceof Element ? node : node?.parentElement;
  if (!el || el.closest('.np-card, .np-composer')) return null;
  const anchor = el.closest('.code-anchor');
  const m = anchor ? /^line-(\d+)$/.exec(anchor.id) : null;
  return m ? Number(m[1]) : null;
}

export type Status = 'draft' | 'published' | 'dirty';

export function scrollToLine(n: number) {
  const el = document.getElementById(`line-${n}`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/** Scrolls after the next render, for jumps that also switch files. */
export function scrollToLineSoon(n: number) {
  requestAnimationFrame(() => requestAnimationFrame(() => scrollToLine(n)));
}

export function ReviewStep({
  draft,
  patch,
  selectedId,
  onSelect,
  status,
  busy,
  expiresAt,
  onEditCode,
  onPublish,
  onShare,
  onDelete,
  onReply,
}: {
  draft: Draft;
  patch: (p: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => void;
  selectedId: string;
  onSelect: (id: string) => void;
  status: Status;
  busy: boolean;
  expiresAt: string | null;
  onEditCode: () => void;
  onPublish: () => void;
  onShare: () => void;
  onDelete?: () => void;
  onReply?: (cid: string, text: string) => Promise<boolean>;
}) {
  const [cmp, setCmp] = useState<Cmp | null>(null);
  const [cmpHasText, setCmpHasText] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const m = t().review;
  const files = useMemo(() => draft.files.filter((f) => f.code.trim()), [draft.files]);
  // Until the mentor picks a file, open the one with the most pressing comment.
  const file =
    files.find((f) => f.id === selectedId) ??
    (() => {
      const top = draft.comments
        .filter((c) => !c.resolved && c.severity !== 'praise')
        .sort((a, b) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank)[0];
      return (
        (top && files.find((f) => filePath(f) === top.file)) ??
        files.find((f) => /(^|\/)main\.[^/]+$/.test(filePath(f))) ??
        files[0]
      );
    })();
  const multi = files.length > 1;
  const fileName = filePath(file);
  const lang = language(file.language);
  const codeLines = useMemo(() => file.code.split('\n'), [file.code]);
  const hl = useMemo(() => highlight(file.code, file.language), [file.code, file.language]);
  const fileComments = useMemo(
    () => draft.comments.filter((c) => c.file === fileName),
    [draft.comments, fileName],
  );
  const stats = useMemo(() => fileStats(draft.comments), [draft.comments]);

  // A composer belongs to one file; switching files closes it.
  useEffect(() => {
    setCmp(null);
    setCmpHasText(false);
  }, [file.id]);

  const openFile = (id: string, line?: number) => {
    if (id !== file.id && cmpHasText && !window.confirm(t().common.discardComment)) return;
    onSelect(id);
    if (line) scrollToLineSoon(line);
  };
  const idByPath = new Map(files.map((f) => [filePath(f), f.id]));

  const byRank = (a: Comment, b: Comment) =>
    SEVERITY[a.severity].rank - SEVERITY[b.severity].rank;

  const onNum = useCallback(
    (n: number, e: MouseEvent) => {
      setCmp((cur) => {
        if (e.shiftKey && cur && !cur.editId) {
          return { ...cur, line: Math.min(cur.anchor, n), endLine: Math.max(cur.anchor, n) };
        }
        if (cur && !cur.editId && cur.line === n && cur.endLine === n && !cmpHasText) return null;
        if (cmpHasText && !window.confirm(t().common.discardComment)) return cur;
        return { line: n, endLine: n, anchor: n };
      });
    },
    [cmpHasText],
  );

  /** Right-click on a selection (or a line) offers to comment on it. */
  const onContextMenu = (e: MouseEvent) => {
    const sel = window.getSelection();
    const root = codeRef.current;
    let line: number | null = null;
    let end: number | null = null;
    let text = '';
    if (sel && !sel.isCollapsed && root?.contains(sel.anchorNode) && root.contains(sel.focusNode)) {
      const range = sel.getRangeAt(0);
      line = lineOf(range.startContainer);
      end = lineOf(range.endContainer);
      // A selection that ends at the very start of a line doesn't include it.
      if (line && end && end > line && range.endOffset === 0) end--;
      text = sel.toString();
    } else {
      line = end = lineOf(e.target as Node);
    }
    if (!line || !end) return;
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, line: Math.min(line, end), endLine: Math.max(line, end), text });
  };

  const openFromMenu = (mn: Menu, preset: ComposerValue) => {
    if (cmpHasText && !window.confirm(t().common.discardComment)) return;
    setCmp({ line: mn.line, endLine: mn.endLine, anchor: mn.line, preset, nonce: Date.now() });
  };

  const menuNode = menu && (() => {
    const fragment = menu.text.trim();
    // A short piece of one line is quoted into the comment as inline code.
    const quote =
      fragment && !fragment.includes('\n') && !fragment.includes('`') && fragment.length <= 80
        ? `\`${fragment}\` `
        : '';
    const range = codeLines.slice(menu.line - 1, menu.endLine).join('\n');
    const cm = t().contextMenu;
    return (
      <ContextMenu
        x={menu.x}
        y={menu.y}
        title={t().lineTitle(menu.line, menu.endLine)}
        onClose={() => setMenu(null)}
        groups={[
          SEVERITIES.map((s, i) => ({
            key: s,
            icon: <span className="np-dot" style={{ background: `var(--${s})` }} />,
            label: SEVERITY[s].label,
            hint: String(i + 1),
            onSelect: () => openFromMenu(menu, { severity: s, text: quote, suggestion: '' }),
          })),
          [
            {
              key: 'suggest',
              icon: <Icon name="code" size={14} />,
              label: cm.suggestChange,
              onSelect: () =>
                openFromMenu(menu, { severity: 'suggestion', text: quote, suggestion: range }),
            },
            ...(fragment
              ? [
                  {
                    key: 'copy',
                    icon: <Icon name="copy" size={14} />,
                    label: t().common.copy,
                    onSelect: () => navigator.clipboard?.writeText(menu.text).catch(() => {}),
                  },
                ]
              : []),
          ],
        ]}
      />
    );
  })();

  const save = (v: ComposerValue) => {
    if (!cmp) return;
    patch((d) => ({
      comments: cmp.editId
        ? d.comments.map((c) =>
            c.id === cmp.editId ? { ...c, ...v, line: cmp.line, endLine: cmp.endLine } : c,
          )
        : [
            ...d.comments,
            {
              id: shortId(),
              file: fileName,
              line: cmp.line,
              endLine: cmp.endLine,
              ...v,
              resolved: false,
              replies: [],
            },
          ],
    }));
    setCmp(null);
    setCmpHasText(false);
  };

  const remove = (c: Comment) => {
    if (c.replies.length && !window.confirm(m.deleteWithReplies)) {
      return;
    }
    patch((d) => ({ comments: d.comments.filter((x) => x.id !== c.id) }));
    if (cmp?.editId === c.id) setCmp(null);
  };

  const classes = useMemo(
    () => lineClasses(codeLines.length, fileComments, cmp),
    [codeLines.length, fileComments, cmp],
  );

  const after = useMemo(() => {
    const m = new Map<number, ReactNode>();
    const groups = new Map<number, Comment[]>();
    for (const c of fileComments) {
      if (cmp?.editId === c.id) continue;
      const end = Math.min(c.endLine, codeLines.length);
      groups.set(end, [...(groups.get(end) ?? []), c]);
    }
    for (const [end, list] of groups) {
      m.set(
        end,
        list.sort(byRank).map((c) => (
          <CommentCard
            key={c.id}
            comment={c}
            langId={file.language}
            mode="mentor"
            reviewer={draft.reviewer}
            onEdit={() => {
              setCmp({ line: c.line, endLine: c.endLine, anchor: c.line, editId: c.id });
            }}
            onDelete={() => remove(c)}
            canReply={status !== 'draft' && !!onReply && c.replies.length > 0}
            onReply={onReply ? (text) => onReply(c.id, text) : undefined}
          />
        )),
      );
    }
    if (cmp) {
      const editing = cmp.editId ? draft.comments.find((c) => c.id === cmp.editId) : undefined;
      const node = (
        <Composer
          key={`${cmp.editId ?? 'new'}-${cmp.anchor}-${cmp.nonce ?? 0}`}
          line={cmp.line}
          endLine={cmp.endLine}
          editing={!!editing}
          initial={
            editing
              ? { severity: editing.severity, text: editing.text, suggestion: editing.suggestion }
              : (cmp.preset ?? { severity: 'issue', text: '', suggestion: '' })
          }
          rangeCode={codeLines.slice(cmp.line - 1, cmp.endLine).join('\n')}
          onSave={save}
          onCancel={() => {
            setCmp(null);
            setCmpHasText(false);
          }}
          onChange={setCmpHasText}
        />
      );
      m.set(cmp.endLine, (
        <>
          {m.get(cmp.endLine)}
          {node}
        </>
      ));
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileComments, draft.comments, file.language, draft.reviewer, cmp, codeLines, status, onReply]);

  const counts = SEVERITIES.map((s) => ({
    s,
    n: draft.comments.filter((c) => c.severity === s).length,
  }));
  const order = new Map(files.map((f, i) => [filePath(f), i]));
  const index = [...draft.comments].sort(
    (a, b) =>
      (order.get(a.file) ?? 0) - (order.get(b.file) ?? 0) || a.line - b.line || byRank(a, b),
  );
  const menteeReplies = draft.comments.reduce(
    (n, c) => n + c.replies.filter((r) => r.author === 'mentee').length,
    0,
  );
  const actionable = draft.comments.filter((c) => c.severity !== 'praise');
  const fixed = actionable.filter((c) => c.resolved).length;

  const statusPill = {
    draft: { dot: 'var(--text-faint)', label: m.status.draft },
    published: { dot: 'var(--praise)', label: m.status.published },
    dirty: { dot: 'var(--issue)', label: m.status.dirty },
  }[status];

  const publishLabel = status === 'draft' ? m.publish : status === 'dirty' ? m.updateLink : m.shareLink;
  const onPrimary = status === 'published' ? onShare : onPublish;

  return (
    <div className="page">
      <Header
        crumb={
          <>
            <span className="crumb crumb--strong">{draft.title.trim() || t().common.untitled}</span>
            <span className="np-badge np-pill np-pill--outline status-pill">
              <span className="np-dot" style={{ background: statusPill.dot }} />
              {statusPill.label}
            </span>
          </>
        }
        middle={<Steps current={status === 'draft' ? 2 : 3} />}
        actions={
          <>
            <button type="button" className="np-btn np-btn--secondary" onClick={onEditCode}>
              <Icon name="arrow-left" />
              {m.editCode}
            </button>
            <button
              type="button"
              className="np-btn np-btn--primary"
              onClick={onPrimary}
              disabled={busy}
            >
              <Icon name="link" />
              {busy ? m.saving : publishLabel}
            </button>
          </>
        }
      />
      <div className={`container container--wide workspace${multi ? ' workspace--tree' : ''}`}>
        {multi && (
          <div className="tree-col">
            <FileTree
              items={files.map((f) => {
                const st = stats.get(filePath(f));
                return {
                  key: f.id,
                  path: filePath(f),
                  count: st?.open,
                  severity: st?.top,
                  done: !!st && st.total > 0 && st.open === 0 && status !== 'draft',
                  warn: f.formatter === AS_PASTED && language(f.language).formatter
                    ? t().formatter.fileWarn
                    : undefined,
                };
              })}
              selected={file.id}
              onSelect={(id) => openFile(id)}
            />
          </div>
        )}
        <section className="np-panel code-panel" aria-label={m.codeAria}>
          <div className="np-panel__head code-panel__head">
            <span className="np-file">
              <Icon name="file" />
              <span className="np-file__name">{fileName}</span>
              <span className="np-file__meta">
                {languageName(lang.id)} · {t().plural.lines(codeLines.length)}
                {file.formatter ? ` · ${formatterName(file.formatter)}` : ''}
              </span>
            </span>
            <span className="hint">{m.clickHint}</span>
          </div>
          <div ref={codeRef} onContextMenu={onContextMenu}>
            <CodeView key={file.id} lines={hl} classes={classes} after={after} onNum={onNum} />
          </div>
        </section>

        <aside className="sidebar" aria-label={m.settingsAria}>
          <section className="np-panel np-panel__body">
            <label htmlFor="np-summary" className="np-panel__title">
              {m.summary}
            </label>
            <textarea
              id="np-summary"
              className="np-textarea"
              value={draft.summary}
              maxLength={LIMITS.summary}
              onChange={(e) => patch({ summary: e.target.value })}
              placeholder={m.summaryPlaceholder}
            />
            <span id="np-verdict-l" className="np-panel__title sidebar__subtitle">
              {m.verdict}
            </span>
            <div role="radiogroup" aria-labelledby="np-verdict-l" className="verdicts">
              {VERDICTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={draft.verdict === v}
                  className={`verdict verdict--${verdict(v).badge}`}
                  onClick={() => patch({ verdict: v })}
                >
                  <span className="np-dot" />
                  {verdict(v).label}
                </button>
              ))}
            </div>
          </section>

          <section className="np-panel np-panel__body">
            <div className="row-between">
              <h2 className="np-panel__title">{m.comments}</h2>
              <span className="meta">
                {t().plural.comments(draft.comments.length)}
                {status !== 'draft' && actionable.length > 0 && m.fixedOf(fixed, actionable.length)}
              </span>
            </div>
            <div className="chips">
              {counts.map(({ s, n }) => (
                <span key={s} className="np-chip-count" data-empty={n === 0 || undefined}>
                  <span className="np-dot" style={{ background: `var(--${s})` }} />
                  {SEVERITY[s].label} <b>{n}</b>
                </span>
              ))}
            </div>
            {status !== 'draft' && menteeReplies > 0 && (
              <p className="meta">{m.menteeReplies(menteeReplies)}</p>
            )}
            {index.length === 0 ? (
              <p className="muted">{m.noComments}</p>
            ) : (
              <nav aria-label={m.jumpAria} className="jump-list">
                {index.map((c, i) => (
                  <div key={c.id} className="jump-group">
                  {multi && index[i - 1]?.file !== c.file && (
                    <span className="jump__file mono">{c.file}</span>
                  )}
                  <a
                    href={`#line-${c.line}`}
                    className="jump"
                    data-resolved={c.resolved || undefined}
                    aria-current={c.file === fileName && multi ? 'true' : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      const id = idByPath.get(c.file);
                      if (id && id !== file.id) openFile(id, c.line);
                      else scrollToLine(c.line);
                    }}
                  >
                    <span className="jump__line">{c.endLine > c.line ? `${c.line}–${c.endLine}` : `L${c.line}`}</span>
                    <span className="np-dot" style={{ background: `var(--${c.severity})` }} />
                    <span className="jump__text">{excerpt(c.text, 80)}</span>
                    {c.replies.some((r) => r.author === 'mentee') && (
                      <span className="jump__badge" title={m.menteeReplied}>
                        <Icon name="reply" size={12} />
                      </span>
                    )}
                  </a>
                  </div>
                ))}
              </nav>
            )}
          </section>

          <section className="np-panel np-panel__body">
            <h2 className="np-panel__title">{m.shareTitle}</h2>
            <div className="np-field">
              <label htmlFor="np-reviewer" className="np-label">
                {m.signedAs}
              </label>
              <input
                id="np-reviewer"
                className="np-input"
                type="text"
                value={draft.reviewer}
                maxLength={LIMITS.reviewer}
                onChange={(e) => patch({ reviewer: e.target.value })}
                placeholder={m.yourName}
              />
            </div>
            <div className="np-field">
              <span id="np-exp-l" className="np-label">
                {m.linkExpires}
              </span>
              <Seg
                fill
                onBg
                labelledBy="np-exp-l"
                value={draft.expiry}
                onChange={(expiry) => patch({ expiry })}
                items={EXPIRIES.map((e) => ({ id: e, label: t().expiry.options[e] }))}
              />
              {status !== 'draft' && <span className="meta">{expiryText(expiresAt)}</span>}
            </div>
            <div>
              <Switch checked={draft.allowResolve} onChange={(allowResolve) => patch({ allowResolve })}>
                {m.allowResolve}
              </Switch>
              <Switch checked={draft.allowReplies} onChange={(allowReplies) => patch({ allowReplies })}>
                {m.allowReplies}
              </Switch>
            </div>
            <button
              type="button"
              className="np-btn np-btn--primary np-btn--xl np-btn--block"
              onClick={onPrimary}
              disabled={busy}
            >
              <Icon name="link" />
              {busy
                ? m.saving
                : status === 'draft'
                  ? m.publishReview
                  : status === 'dirty'
                    ? m.updateLink
                    : m.showShareLink}
            </button>
            <p className="fineprint">{m.fineprint}</p>
            {onDelete && (
              <button type="button" className="np-btn np-btn--ghost np-btn--sm danger" onClick={onDelete}>
                <Icon name="trash" />
                {m.deleteReview}
              </button>
            )}
          </section>
          <p className="kbd-help">
            {m.tip[0]} <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd> {m.tip[1]} <kbd>Esc</kbd>{' '}
            {m.tip[2]}
          </p>
        </aside>
      </div>
      {menuNode}
    </div>
  );
}
