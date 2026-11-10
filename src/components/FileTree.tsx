// A project's files as a tree: folders as headers, files as buttons with an
// optional comment count coloured by the highest open severity.

import { useMemo, useState, type ReactNode } from 'react';

import type { Severity } from '../../shared/types.ts';
import { t } from '../i18n/index.ts';
import { Icon } from './Icon.tsx';

export interface TreeItem {
  key: string;
  path: string;
  /** Comments still open on this file. */
  count?: number;
  /** Highest-ranked open severity, colours the count. */
  severity?: Severity | null;
  /** All comments on this file are fixed. */
  done?: boolean;
  /** Marks a file the formatter couldn't parse, or similar. */
  warn?: string;
}

type Row =
  | { kind: 'dir'; path: string; name: string; depth: number }
  | { kind: 'file'; item: TreeItem; name: string; depth: number };

function rows(items: TreeItem[]): Row[] {
  const out: Row[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const parts = item.path.split('/');
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts.slice(0, i + 1).join('/');
      if (seen.has(dir)) continue;
      seen.add(dir);
      out.push({ kind: 'dir', path: dir, name: parts[i], depth: i });
    }
    out.push({ kind: 'file', item, name: parts[parts.length - 1], depth: parts.length - 1 });
  }
  return out;
}

export function FileTree({
  items,
  selected,
  onSelect,
  onRemove,
  title,
  actions,
  footer,
}: {
  items: TreeItem[];
  selected: string;
  onSelect: (key: string) => void;
  onRemove?: (key: string) => void;
  title?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const all = useMemo(() => rows(items), [items]);
  const visible = all.filter((r) => {
    const path = r.kind === 'dir' ? r.path : r.item.path;
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      if (closed.has(parts.slice(0, i).join('/'))) return false;
    }
    return true;
  });
  const toggle = (dir: string) =>
    setClosed((s) => {
      const n = new Set(s);
      if (n.has(dir)) n.delete(dir);
      else n.add(dir);
      return n;
    });

  return (
    <nav className="np-panel tree" aria-label={t().tree.files}>
      <div className="np-panel__head tree__head">
        <span className="np-panel__title">{title ?? t().tree.files}</span>
        <span className="tree__actions">
          {actions}
          {!actions && <span className="np-file__meta">{items.length}</span>}
        </span>
      </div>
      <ul className="tree__list">
        {visible.map((r) =>
          r.kind === 'dir' ? (
            <li key={`d:${r.path}`}>
              <button
                type="button"
                className="tree__dir"
                style={{ paddingLeft: 10 + r.depth * 12 }}
                aria-expanded={!closed.has(r.path)}
                onClick={() => toggle(r.path)}
              >
                <span className="tree__chev" aria-hidden="true">
                  <Icon name="chevron-down" size={12} />
                </span>
                {r.name}
              </button>
            </li>
          ) : (
            <li key={r.item.key} className="tree__row">
              <button
                type="button"
                className="tree__file"
                style={{ paddingLeft: 10 + r.depth * 12 + 16 }}
                aria-current={r.item.key === selected ? 'true' : undefined}
                onClick={() => onSelect(r.item.key)}
                title={r.item.path}
              >
                <span className="tree__name">{r.name}</span>
                {r.item.warn && (
                  <span className="tree__warn" title={r.item.warn}>
                    <Icon name="alert" size={12} />
                  </span>
                )}
                {!!r.item.count && (
                  <span
                    className="tree__count"
                    style={{ color: `var(--${r.item.severity ?? 'nit'}-text)` }}
                    aria-label={t().tree.open(r.item.count)}
                  >
                    <span
                      className="np-dot"
                      style={{ background: `var(--${r.item.severity ?? 'nit'})` }}
                    />
                    {r.item.count}
                  </span>
                )}
                {!r.item.count && r.item.done && (
                  <span className="tree__done" aria-label={t().tree.allFixed}>
                    <Icon name="check" size={12} />
                  </span>
                )}
              </button>
              {onRemove && (
                <button
                  type="button"
                  className="np-btn np-btn--icon tree__remove"
                  aria-label={t().tree.remove(r.item.path)}
                  title={t().tree.removeTitle}
                  onClick={() => onRemove(r.item.key)}
                >
                  <Icon name="close" size={12} />
                </button>
              )}
            </li>
          ),
        )}
      </ul>
      {footer}
    </nav>
  );
}

/** Per-file open count and top severity, for tree badges. */
export function fileStats(
  comments: { file: string; severity: Severity; resolved: boolean }[],
): Map<string, { open: number; total: number; top: Severity | null }> {
  const rank: Record<Severity, number> = { blocker: 0, issue: 1, suggestion: 2, nit: 3, praise: 4 };
  const m = new Map<string, { open: number; total: number; top: Severity | null }>();
  for (const c of comments) {
    const s = m.get(c.file) ?? { open: 0, total: 0, top: null };
    s.total++;
    if (!c.resolved && c.severity !== 'praise') {
      s.open++;
      if (!s.top || rank[c.severity] < rank[s.top]) s.top = c.severity;
    }
    m.set(c.file, s);
  }
  return m;
}
