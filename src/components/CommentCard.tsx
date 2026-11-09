import { useMemo, useState, type KeyboardEvent } from 'react';

import type { Comment, Reply } from '../../shared/types.ts';
import { highlight } from '../lib/highlight.ts';
import { useCopy } from '../lib/hooks.tsx';
import { lineLabel } from '../lib/text.ts';
import { Toks } from './CodeView.tsx';
import { Prose, SeverityBadge } from './controls.tsx';
import { Icon } from './Icon.tsx';

export function SuggestedChange({
  code,
  langId,
  canCopy,
}: {
  code: string;
  langId: string;
  canCopy: boolean;
}) {
  const lines = useMemo(() => highlight(code, langId), [code, langId]);
  const { copied, copy } = useCopy();
  return (
    <div className="np-sug">
      <div className="np-sug__head">
        <span className="sug-title">
          <Icon name="code" size={14} />
          Suggested change
        </span>
        {canCopy && (
          <button
            type="button"
            className="np-btn np-btn--ghost np-btn--sm"
            onClick={() => copy(code, 'sug')}
          >
            <Icon name={copied ? 'check' : 'copy'} />
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      <div className="np-sug__body">
        {lines.map((toks, i) => (
          <div key={i} className="np-line">
            <span className="np-line__sign" aria-hidden="true">
              +
            </span>
            <span className="np-line__text">
              <Toks toks={toks} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface CommentCardProps {
  comment: Comment;
  langId: string;
  mode: 'mentor' | 'mentee';
  /** Mentor's display name, for the mentee view. */
  reviewer: string;
  flush?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  canResolve?: boolean;
  onToggleResolved?: () => void;
  canReply?: boolean;
  onReply?: (text: string) => Promise<boolean>;
  isOwnReply?: (r: Reply) => boolean;
}

export function CommentCard({
  comment: c,
  langId,
  mode,
  reviewer,
  flush,
  onEdit,
  onDelete,
  canResolve,
  onToggleResolved,
  canReply,
  onReply,
  isOwnReply,
}: CommentCardProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const isPraise = c.severity === 'praise';
  const where = lineLabel(c.line, c.endLine);
  const who = mode === 'mentor' ? 'You' : reviewer.trim() || 'Your mentor';

  const send = async () => {
    const text = draft.trim();
    if (!text || !onReply || sending) return;
    setSending(true);
    const ok = await onReply(text);
    setSending(false);
    if (ok) setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const replyWho = (r: Reply) => {
    if (mode === 'mentor') return r.author === 'mentor' ? 'You' : 'Mentee';
    if (r.author === 'mentor') return reviewer.trim() || 'Mentor';
    return isOwnReply?.(r) ? 'You' : 'Mentee';
  };

  return (
    <article
      className={`np-card${flush ? ' np-card--flush' : ''}`}
      data-resolved={mode === 'mentee' && c.resolved ? 'true' : undefined}
      aria-label={`${c.severity} comment on ${where}`}
    >
      <div className="np-card__head">
        <div className="np-card__who">
          <SeverityBadge severity={c.severity} />
          <span>
            {who} · {where}
          </span>
          {mode === 'mentor' && c.resolved && (
            <span className="fixed-mark">
              <Icon name="check" size={12} />
              Fixed by mentee
            </span>
          )}
        </div>
        {mode === 'mentor' ? (
          <div className="np-card__actions">
            <button
              type="button"
              className="np-btn np-btn--icon"
              onClick={onEdit}
              aria-label={`Edit the comment on ${where}`}
              title="Edit"
            >
              <Icon name="pencil" />
            </button>
            <button
              type="button"
              className="np-btn np-btn--icon"
              onClick={onDelete}
              aria-label={`Delete the comment on ${where}`}
              title="Delete"
            >
              <Icon name="trash" />
            </button>
          </div>
        ) : (
          !isPraise &&
          canResolve && (
            <button
              type="button"
              className={`np-btn np-btn--sm ${c.resolved ? 'np-btn--done' : 'np-btn--primary'}`}
              aria-pressed={c.resolved}
              onClick={onToggleResolved}
            >
              <Icon name="check" />
              {c.resolved ? 'Fixed · undo' : 'Mark as fixed'}
            </button>
          )
        )}
      </div>
      <p className="np-card__body">
        <Prose text={c.text} />
      </p>
      {c.suggestion && (
        <SuggestedChange code={c.suggestion} langId={langId} canCopy />
      )}
      {c.replies.length > 0 && (
        <div className="np-replies">
          {c.replies.map((r) => {
            const name = replyWho(r);
            return (
              <div key={r.id} className="np-reply">
                <span className="np-avatar" aria-hidden="true">
                  {name.slice(0, 1).toUpperCase()}
                </span>
                <div className="reply-body">
                  <div className="np-label">{name}</div>
                  <div className="reply-text">
                    <Prose text={r.text} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {canReply && onReply && (
        <div className="np-card__footer">
          <input
            className="np-input"
            type="text"
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            aria-label={`Reply to the comment on ${where}`}
            placeholder={mode === 'mentor' ? 'Reply to your mentee…' : 'Reply or ask a question…'}
          />
          <button
            type="button"
            className={`np-btn ${draft.trim() ? 'np-btn--primary' : 'np-btn--secondary'}`}
            disabled={!draft.trim() || sending}
            onClick={send}
          >
            Reply
          </button>
        </div>
      )}
    </article>
  );
}
