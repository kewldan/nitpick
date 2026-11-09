import assert from 'node:assert/strict';
import { test } from 'node:test';

import { diffLines, lineMap } from '../src/lib/diff.ts';

test('diffLines marks added and removed lines', () => {
  const rows = diffLines(['a', 'b', 'c'], ['a', 'x', 'c']);
  assert.deepEqual(
    rows.map((r) => `${r.t}${r.s}`),
    [' a', '-b', '+x', ' c'],
  );
});

test('lineMap keeps unchanged lines in place after an insert above', () => {
  const map = lineMap('a\nb\nc', 'new1\nnew2\na\nb\nc');
  assert.equal(map(1), 3);
  assert.equal(map(3), 5);
});

test('lineMap moves a removed line to where its replacement starts', () => {
  const map = lineMap('a\nold\nc', 'a\nnew\nmore\nc');
  assert.equal(map(2), 2);
  assert.equal(map(3), 4);
});

test('lineMap clamps lines removed at the end', () => {
  const map = lineMap('a\nb\nc\nd', 'a\nb');
  assert.equal(map(4), 2);
});
