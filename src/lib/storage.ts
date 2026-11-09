// Browser-only memory. There are no accounts, so the mentor's edit keys and
// unpublished drafts live here. Every access is guarded: storage can be off.

export interface SavedReview {
  id: string;
  editKey: string;
  title: string;
  createdAt: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the app still works for this session */
  }
}

const REVIEWS = 'nitpick:reviews';
const DRAFT = 'nitpick:draft';
const PREFS = 'nitpick:prefs';
const MENTEE = 'nitpick:mentee';

export const storage = {
  reviews: (): SavedReview[] => read<SavedReview[]>(REVIEWS, []),
  saveReview(r: SavedReview) {
    const list = storage.reviews().filter((x) => x.id !== r.id);
    write(REVIEWS, [r, ...list].slice(0, 200));
  },
  forgetReview(id: string) {
    write(REVIEWS, storage.reviews().filter((x) => x.id !== id));
  },
  keyFor: (id: string) => storage.reviews().find((r) => r.id === id)?.editKey,

  draft: <T>() => read<T | null>(DRAFT, null),
  saveDraft: (d: unknown) => write(DRAFT, d),
  clearDraft: () => write(DRAFT, null),

  prefs: <T extends object>(fallback: T): T => ({ ...fallback, ...read<Partial<T>>(PREFS, {}) }),
  savePrefs: (p: object) => write(PREFS, { ...read<object>(PREFS, {}), ...p }),

  /** Ids of replies the mentee wrote on this device, to label them "You". */
  menteeReplies: (): string[] => read<string[]>(MENTEE, []),
  addMenteeReply(id: string) {
    write(MENTEE, [id, ...storage.menteeReplies()].slice(0, 2000));
  },
};
