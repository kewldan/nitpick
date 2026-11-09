import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { storage } from './storage.ts';

/* ---------- Router: a tiny pushState router ---------- */

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
window.addEventListener('popstate', notify);

export function navigate(to: string, { replace = false } = {}) {
  if (replace) history.replaceState(null, '', to);
  else history.pushState(null, '', to);
  notify();
  window.scrollTo(0, 0);
}

export function useLocation() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => location.pathname + location.hash,
  );
}

/* ---------- Copy to clipboard with a "Copied" state ---------- */

export function useCopy(timeout = 1600) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = useCallback(
    async (text: string, tag: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopied(tag);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), timeout);
    },
    [timeout],
  );
  return { copied, copy };
}

/* ---------- Toasts ---------- */

interface Toast {
  id: number;
  text: string;
  tone: 'error' | 'info';
}
const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast['tone'] = 'error') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="np-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="np-toast" data-tone={t.tone}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/* ---------- Theme ---------- */

export type Theme = 'dark' | 'light';

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(
    () => storage.prefs<{ theme: Theme }>({ theme: 'dark' }).theme,
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      storage.savePrefs({ theme: next });
      return next;
    });
  }, []);
  return [theme, toggle];
}

/* ---------- Refetch when the tab comes back, and every so often ---------- */

export function useRefresh(fn: () => void, intervalMs: number, enabled = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!enabled) return;
    const run = () => {
      if (document.visibilityState === 'visible') ref.current();
    };
    const t = window.setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', run);
    window.addEventListener('focus', run);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('focus', run);
    };
  }, [intervalMs, enabled]);
}
