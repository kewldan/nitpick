import { useEffect, useRef } from 'react';

import type { Draft } from '../lib/draft.ts';
import { useCopy } from '../lib/hooks.tsx';
import { t } from '../i18n/index.ts';
import { expiryText, verdict } from '../lib/text.ts';
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
  const blockers = d.comments.filter((c) => c.severity === 'blocker').length;
  return t().dialog.message(d.title.trim(), d.comments.length, blockers, d.allowResolve, url);
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

  const m = t().dialog;
  const title = kind === 'published' ? m.published : kind === 'updated' ? m.updated : m.share;
  const sub = [
    t().plural.comments(draft.comments.length),
    verdict(draft.verdict).label,
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
          <button type="button" className="np-btn np-btn--icon" aria-label={m.close} onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="np-dialog__body">
          {kind === 'updated' && (
            <p className="dialog-note">
              {m.sameLink}
            </p>
          )}
          <div className="np-field">
            <span className="np-label">{m.shareLabel}</span>
            <div className="np-linkfield">
              <LinkValue url={share} />
              <button
                ref={firstButton}
                type="button"
                className="np-btn np-btn--primary np-btn--xl"
                onClick={() => copy(share, 'share')}
              >
                <Icon name={copied === 'share' ? 'check' : 'copy'} />
                {copied === 'share' ? t().common.copied : m.copyLink}
              </button>
            </div>
          </div>
          <div className="np-field">
            <span className="np-label label-icon">
              <Icon name="lock" size={13} />
              {m.editLabel}
            </span>
            <div className="np-linkfield np-linkfield--private">
              <LinkValue url={edit} muted />
              <button
                type="button"
                className="np-btn np-btn--secondary np-btn--xl"
                onClick={() => copy(edit, 'edit')}
              >
                {copied === 'edit' ? t().common.copied : t().common.copy}
              </button>
            </div>
          </div>
          <div className="np-field">
            <div className="row-between">
              <span className="np-label">{m.messageLabel}</span>
              <button
                type="button"
                className="np-btn np-btn--secondary np-btn--sm"
                onClick={() => copy(message, 'msg')}
              >
                {copied === 'msg' ? t().common.copied : m.copyMessage}
              </button>
            </div>
            <div className="message-box">{message}</div>
          </div>
        </div>
        <div className="np-dialog__foot">
          <button type="button" className="np-btn np-btn--secondary" onClick={onClose}>
            {m.keepEditing}
          </button>
          <button type="button" className="np-btn np-btn--primary" onClick={onOpenMentee}>
            {m.openMentee}
            <Icon name="external" />
          </button>
        </div>
      </div>
    </div>
  );
}
