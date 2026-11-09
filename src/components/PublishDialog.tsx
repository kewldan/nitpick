import { useEffect, useRef } from 'react';

import type { Draft } from '../lib/draft.ts';
import { useCopy } from '../lib/hooks.tsx';
import { expiryText, plural, VERDICT } from '../lib/text.ts';
import { Icon } from './Icon.tsx';

export function shareUrl(id: string) {
  return `${location.origin}/${id}`;
}
export function editUrl(id: string, key: string) {
  return `${location.origin}/e/${id}#key=${key}`;
}

function LinkValue({ url, muted }: { url: string; muted?: boolean }) {
  const m = /^(https?:\/\/)(.*)$/.exec(url);
  return (
    <div className="np-linkfield__value">
      <span className="np-linkfield__scheme">{m?.[1] ?? ''}</span>
      <span style={muted ? { color: 'var(--text-muted)' } : undefined}>{m?.[2] ?? url}</span>
    </div>
  );
}

export function menteeMessage(d: Draft, url: string) {
  const title = d.title.trim() || 'your code';
  const blockers = d.comments.filter((c) => c.severity === 'blocker').length;
  const quoted = d.title.trim() ? `“${title}”` : title;
  return (
    `I reviewed ${quoted}: ${plural(d.comments.length, 'comment')}` +
    (blockers ? `, ${plural(blockers, 'blocker')}` : '') +
    '. ' +
    (blockers ? 'Start with the blockers' : 'Go through them top to bottom') +
    (d.allowResolve ? ' and tick things off as you fix them.' : '.') +
    `\n${url}`
  );
}

export function PublishDialog({
  kind,
  id,
  editKey,
  draft,
  expiresAt,
  onClose,
  onOpenMentee,
}: {
  kind: 'published' | 'updated' | 'share';
  id: string;
  editKey: string;
  draft: Draft;
  expiresAt: string | null;
  onClose: () => void;
  onOpenMentee: () => void;
}) {
  const { copied, copy } = useCopy();
  const share = shareUrl(id);
  const edit = editUrl(id, editKey);
  const message = menteeMessage(draft, share);
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const title =
    kind === 'published' ? 'Review published' : kind === 'updated' ? 'Link updated' : 'Share this review';
  const sub = [
    plural(draft.comments.length, 'comment'),
    VERDICT[draft.verdict].label,
    expiryText(expiresAt),
  ].join(' · ');

  return (
    <div
      className="np-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="np-dialog" role="dialog" aria-modal="true" aria-labelledby="pd-title">
        <div className="np-dialog__head">
          <span className="np-success-mark" aria-hidden="true">
            <Icon name={kind === 'share' ? 'link' : 'check'} size={16} strokeWidth={2} />
          </span>
          <div className="grow">
            <h2 className="np-dialog__title" id="pd-title">
              {title}
            </h2>
            <p className="np-dialog__sub">{sub}</p>
          </div>
          <button type="button" className="np-btn np-btn--icon" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="np-dialog__body">
          {kind === 'updated' && (
            <p className="dialog-note">
              Same link as before. Your mentee sees the changes when they reload the page.
            </p>
          )}
          <div className="np-field">
            <span className="np-label">Share link — send this to your mentee</span>
            <div className="np-linkfield">
              <LinkValue url={share} />
              <button
                ref={firstButton}
                type="button"
                className="np-btn np-btn--primary np-btn--xl"
                onClick={() => copy(share, 'share')}
              >
                <Icon name={copied === 'share' ? 'check' : 'copy'} />
                {copied === 'share' ? 'Copied' : 'Copy link'}
              </button>
            </div>
          </div>
          <div className="np-field">
            <span className="np-label label-icon">
              <Icon name="lock" size={13} />
              Private edit link — keep it to yourself, it’s your only way back in
            </span>
            <div className="np-linkfield np-linkfield--private">
              <LinkValue url={edit} muted />
              <button
                type="button"
                className="np-btn np-btn--secondary np-btn--xl"
                onClick={() => copy(edit, 'edit')}
              >
                {copied === 'edit' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="np-field">
            <div className="row-between">
              <span className="np-label">Message to paste in Telegram</span>
              <button
                type="button"
                className="np-btn np-btn--secondary np-btn--sm"
                onClick={() => copy(message, 'msg')}
              >
                {copied === 'msg' ? 'Copied' : 'Copy message'}
              </button>
            </div>
            <div className="message-box">{message}</div>
          </div>
        </div>
        <div className="np-dialog__foot">
          <button type="button" className="np-btn np-btn--secondary" onClick={onClose}>
            Keep editing
          </button>
          <button type="button" className="np-btn np-btn--primary" onClick={onOpenMentee}>
            Open mentee view
            <Icon name="external" />
          </button>
        </div>
      </div>
    </div>
  );
}
