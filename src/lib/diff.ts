// Line diff (LCS over the changed middle) and line-number remapping, used for
// the "Diff" preview and to keep comments on the right lines when the mentor
// edits the code after commenting.

export interface DiffRow {
  t: ' ' | '+' | '-';
  /** 1-based line in the old text (for ' ' and '-'). */
  a?: number;
  /** 1-based line in the new text (for ' ' and '+'). */
  b?: number;
  s: string;
}

const MAX_CELLS = 4_000_000;

export function diffLines(a: string[], b: string[]): DiffRow[] {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const rows: DiffRow[] = [];
  for (let i = 0; i < start; i++) rows.push({ t: ' ', a: i + 1, b: i + 1, s: a[i] });

  const n = endA - start;
  const m = endB - start;
  if (n * m > MAX_CELLS) {
    for (let i = start; i < endA; i++) rows.push({ t: '-', a: i + 1, s: a[i] });
    for (let j = start; j < endB; j++) rows.push({ t: '+', b: j + 1, s: b[j] });
  } else {
    // dp[i][j] = LCS length of a[start+i..endA) and b[start+j..endB).
    const w = m + 1;
    const dp = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] =
          a[start + i] === b[start + j]
            ? dp[(i + 1) * w + j + 1] + 1
            : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      const ai = start + i;
      const bj = start + j;
      if (a[ai] === b[bj]) {
        rows.push({ t: ' ', a: ai + 1, b: bj + 1, s: a[ai] });
        i++;
        j++;
      } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
        rows.push({ t: '-', a: ai + 1, s: a[ai] });
        i++;
      } else {
        rows.push({ t: '+', b: bj + 1, s: b[bj] });
        j++;
      }
    }
    for (; i < n; i++) rows.push({ t: '-', a: start + i + 1, s: a[start + i] });
    for (; j < m; j++) rows.push({ t: '+', b: start + j + 1, s: b[start + j] });
  }

  for (let k = 0; endA + k < a.length; k++) {
    rows.push({ t: ' ', a: endA + k + 1, b: endB + k + 1, s: a[endA + k] });
  }
  return rows;
}

/**
 * Maps every old line number to a line in the new text. Unchanged lines map
 * exactly; a removed line maps to where its replacement starts.
 */
export function lineMap(oldText: string, newText: string): (line: number) => number {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  const rows = diffLines(a, b);
  const map = new Array<number>(a.length + 1).fill(0);
  let nextB = 1;
  const pending: number[] = [];
  for (const r of rows) {
    if (r.t === '-') {
      pending.push(r.a!);
      continue;
    }
    const target = r.b!;
    for (const p of pending) map[p] = target;
    pending.length = 0;
    if (r.t === ' ') map[r.a!] = target;
    nextB = target + 1;
  }
  for (const p of pending) map[p] = Math.min(nextB, b.length);
  return (line) => Math.max(1, Math.min(b.length, map[line] || line));
}
