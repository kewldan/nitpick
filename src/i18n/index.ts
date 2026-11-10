// The interface language: Russian or English, picked from the saved choice or
// the browser, switchable at any time. Components read strings with `t()`;
// App subscribes with useLocale() so a switch re-renders the whole tree.

import { useSyncExternalStore } from 'react';

import { pickLocale, type Locale } from '../../shared/i18n.ts';
import { en } from './en.ts';
import { ru, type Messages } from './ru.ts';

export type { Locale, Messages };

const DICTS: Record<Locale, Messages> = { ru, en };
const KEY = 'nitpick:locale';

function detect(): Locale {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'ru' || saved === 'en') return saved;
  } catch {
    /* storage off */
  }
  const langs = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language];
  return pickLocale(null, langs.join(','));
}

let current: Locale = detect();
const listeners = new Set<() => void>();

export const t = (): Messages => DICTS[current];
export const getLocale = (): Locale => current;

export function setLocale(l: Locale) {
  if (l === current) return;
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* storage off */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = DICTS[l].meta.htmlLang;
  listeners.forEach((fn) => fn());
}

export function useLocale(): Locale {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

/** Display name of a language from the registry, translated where it matters. */
export function languageLabel(id: string, fallback: string): string {
  return t().languages[id] ?? fallback;
}
