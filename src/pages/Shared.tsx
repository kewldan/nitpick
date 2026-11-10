// The mentee's page at /:id: the summary, the code with comments, a checklist
// and progress. No account; ticks and replies are saved on the server.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Comment, Review } from '../../shared/types.ts';
import { CodeView, lineClasses } from '../components/CodeView.tsx';
import { CommentCard } from '../components/CommentCard.tsx';
import { FileTree, fileStats } from '../components/FileTree.tsx';
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
  SEVERITY,
  verdict as verdictOf,
} from '../lib/text.ts';
import { t } from '../i18n/index.ts';
import { languageName } from '../lib/languages.ts';
import { ErrorPage, LoadingPage } from './ErrorPage.tsx';
import { scrollToLine, scrollToLineSoon } from './ReviewStep.tsx';
import { downloadZip } from '../lib/zip.ts';
import { SEVERITIES } from '../../shared/types.ts';

type Filter = 'all' | 'open' | 'fixed';

export function Shared({ id }: { id: string }) {
  const toast = useToast();
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [path, setPath] = useState<string | null>(null);
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
    if (review) document.title = `${review.title || m.defaultTitle} · Nitpick`;
    return () => {
      document.title = 'Nitpick';
    };
  }, [review?.title]);

  // Jump to a line from a #line-N link once the code is on screen.
  useEffect(() => {
    const m = /^#line-(\d+)$/.exec(location.hash);
    if (review && m) requestAnimationFrame(() => scrollToLine(Number(m[1])));
  }, [!!review]);

  // Open the file with the most pressing comment first.
  const file = useMemo(() => {
    if (!review) return null;
    const chosen = path ? review.files.find((f) => f.path === path) : null;
    if (chosen) return chosen;
    const open = [...review.comments]
      .filter((c) => !c.resolved && c.severity !== 'praise')
      .sort((a, b) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank)[0];
    return (
      (open && review.files.find((f) => f.path === open.file)) ??
      review.files.find((f) => /(^|\/)main\.[^/]+$/.test(f.path)) ??
      review.files[0]
    );
  }, [review, path]);

  const lines = useMemo(
    () => (file ? highlight(file.code, file.language) : []),
    [file?.code, file?.language],
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
      toast(err instanceof Error ? err.message : t().shared.couldNotSave);
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
      toast(err instanceof Error ? err.message : t().mentor.couldNotReply);
      return false;
    }
  };

  if (error) {
    return (
      <ErrorPage
        title={error.expired ? t().mentor.expiredTitle : error.status === 404 ? t().mentor.notFoundTitle : t().mentor.wentWrong}
        text={
          error.expired
            ? t().shared.expiredText
            : error.status === 404
              ? t().shared.notFoundText
              : error.message
        }
      />
    );
  }
  if (!review || !file) return <LoadingPage />;

  const m = t().shared;
  const lang = language(file.language);
  const multi = review.files.length > 1;
  const stats = fileStats(review.comments);
  const openFile = (p: string, line?: number) => {
    setPath(p);
    if (line) scrollToLineSoon(line);
  };
  const all = review.comments;
  const actionable = all.filter((c) => c.severity !== 'praise');
  const fixed = actionable.filter((c) => c.resolved).length;
  const blockersOpen = actionable.filter((c) => c.severity === 'blocker' && !c.resolved).length;
  const pct = actionable.length ? Math.round((fixed / actionable.length) * 100) : 100;
  const byRank = (a: Comment, b: Comment) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank;

  const progressNote = !review.allowResolve
    ? m.noteOff
    : actionable.length === 0
      ? m.noteNothing
      : fixed === actionable.length
        ? m.noteDone
        : blockersOpen
          ? m.noteBlockers(blockersOpen)
          : m.noteRest;

  const inFile = all.filter((c) => c.file === file.path);
  const visible = inFile.filter((c) =>
    filter === 'all' ? true : filter === 'open' ? !c.resolved : c.resolved,
  );
  const classes = lineClasses(lines.length, inFile);
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
          langId={file.language}
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

  const order = new Map(review.files.map((f, i) => [f.path, i]));
  const checklist = [...actionable].sort(
    (a, b) => byRank(a, b) || (order.get(a.file) ?? 0) - (order.get(b.file) ?? 0) || a.line - b.line,
  );
  const verdict = verdictOf(review.verdict);
  const fileName = file.path;
  const fileOpen = inFile.filter((c) => !c.resolved).length;
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
                {m.mentorEdit}
              </a>
            )}
          </>
        }
      />
      <main className="container container--read stack-28 shared">
        {mentorKey && (
          <p className="preview-note" role="note">
            <Icon name="external" size={14} />
            {m.previewNote}
          </p>
        )}
        <section className="shared-hero" aria-labelledby="sh-title">
          <div className="shared-hero__text">
            <div className="shared-hero__meta">
              <Pill tone={verdict.badge}>{verdict.label}</Pill>
              <span>
                {m.heroMeta(
                  review.reviewer,
                  multi ? t().plural.files(review.files.length) : `${fileName} · ${languageName(lang.id)}`,
                )}
              </span>
            </div>
            <h1 id="sh-title" className="t-display shared-hero__title">
              {review.title || m.defaultTitle}
            </h1>
            {review.summary && <p className="t-body-lg shared-hero__summary">{review.summary}</p>}
          </div>
          <div className="np-panel progress-card">
            <div className="row-between">
              <span className="np-panel__title">{m.progress}</span>
              <span className="mono progress-card__count">
                {actionable.length ? m.fixedOfN(fixed, actionable.length) : '—'}
              </span>
            </div>
            <div
              className="np-progress"
              role="progressbar"
              aria-label={m.fixedAria}
              aria-valuemin={0}
              aria-valuemax={actionable.length}
              aria-valuenow={fixed}
            >
              <div className="np-progress__bar" style={{ width: `${pct}%` }} />
            </div>
            <p className="t-caption muted">{progressNote}</p>
          </div>
        </section>

        <div className={`workspace${multi ? ' workspace--tree' : ''}`}>
          {multi && (
            <div className="tree-col">
              <FileTree
                items={review.files.map((f) => {
                  const st = stats.get(f.path);
                  return {
                    key: f.path,
                    path: f.path,
                    count: st?.open,
                    severity: st?.top,
                    done: !!st && st.total > 0 && st.open === 0,
                  };
                })}
                selected={file.path}
                onSelect={(p) => openFile(p)}
                actions={
                  <button
                    type="button"
                    className="np-btn np-btn--ghost np-btn--sm"
                    onClick={() => downloadZip(review.title || id, review.files)}
                  >
                    {m.downloadZip}
                  </button>
                }
              />
            </div>
          )}
          <section className="np-panel code-panel" aria-label={m.reviewedCodeAria}>
            <div className="np-panel__head code-panel__head">
              <span className="np-file">
                <Icon name="file" />
                <span className="np-file__name">{fileName}</span>
                <span className="np-file__meta">
                  {languageName(lang.id)} · {t().plural.lines(lines.length)}
                </span>
              </span>
              <div className="code-panel__tools">
                <Seg
                  onBg
                  label={m.filterAria}
                  value={filter}
                  onChange={setFilter}
                  items={[
                    { id: 'all', label: m.all(inFile.length) },
                    { id: 'open', label: m.open(fileOpen) },
                    { id: 'fixed', label: m.fixed(inFile.length - fileOpen) },
                  ]}
                />
                <button
                  type="button"
                  className="np-btn np-btn--secondary"
                  onClick={() => copy(file.code, 'code')}
                >
                  <Icon name={copied === 'code' ? 'check' : 'copy'} />
                  {copied === 'code' ? t().common.copied : m.copyCode}
                </button>
              </div>
            </div>
            <CodeView key={file.path} lines={lines} classes={classes} after={after} />
          </section>

          <aside className="sidebar sidebar--narrow" aria-label={m.checklistAria}>
            <section className="np-panel checklist">
              <div className="row-between checklist__head">
                <h2 className="np-panel__title">{m.checklist}</h2>
                <span className="meta">{m.blockersFirst}</span>
              </div>
              {checklist.length === 0 ? (
                <p className="muted checklist__empty">{m.nothingToFix}</p>
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
                            {SEVERITY[c.severity].label} ·{' '}
                            {multi ? `${c.file.split('/').pop()}:${c.line}` : lineLabel(c.line, c.endLine)}
                          </span>
                          <span className="np-check__label">{excerpt(c.text)}</span>
                        </span>
                      </button>
                      <a
                        href={`#line-${c.line}`}
                        className="np-btn np-btn--icon checklist__jump"
                        aria-label={m.showInCode(c.file, lineLabel(c.line, c.endLine))}
                        title={m.showInCodeTitle}
                        onClick={(e) => {
                          e.preventDefault();
                          if (filter === 'fixed' && !c.resolved) setFilter('all');
                          if (filter === 'open' && c.resolved) setFilter('all');
                          openFile(c.file, c.line);
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
              <h2 className="np-panel__title">{m.legend}</h2>
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
