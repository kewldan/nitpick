// The mentor's published reviews, remembered in this browser, with the
// mentee's progress pulled from the server.

import { useEffect, useState } from 'react';

import type { ReviewStatus } from '../../shared/types.ts';
import { api } from '../lib/api.ts';
import { navigate, useCopy } from '../lib/hooks.tsx';
import { storage, type SavedReview } from '../lib/storage.ts';
import { expiryText, plural, relativeTime, VERDICT } from '../lib/text.ts';
import { Icon } from './Icon.tsx';
import { shareUrl } from './PublishDialog.tsx';

export function ReviewsList() {
  const [saved, setSaved] = useState<SavedReview[]>(() => storage.reviews());
  const [status, setStatus] = useState<Map<string, ReviewStatus>>(new Map());
  const { copied, copy } = useCopy();

  useEffect(() => {
    if (!saved.length) return;
    api
      .status(saved.slice(0, 100).map((r) => r.id))
      .then((list) => setStatus(new Map(list.map((s) => [s.id, s]))))
      .catch(() => {});
  }, [saved.length]);

  if (!saved.length) return null;

  const forget = (id: string) => {
    const ok = window.confirm(
      'Remove this review from the list? It stays online, but you’ll need its edit link to change it again.',
    );
    if (!ok) return;
    storage.forgetReview(id);
    setSaved(storage.reviews());
  };

  return (
    <section className="np-panel reviews" aria-labelledby="reviews-title">
      <div className="np-panel__head">
        <h2 id="reviews-title" className="np-panel__title">
          Your reviews
        </h2>
        <span className="np-file__meta">Saved in this browser</span>
      </div>
      <ul className="reviews__list">
        {saved.map((r) => {
          const s = status.get(r.id);
          const gone = s?.missing || s?.expired;
          const edit = `/e/${r.id}#key=${r.editKey}`;
          return (
            <li key={r.id} className="reviews__item" data-gone={gone || undefined}>
              <a
                href={edit}
                className="reviews__main"
                onClick={(e) => {
                  if (gone || e.metaKey || e.ctrlKey) return;
                  e.preventDefault();
                  navigate(edit);
                }}
              >
                <span className="reviews__title">{s?.title || r.title || 'Untitled review'}</span>
                <span className="reviews__meta">
                  <span className="mono">/{r.id}</span>
                  {s && !gone && (
                    <>
                      <span>·</span>
                      <span>{VERDICT[s.verdict].label}</span>
                      <span>·</span>
                      <span>
                        {s.actionable ? `${s.fixed}/${s.actionable} fixed` : plural(s.total, 'comment')}
                      </span>
                      {s.replies > 0 && (
                        <>
                          <span>·</span>
                          <span className="reviews__replies">
                            {plural(s.replies, 'reply', 'replies')}
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span>{expiryText(s.expiresAt)}</span>
                    </>
                  )}
                  {gone && <span>· {s?.expired ? 'Expired' : 'Deleted'}</span>}
                  {!s && <span>· {relativeTime(r.createdAt)}</span>}
                </span>
              </a>
              {s && !gone && s.actionable > 0 && (
                <div className="np-progress reviews__progress" aria-hidden="true">
                  <div
                    className="np-progress__bar"
                    style={{ width: `${Math.round((s.fixed / s.actionable) * 100)}%` }}
                  />
                </div>
              )}
              <div className="reviews__actions">
                {!gone && (
                  <button
                    type="button"
                    className="np-btn np-btn--ghost np-btn--sm"
                    onClick={() => copy(shareUrl(r.id), r.id)}
                  >
                    <Icon name={copied === r.id ? 'check' : 'copy'} />
                    {copied === r.id ? 'Copied' : 'Copy link'}
                  </button>
                )}
                <button
                  type="button"
                  className="np-btn np-btn--icon"
                  aria-label={`Remove “${r.title || r.id}” from this list`}
                  title="Remove from list"
                  onClick={() => forget(r.id)}
                >
                  <Icon name="close" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
