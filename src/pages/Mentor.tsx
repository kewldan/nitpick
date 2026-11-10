// The mentor's side: a new draft at / and /draft, a published review at
// /e/:id (comments) and /e/:id/code (edit the code). The edit key travels in
// the URL fragment (#key=…), so it never reaches server logs.

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Review } from '../../shared/types.ts';
import { PublishDialog, shareUrl } from '../components/PublishDialog.tsx';
import { ReviewsList } from '../components/ReviewsList.tsx';
import { ApiError, api } from '../lib/api.ts';
import { lineMap } from '../lib/diff.ts';
import {
  emptyDraft,
  filePath,
  fingerprint,
  fromReview,
  isStarted,
  normalizeDraft,
  rememberPrefs,
  toInput,
  type Draft,
} from '../lib/draft.ts';
import { formatterLabel, type FormatResult } from '../lib/format.ts';
import { navigate, useRefresh, useToast } from '../lib/hooks.tsx';
import { storage } from '../lib/storage.ts';
import { CodeStep } from './CodeStep.tsx';
import { ErrorPage, LoadingPage } from './ErrorPage.tsx';
import { ReviewStep } from './ReviewStep.tsx';

type Screen = 'code' | 'review';
interface Pub {
  id: string;
  key: string;
  expiresAt: string | null;
}
type Load = 'ready' | 'loading' | { error: ApiError | 'nokey' };

export function keyFromHash(): string | null {
  const m = /[#&]key=([A-Za-z0-9]+)/.exec(location.hash);
  return m ? m[1] : null;
}

function sameState(a: Review['comments'][number], b: Review['comments'][number]) {
  return a.resolved === b.resolved && a.replies.length === b.replies.length;
}

export function Mentor({ id, screen }: { id?: string; screen: Screen }) {
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(() =>
    id ? emptyDraft() : (normalizeDraft(storage.draft()) ?? emptyDraft()),
  );
  const [fileId, setFileId] = useState('');
  const [pub, setPub] = useState<Pub | null>(null);
  const [saved, setSaved] = useState('');
  const [load, setLoad] = useState<Load>(id ? 'loading' : 'ready');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'published' | 'updated' | 'share' | null>(null);

  const patch = useCallback(
    (p: Partial<Draft> | ((d: Draft) => Partial<Draft>)) =>
      setDraft((d) => ({ ...d, ...(typeof p === 'function' ? p(d) : p) })),
    [],
  );

  // Load a published review when the route names one.
  useEffect(() => {
    if (!id) {
      if (pub) {
        setPub(null);
        setDraft(normalizeDraft(storage.draft()) ?? emptyDraft());
        setLoad('ready');
      }
      return;
    }
    if (pub?.id === id) return;
    const key = keyFromHash() ?? storage.keyFor(id);
    if (!key) {
      setLoad({ error: 'nokey' });
      return;
    }
    let live = true;
    setLoad('loading');
    Promise.all([api.get(id), api.checkKey(id, key)])
      .then(([review]) => {
        if (!live) return;
        const d = fromReview(review);
        storage.saveReview({ id, editKey: key, title: review.title, createdAt: review.createdAt });
        setDraft(d);
        setSaved(fingerprint(d));
        setPub({ id, key, expiresAt: review.expiresAt });
        setLoad('ready');
        if (!keyFromHash()) history.replaceState(null, '', `${location.pathname}#key=${key}`);
      })
      .catch((err: ApiError) => live && setLoad({ error: err }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Keep an unpublished draft across reloads.
  useEffect(() => {
    if (pub || id) return;
    const t = window.setTimeout(() => storage.saveDraft(draft), 300);
    return () => window.clearTimeout(t);
  }, [draft, pub, id]);

  const print = useMemo(() => (pub ? fingerprint(draft) : ''), [draft, pub]);
  const status = !pub ? 'draft' : print !== saved ? 'dirty' : 'published';

  useEffect(() => {
    if (status !== 'dirty') return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);

  // Pull in the mentee's ticks and replies while the mentor works.
  const pullMenteeState = useCallback(() => {
    if (!pub) return;
    api
      .get(pub.id)
      .then((r) => {
        const server = new Map(r.comments.map((c) => [c.id, c]));
        setDraft((d) => {
          let changed = false;
          const comments = d.comments.map((c) => {
            const s = server.get(c.id);
            if (!s || sameState(c, s)) return c;
            changed = true;
            return { ...c, resolved: s.resolved, replies: s.replies };
          });
          return changed ? { ...d, comments } : d;
        });
      })
      .catch(() => {});
  }, [pub]);
  useRefresh(pullMenteeState, 20_000, !!pub);

  const goto = (s: Screen, replace = false) => {
    const path = pub
      ? `/e/${pub.id}${s === 'code' ? '/code' : ''}#key=${pub.key}`
      : s === 'code'
        ? '/'
        : '/draft';
    navigate(path, { replace });
  };

  // Nothing to comment on yet: go back to the paste screen.
  useEffect(() => {
    if (load === 'ready' && screen === 'review' && !isStarted(draft)) goto('code', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, screen, isStarted(draft)]);

  /** Applies freshly formatted code and keeps comments on their lines. */
  const start = (results: Map<string, FormatResult>) => {
    setDraft((d) => {
      let comments = d.comments;
      const files = d.files.map((f) => {
        const r = results.get(f.id);
        if (!r) return { ...f, code: '', formatter: '' };
        if (f.code && f.code !== r.code) {
          const map = lineMap(f.code, r.code);
          const path = filePath(f);
          comments = comments.map((c) => {
            if (c.file !== path) return c;
            const line = map(c.line);
            return { ...c, line, endLine: Math.max(line, map(c.endLine)) };
          });
        }
        return {
          ...f,
          code: r.code,
          formatter: r.error ? 'As pasted' : formatterLabel(f.language, d.fmt),
        };
      });
      // A file that lost its code (emptied) takes its comments with it.
      const live = new Set(files.filter((f) => f.code.trim()).map(filePath));
      comments = comments.filter((c) => live.has(c.file));
      const next = { ...d, files, comments };
      rememberPrefs(next);
      return next;
    });
    goto('review');
  };

  const publish = async () => {
    if (!isStarted(draft) || busy) return;
    const input = toInput(draft);
    setBusy(true);
    try {
      if (!pub) {
        const res = await api.publish(input);
        storage.saveReview({
          id: res.id,
          editKey: res.editKey,
          title: input.title,
          createdAt: res.review.createdAt,
        });
        storage.clearDraft();
        rememberPrefs(draft);
        setSaved(fingerprint(draft));
        setPub({ id: res.id, key: res.editKey, expiresAt: res.review.expiresAt });
        setDialog('published');
        navigate(`/e/${res.id}#key=${res.editKey}`, { replace: true });
      } else {
        const review = await api.update(pub.id, pub.key, input);
        storage.saveReview({
          id: pub.id,
          editKey: pub.key,
          title: input.title,
          createdAt: review.createdAt,
        });
        rememberPrefs(draft);
        setSaved(fingerprint(draft));
        setPub({ ...pub, expiresAt: review.expiresAt });
        pullMenteeState();
        setDialog('updated');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not publish');
    } finally {
      setBusy(false);
    }
  };

  const reply = async (cid: string, text: string) => {
    if (!pub) return false;
    try {
      const c = await api.reply(pub.id, cid, text, pub.key);
      patch((d) => ({
        comments: d.comments.map((x) => (x.id === cid ? { ...x, replies: c.replies } : x)),
      }));
      return true;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not send the reply');
      return false;
    }
  };

  const remove = async () => {
    if (!pub) return;
    if (!window.confirm('Delete this review? The share link stops working for your mentee.')) return;
    try {
      await api.remove(pub.id, pub.key);
      storage.forgetReview(pub.id);
      toast('Review deleted', 'info');
      navigate('/');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete the review');
    }
  };

  if (load === 'loading') return <LoadingPage />;
  if (typeof load === 'object') {
    const err = load.error;
    if (err === 'nokey') {
      return (
        <ErrorPage
          title="This edit link is incomplete"
          text="The private key at the end of the link is missing. Open the full edit link you got when you published, or view the review as your mentee sees it."
          action={{ label: 'Open mentee view', href: `/${id}` }}
        />
      );
    }
    if (err.status === 403) {
      return (
        <ErrorPage
          title="This edit link isn’t valid"
          text="The key doesn’t match this review. Check that you copied the whole link."
          action={{ label: 'Open mentee view', href: `/${id}` }}
        />
      );
    }
    return (
      <ErrorPage
        title={err.expired ? 'This review has expired' : err.status === 404 ? 'Review not found' : 'Something went wrong'}
        text={err.expired ? 'Its link expired, so the review was removed.' : err.message}
        action={{ label: 'Start a new review', href: '/' }}
      />
    );
  }

  const dialogNode = pub && dialog && (
    <PublishDialog
      kind={dialog}
      id={pub.id}
      editKey={pub.key}
      draft={draft}
      expiresAt={pub.expiresAt}
      onClose={() => setDialog(null)}
      onOpenMentee={() => window.open(shareUrl(pub.id), '_blank', 'noopener')}
    />
  );

  if (screen === 'code') {
    return (
      <CodeStep
        draft={draft}
        patch={patch}
        selectedId={fileId}
        onSelect={setFileId}
        onStart={start}
        published={!!pub}
        footer={!pub && <ReviewsList />}
      />
    );
  }
  return (
    <>
      <ReviewStep
        draft={draft}
        patch={patch}
        selectedId={fileId}
        onSelect={setFileId}
        status={status}
        busy={busy}
        expiresAt={pub?.expiresAt ?? null}
        onEditCode={() => goto('code')}
        onPublish={publish}
        onShare={() => setDialog('share')}
        onDelete={pub ? remove : undefined}
        onReply={pub ? reply : undefined}
      />
      {dialogNode}
    </>
  );
}
