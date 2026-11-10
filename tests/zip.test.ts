import assert from 'node:assert/strict';
import { test } from 'node:test';

import { strToU8, zipSync } from 'fflate';

import { readZip, sortPaths } from '../src/lib/zip.ts';

test('readZip keeps source files and drops build output and binaries', () => {
  const zip = zipSync({
    'hw3/src/main.cpp': strToU8('int main() {}\n'),
    'hw3/src/util.h': strToU8('#pragma once\n'),
    'hw3/CMakeLists.txt': strToU8('project(hw3)\n'),
    'hw3/cmake-build-debug/hw3.o': strToU8('x'),
    'hw3/build/out.txt': strToU8('log'),
    'hw3/.git/HEAD': strToU8('ref: main'),
    'hw3/img/logo.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 1]),
    'hw3/data.bin2': new Uint8Array([1, 0, 2, 0, 3]),
    'hw3/empty.txt': strToU8('   \n'),
    '__MACOSX/hw3/._main.cpp': strToU8('junk'),
  });
  const res = readZip(zip, 'homework.zip');
  assert.equal(res.name, 'hw3');
  assert.deepEqual(
    res.files.map((f) => `${f.path}:${f.language}`),
    ['src/main.cpp:cpp', 'src/util.h:cpp', 'CMakeLists.txt:cmake'],
  );
  const reasons = Object.fromEntries(res.skipped.map((s) => [s.path, s.reason]));
  assert.equal(reasons['hw3/build/out.txt'], 'build or tool folder');
  assert.equal(reasons['hw3/img/logo.png'], 'binary file');
  assert.equal(reasons['hw3/data.bin2'], 'not a text file');
  assert.equal(reasons['hw3/empty.txt'], 'empty');
});

test('headers in a pure C project are C', () => {
  const zip = zipSync({ 'a.c': strToU8('int x;'), 'a.h': strToU8('int x;') });
  const res = readZip(zip, 'c.zip');
  assert.deepEqual(res.files.map((f) => f.language), ['c', 'c']);
  assert.equal(res.name, 'c');
});

test('readZip rejects a file that is not an archive', () => {
  assert.throws(() => readZip(strToU8('not a zip'), 'x.zip'), /valid \.zip/);
});

test('sortPaths puts folders before files at each level', () => {
  const sorted = sortPaths([
    { path: 'main.cpp' },
    { path: 'src/b.cpp' },
    { path: 'src/a/x.cpp' },
    { path: 'src/a10.cpp' },
    { path: 'src/a2.cpp' },
  ]).map((f) => f.path);
  assert.deepEqual(sorted, ['src/a/x.cpp', 'src/a2.cpp', 'src/a10.cpp', 'src/b.cpp', 'main.cpp']);
});
