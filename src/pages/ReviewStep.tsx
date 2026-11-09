// Step 2: comment line by line, write the summary, set up the share link.

import { useCallback, useMemo, useState, type MouseEvent, type ReactNode } from 'react';

import { EXPIRIES, LIMITS, SEVERITIES, VERDICTS, type Comment } from '../../shared/types.ts';
import { CodeView, lineClasses } from '../components/CodeView.tsx';
import { CommentCard } from '../components/CommentCard.tsx';
import { Composer, type ComposerValue } from '../components/Composer.tsx';
import { Header } from '../components/Header.tsx';
import { Icon } from '../components/Icon.tsx';
import { Seg, Steps, Switch } from '../components/controls.tsx';
import { defaultFileName, type Draft } from '../lib/draft.ts';
import { highlight } from '../lib/highlight.ts';
import { language } from '../lib/languages.ts';
import {
  EXPIRY_LABEL,
  excerpt,
  expiryText,
  plural,
  SEVERITY,
  shortId,
  VERDICT,
} from '../lib/text.ts';

interface Cmp {
  line: number;
  endLine: number;
  anchor: number;
  editId?: string;
}

export type Status = 'draft' | 'published' | 'dirty';

export function scrollToLine(n: number) {
  const el = document.getElementById(`line-${n}`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function ReviewStep({
  draft,
  patch,
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
  const lang = language(draft.language);
  const codeLines = useMemo(() => draft.code.split('\n'), [draft.code]);
  const hl = useMemo(() => highlight(draft.code, draft.language), [draft.code, draft.language]);
  const fileName = draft.fileName.trim() || defaultFileName(draft.language);

  const byRank = (a: Comment, b: Comment) =>
    SEVERITY[a.severity].rank - SEVERITY[b.severity].rank;

  const onNum = useCallback(
    (n: number, e: MouseEvent) => {
      setCmp((cur) => {
        if (e.shiftKey && cur && !cur.editId) {
          return { ...cur, line: Math.min(cur.anchor, n), endLine: Math.max(cur.anchor, n) };
        }
        if (cur && !cur.editId && cur.line === n && cur.endLine === n && !cmpHasText) return null;
        if (cmpHasText && !window.confirm('Discard the comment you’re writing?')) return cur;
        return { line: n, endLine: n, anchor: n };
      });
    },
    [cmpHasText],
  );

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
    if (c.replies.length && !window.confirm('This comment has replies. Delete it with the whole thread?')) {
      return;
    }
    patch((d) => ({ comments: d.comments.filter((x) => x.id !== c.id) }));
    if (cmp?.editId === c.id) setCmp(null);
  };

  const classes = useMemo(
    () => lineClasses(codeLines.length, draft.comments, cmp),
    [codeLines.length, draft.comments, cmp],
  );

  const after = useMemo(() => {
    const m = new Map<number, ReactNode>();
    const groups = new Map<number, Comment[]>();
    for (const c of draft.comments) {
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
            langId={draft.language}
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
          key={`${cmp.editId ?? 'new'}-${cmp.anchor}`}
          line={cmp.line}
          endLine={cmp.endLine}
          editing={!!editing}
          initial={
            editing
              ? { severity: editing.severity, text: editing.text, suggestion: editing.suggestion }
              : { severity: 'issue', text: '', suggestion: '' }
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
  }, [draft.comments, draft.language, draft.reviewer, cmp, codeLines, status, onReply]);

  const counts = SEVERITIES.map((s) => ({
    s,
    n: draft.comments.filter((c) => c.severity === s).length,
  }));
  const index = [...draft.comments].sort((a, b) => a.line - b.line || byRank(a, b));
  const menteeReplies = draft.comments.reduce(
    (n, c) => n + c.replies.filter((r) => r.author === 'mentee').length,
    0,
  );
  const actionable = draft.comments.filter((c) => c.severity !== 'praise');
  const fixed = actionable.filter((c) => c.resolved).length;

  const statusPill = {
    draft: { dot: 'var(--text-faint)', label: 'Draft' },
    published: { dot: 'var(--praise)', label: 'Published' },
    dirty: { dot: 'var(--issue)', label: 'Unsaved changes' },
  }[status];

  const publishLabel = status === 'draft' ? 'Publish' : status === 'dirty' ? 'Update link' : 'Share link';
  const onPrimary = status === 'published' ? onShare : onPublish;

  return (
    <div className="page">
      <Header
        crumb={
          <>
            <span className="crumb crumb--strong">{draft.title.trim() || 'Untitled review'}</span>
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
              Edit code
            </button>
            <button
              type="button"
              className="np-btn np-btn--primary"
              onClick={onPrimary}
              disabled={busy}
            >
              <Icon name="link" />
              {busy ? 'Saving…' : publishLabel}
            </button>
          </>
        }
      />
      <div className="container container--wide workspace">
        <section className="np-panel code-panel" aria-label="Code under review">
          <div className="np-panel__head code-panel__head">
            <span className="np-file">
              <Icon name="file" />
              <span className="np-file__name">{fileName}</span>
              <span className="np-file__meta">
                {lang.label} · {plural(codeLines.length, 'line')}
                {draft.formatter ? ` · ${draft.formatter}` : ''}
              </span>
            </span>
            <span className="hint">Click a line number to comment · Shift-click for a range</span>
          </div>
          <CodeView lines={hl} classes={classes} after={after} onNum={onNum} />
        </section>

        <aside className="sidebar" aria-label="Review settings">
          <section className="np-panel np-panel__body">
            <label htmlFor="np-summary" className="np-panel__title">
              Summary
            </label>
            <textarea
              id="np-summary"
              className="np-textarea"
              value={draft.summary}
              maxLength={LIMITS.summary}
              onChange={(e) => patch({ summary: e.target.value })}
              placeholder="Overall impression and what to fix first…"
            />
            <span id="np-verdict-l" className="np-panel__title sidebar__subtitle">
              Verdict
            </span>
            <div role="radiogroup" aria-labelledby="np-verdict-l" className="verdicts">
              {VERDICTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={draft.verdict === v}
                  className={`verdict verdict--${VERDICT[v].badge}`}
                  onClick={() => patch({ verdict: v })}
                >
                  <span className="np-dot" />
                  {VERDICT[v].label}
                </button>
              ))}
            </div>
          </section>

          <section className="np-panel np-panel__body">
            <div className="row-between">
              <h2 className="np-panel__title">Comments</h2>
              <span className="meta">
                {plural(draft.comments.length, 'comment')}
                {status !== 'draft' && actionable.length > 0 && ` · ${fixed}/${actionable.length} fixed`}
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
              <p className="meta">{plural(menteeReplies, 'reply', 'replies')} from your mentee</p>
            )}
            {index.length === 0 ? (
              <p className="muted">No comments yet. Click any line number in the code to leave one.</p>
            ) : (
              <nav aria-label="Jump to comment" className="jump-list">
                {index.map((c) => (
                  <a
                    key={c.id}
                    href={`#line-${c.line}`}
                    className="jump"
                    data-resolved={c.resolved || undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToLine(c.line);
                    }}
                  >
                    <span className="jump__line">{c.endLine > c.line ? `${c.line}–${c.endLine}` : `L${c.line}`}</span>
                    <span className="np-dot" style={{ background: `var(--${c.severity})` }} />
                    <span className="jump__text">{excerpt(c.text, 80)}</span>
                    {c.replies.some((r) => r.author === 'mentee') && (
                      <span className="jump__badge" title="Your mentee replied">
                        <Icon name="reply" size={12} />
                      </span>
                    )}
                  </a>
                ))}
              </nav>
            )}
          </section>

          <section className="np-panel np-panel__body">
            <h2 className="np-panel__title">Share link</h2>
            <div className="np-field">
              <label htmlFor="np-reviewer" className="np-label">
                Signed as
              </label>
              <input
                id="np-reviewer"
                className="np-input"
                type="text"
                value={draft.reviewer}
                maxLength={LIMITS.reviewer}
                onChange={(e) => patch({ reviewer: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="np-field">
              <span id="np-exp-l" className="np-label">
                Link expires
              </span>
              <Seg
                fill
                onBg
                labelledBy="np-exp-l"
                value={draft.expiry}
                onChange={(expiry) => patch({ expiry })}
                items={EXPIRIES.map((e) => ({ id: e, label: EXPIRY_LABEL[e] }))}
              />
              {status !== 'draft' && <span className="meta">{expiryText(expiresAt)}</span>}
            </div>
            <div>
              <Switch checked={draft.allowResolve} onChange={(allowResolve) => patch({ allowResolve })}>
                Mentee can mark comments as fixed
              </Switch>
              <Switch checked={draft.allowReplies} onChange={(allowReplies) => patch({ allowReplies })}>
                Mentee can reply to comments
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
                ? 'Saving…'
                : status === 'draft'
                  ? 'Publish review'
                  : status === 'dirty'
                    ? 'Update link'
                    : 'Show share link'}
            </button>
            <p className="fineprint">
              No accounts. Anyone with the share link can read the review. Only the private edit
              link can change it.
            </p>
            {onDelete && (
              <button type="button" className="np-btn np-btn--ghost np-btn--sm danger" onClick={onDelete}>
                <Icon name="trash" />
                Delete review
              </button>
            )}
          </section>
          <p className="kbd-help">
            Tip: <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd> saves a comment, <kbd>Esc</kbd>{' '}
            cancels. Shift-click a second line number to comment on a range.
          </p>
        </aside>
      </div>
    </div>
  );
}
