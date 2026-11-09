// The formatted code with a 56px gutter. Comment cards and the composer hang
// under the line they belong to (the last line of a range).

import { memo, type MouseEvent, type ReactNode } from 'react';

import type { Comment, Severity } from '../../shared/types.ts';
import type { Line, Tok } from '../lib/highlight.ts';
import { SEVERITY } from '../lib/text.ts';

export const Toks = memo(function Toks({ toks }: { toks: Tok[] }) {
  return (
    <>
      {toks.map((t, i) =>
        t.c ? (
          <span key={i} className={t.c}>
            {t.v}
          </span>
        ) : (
          t.v
        ),
      )}
    </>
  );
});

const Row = memo(function Row({
  n,
  toks,
  cls,
  onNum,
}: {
  n: number;
  toks: Tok[];
  cls: string;
  onNum?: (n: number, e: MouseEvent) => void;
}) {
  return (
    <div className={`np-line${cls}`}>
      {onNum ? (
        <button
          type="button"
          className="np-line__num"
          aria-label={`Comment on line ${n}`}
          onClick={(e) => onNum(n, e)}
        >
          {n}
        </button>
      ) : (
        <span className="np-line__num" aria-hidden="true">
          {n}
        </span>
      )}
      <span className="np-line__text">
        <Toks toks={toks} />
        {toks.length === 0 && '​'}
      </span>
    </div>
  );
});

/**
 * Per-line state: the highest-ranked open comment covering the line paints
 * it; if all comments covering it are fixed, the line gets the resolved mark.
 */
export function lineClasses(
  count: number,
  comments: Comment[],
  active?: { line: number; endLine: number } | null,
): string[] {
  const top: (Severity | null)[] = new Array(count + 1).fill(null);
  const any = new Uint8Array(count + 1);
  for (const c of comments) {
    for (let n = c.line; n <= Math.min(c.endLine, count); n++) {
      any[n] = 1;
      if (c.resolved) continue;
      const cur = top[n];
      if (!cur || SEVERITY[c.severity].rank < SEVERITY[cur].rank) top[n] = c.severity;
    }
  }
  const out = new Array<string>(count + 1).fill('');
  for (let n = 1; n <= count; n++) {
    if (active && n >= active.line && n <= active.endLine) out[n] = ' np-line--active';
    else if (top[n]) out[n] = ` np-line--${top[n]}`;
    else if (any[n]) out[n] = ' np-line--resolved';
  }
  return out;
}

export function CodeView({
  lines,
  classes,
  after,
  onNum,
}: {
  lines: Line[];
  classes: string[];
  after: Map<number, ReactNode>;
  onNum?: (n: number, e: MouseEvent) => void;
}) {
  return (
    <div className="np-code">
      {lines.map((toks, i) => {
        const n = i + 1;
        const extra = after.get(n);
        return (
          <div key={n} id={`line-${n}`} className="code-anchor">
            <Row n={n} toks={toks} cls={classes[n] ?? ''} onNum={onNum} />
            {extra}
          </div>
        );
      })}
    </div>
  );
}
