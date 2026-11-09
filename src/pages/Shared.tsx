// The mentee's page at /:id: the summary, the code with comments, a checklist
// and progress. No account; ticks and replies are saved on the server.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Comment, Review } from '../../shared/types.ts';
import { CodeView, lineClasses } from '../components/CodeView.tsx';
import { CommentCard } from '../components/CommentCard.tsx';
import { Header } from '../components/Header.tsx';
import { Icon } from '../components/Icon.tsx';
import { Pill, Seg } from '../components/controls.tsx';
import { ApiError, api } from '../lib/api.ts';
import { highlight } from '../lib/highlight.ts';
import { language } from '../lib/languages.ts';
import { navigate, useCopy, useRefresh, useToast } from '../lib/hooks.tsx';
import { storage } from '../lib/storage.ts';
import {
  excerpt,
  expiryText,
  lineLabel,
  plural,
  SEVERITY,
  VERDICT,
} from '../lib/text.ts';
import { ErrorPage, LoadingPage } from './ErrorPage.tsx';
import { scrollToLine } from './ReviewStep.tsx';
import { SEVERITIES } from '../../shared/types.ts';

type Filter = 'all' | 'open' | 'fixed';

export function Shared({ id }: { id: string }) {
  const toast = useToast();
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [mine, setMine] = useState(() => new Set(storage.menteeReplies()));
  const { copied, copy } = useCopy();
  const mentorKey = storage.keyFor(id);

  const fetchReview = useCallback(() => {
    api
      .get(id)
      .then((r) => {
        setReview(r);
        setError(null);
      })
      .catch((e: ApiError) => {
        if (e.status) setError(e);
      });
  }, [id]);

  useEffect(() => {
    setReview(null);
    setError(null);
    fetchReview();
  }, [fetchReview]);
  useRefresh(fetchReview, 60_000, !!review);

  useEffect(() => {
    if (review) document.title = `${review.title || 'Code review'} · Nitpick`;
    return () => {
      document.title = 'Nitpick';
    };
  }, [review?.title]);

  // Jump to a line from a #line-N link once the code is on screen.
  useEffect(() => {
    const m = /^#line-(\d+)$/.exec(location.hash);
    if (review && m) requestAnimationFrame(() => scrollToLine(Number(m[1])));
  }, [!!review]);

  const lines = useMemo(
    () => (review ? highlight(review.code, review.language) : []),
    [review?.code, review?.language],
  );

  const replace = (c: Comment) =>
    setReview((r) => r && { ...r, comments: r.comments.map((x) => (x.id === c.id ? c : x)) });

  const toggle = async (c: Comment) => {
    const next = !c.resolved;
    replace({ ...c, resolved: next });
    try {
      replace(await api.resolve(id, c.id, next, mentorKey));
    } catch (err) {
      replace(c);
      toast(err instanceof Error ? err.message : 'Could not save');
    }
  };

  const reply = async (c: Comment, text: string) => {
    try {
      const updated = await api.reply(id, c.id, text, mentorKey);
      const last = updated.replies[updated.replies.length - 1];
      if (last && last.author === 'mentee') {
        storage.addMenteeReply(last.id);
        setMine(new Set(storage.menteeReplies()));
      }
      replace(updated);
      return true;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not send the reply');
      return false;
    }
  };

  if (error) {
    return (
      <ErrorPage
        title={error.expired ? 'This review has expired' : error.status === 404 ? 'Review not found' : 'Something went wrong'}
        text={
          error.expired
            ? 'The link was set to expire, so the review is gone. Ask your mentor for a new one.'
            : error.status === 404
              ? 'Check the link, or ask your mentor to send it again.'
              : error.message
        }
      />
    );
  }
  if (!review) return <LoadingPage />;

  const lang = language(review.language);
  const all = review.comments;
  const actionable = all.filter((c) => c.severity !== 'praise');
  const fixed = actionable.filter((c) => c.resolved).length;
  const openN = all.filter((c) => !c.resolved).length;
  const blockersOpen = actionable.filter((c) => c.severity === 'blocker' && !c.resolved).length;
  const pct = actionable.length ? Math.round((fixed / actionable.length) * 100) : 100;
  const byRank = (a: Comment, b: Comment) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank;

  const progressNote = !review.allowResolve
    ? 'Your mentor turned off progress tracking for this review.'
    : actionable.length === 0
      ? 'Nothing to fix. Just read the notes.'
      : fixed === actionable.length
        ? 'All done. Tell your mentor it’s ready for another look.'
        : blockersOpen
          ? blockersOpen === 1
            ? '1 blocker is still open. Start there.'
            : `${blockersOpen} blockers are still open. Start there.`
          : 'Blockers are done. The rest is polish.';

  const visible = all.filter((c) =>
    filter === 'all' ? true : filter === 'open' ? !c.resolved : c.resolved,
  );
  const classes = lineClasses(lines.length, all);
  const after = new Map<number, ReactNode>();
  const groups = new Map<number, Comment[]>();
  for (const c of visible) {
    const end = Math.min(c.endLine, lines.length);
    groups.set(end, [...(groups.get(end) ?? []), c]);
  }
  for (const [end, list] of groups) {
    after.set(
      end,
      list.sort(byRank).map((c) => (
        <CommentCard
          key={c.id}
          comment={c}
          langId={review.language}
          mode="mentee"
          reviewer={review.reviewer}
          canResolve={review.allowResolve}
          onToggleResolved={() => toggle(c)}
          canReply={review.allowReplies}
          onReply={(text) => reply(c, text)}
          isOwnReply={(r) => mine.has(r.id)}
        />
      )),
    );
  }

  const checklist = [...actionable].sort((a, b) => byRank(a, b) || a.line - b.line);
  const verdict = VERDICT[review.verdict];
  const fileName = review.fileName || `main.${lang.ext}`;
  const editHref = mentorKey ? `/e/${id}#key=${mentorKey}` : null;

  return (
    <div className="page">
      <Header
        crumb={<span className="crumb mono">{location.host}/{id}</span>}
        actions={
          <>
            <span className="expiry">
              <Icon name="clock" size={14} />
              {expiryText(review.expiresAt)}
            </span>
            {editHref && (
              <a
                className="np-btn np-btn--secondary"
                href={editHref}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(editHref);
                }}
              >
                <Icon name="pencil" />
                Mentor: edit review
              </a>
            )}
          </>
        }
      />
      <main className="container container--read stack-28 shared">
        {mentorKey && (
          <p className="preview-note" role="note">
            <Icon name="external" size={14} />
            This is what your mentee sees. Ticks and replies you make here are saved for real.
          </p>
        )}
        <section className="shared-hero" aria-labelledby="sh-title">
          <div className="shared-hero__text">
            <div className="shared-hero__meta">
              <Pill tone={verdict.badge}>{verdict.label}</Pill>
              <span>
                {review.reviewer ? `${review.reviewer} reviewed` : 'Review of'} {fileName} · {lang.label}
              </span>
            </div>
            <h1 id="sh-title" className="t-display shared-hero__title">
              {review.title || 'Code review'}
            </h1>
            {review.summary && <p className="t-body-lg shared-hero__summary">{review.summary}</p>}
          </div>
          <div className="np-panel progress-card">
            <div className="row-between">
              <span className="np-panel__title">Your progress</span>
              <span className="mono progress-card__count">
                {actionable.length ? `${fixed} / ${actionable.length} fixed` : '—'}
              </span>
            </div>
            <div
              className="np-progress"
              role="progressbar"
              aria-label="Fixed comments"
              aria-valuemin={0}
              aria-valuemax={actionable.length}
              aria-valuenow={fixed}
            >
              <div className="np-progress__bar" style={{ width: `${pct}%` }} />
            </div>
            <p className="t-caption muted">{progressNote}</p>
          </div>
        </section>

        <div className="workspace">
          <section className="np-panel code-panel" aria-label="Reviewed code">
            <div className="np-panel__head code-panel__head">
              <span className="np-file">
                <Icon name="file" />
                <span className="np-file__name">{fileName}</span>
                <span className="np-file__meta">
                  {lang.label} · {plural(lines.length, 'line')}
                </span>
              </span>
              <div className="code-panel__tools">
                <Seg
                  onBg
                  label="Filter comments"
                  value={filter}
                  onChange={setFilter}
                  items={[
                    { id: 'all', label: `All ${all.length}` },
                    { id: 'open', label: `Open ${openN}` },
                    { id: 'fixed', label: `Fixed ${all.length - openN}` },
                  ]}
                />
                <button
                  type="button"
                  className="np-btn np-btn--secondary"
                  onClick={() => copy(review.code, 'code')}
                >
                  <Icon name={copied === 'code' ? 'check' : 'copy'} />
                  {copied === 'code' ? 'Copied' : 'Copy code'}
                </button>
              </div>
            </div>
            <CodeView lines={lines} classes={classes} after={after} />
          </section>

          <aside className="sidebar sidebar--narrow" aria-label="Checklist">
            <section className="np-panel checklist">
              <div className="row-between checklist__head">
                <h2 className="np-panel__title">Checklist</h2>
                <span className="meta">Blockers first</span>
              </div>
              {checklist.length === 0 ? (
                <p className="muted checklist__empty">Nothing to fix here.</p>
              ) : (
                <ul className="checklist__list">
                  {checklist.map((c) => (
                    <li key={c.id} className="checklist__row">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={c.resolved}
                        className="np-check"
                        disabled={!review.allowResolve}
                        onClick={() => toggle(c)}
                      >
                        <span className="np-check__box" aria-hidden="true">
                          <Icon name="check" strokeWidth={2.6} />
                        </span>
                        <span className="np-check__text">
                          <span className="np-check__meta">
                            <span className="np-dot" style={{ background: `var(--${c.severity})` }} />
                            {SEVERITY[c.severity].label} · {lineLabel(c.line, c.endLine)}
                          </span>
                          <span className="np-check__label">{excerpt(c.text)}</span>
                        </span>
                      </button>
                      <a
                        href={`#line-${c.line}`}
                        className="np-btn np-btn--icon checklist__jump"
                        aria-label={`Show ${lineLabel(c.line, c.endLine)} in the code`}
                        title="Show in code"
                        onClick={(e) => {
                          e.preventDefault();
                          if (filter === 'fixed' && !c.resolved) setFilter('all');
                          if (filter === 'open' && c.resolved) setFilter('all');
                          history.replaceState(null, '', `#line-${c.line}`);
                          requestAnimationFrame(() => scrollToLine(c.line));
                        }}
                      >
                        <Icon name="arrow-right" size={14} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="np-panel np-panel__body">
              <h2 className="np-panel__title">What the labels mean</h2>
              <dl className="legend">
                {SEVERITIES.map((s) => (
                  <div key={s} className="legend__row">
                    <dt className={`legend__term legend__term--${s}`}>
                      <span className="np-dot" />
                      {SEVERITY[s].label}
                    </dt>
                    <dd>{SEVERITY[s].hint}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
