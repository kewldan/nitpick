// Turning a .zip (or a handful of dropped files) into review files, and a
// project back into a .zip for the mentee. Everything happens in the browser.

import { strToU8, unzipSync, zipSync, type Unzipped } from 'fflate';

import { LIMITS } from '../../shared/types.ts';
import { languageFromFileName } from './languages.ts';

export interface ImportedFile {
  path: string;
  language: string;
  text: string;
}

export interface ImportResult {
  files: ImportedFile[];
  /** Paths left out, with the reason, to show the mentor. */
  skipped: { path: string; reason: string }[];
  /** A name for the project, from the archive or its single top folder. */
  name: string;
}

export const MAX_ARCHIVE_BYTES = 30 * 1024 * 1024;

const IGNORED_DIRS = new Set([
  '.git', '.svn', '.hg', '__MACOSX', '.idea', '.vscode', '.vs', 'node_modules',
  'build', 'dist', 'out', 'target', 'bin', 'obj', '.venv', 'venv', '__pycache__',
  '.gradle', '.pytest_cache', '.mypy_cache', '.cache', 'Debug', 'Release', 'x64',
]);
const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);
const BINARY_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'svgz', 'pdf', 'zip', 'gz',
  'tar', '7z', 'rar', 'exe', 'dll', 'so', 'dylib', 'a', 'lib', 'o', 'obj', 'class',
  'jar', 'pyc', 'pyo', 'bin', 'dat', 'db', 'sqlite', 'woff', 'woff2', 'ttf', 'otf',
  'mp3', 'mp4', 'wav', 'mov', 'pdb', 'ilk', 'exp', 'idb', 'pch', 'gch', 'out',
]);

function skipReason(path: string): string | null {
  const parts = path.split('/');
  const base = parts[parts.length - 1];
  if (parts.slice(0, -1).some((p) => IGNORED_DIRS.has(p) || /^cmake-build-/.test(p))) {
    return 'build or tool folder';
  }
  if (IGNORED_FILES.has(base) || base.startsWith('._')) return 'system file';
  const ext = /\.([A-Za-z0-9]+)$/.exec(base)?.[1].toLowerCase();
  if (ext && BINARY_EXT.has(ext)) return 'binary file';
  return null;
}

const decoder = new TextDecoder('utf-8', { fatal: true });

function decode(bytes: Uint8Array): string | null {
  if (bytes.subarray(0, 8000).includes(0)) return null;
  try {
    return decoder.decode(bytes).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  } catch {
    return null;
  }
}

/** Removes a folder that wraps everything, as in "project/src/main.cpp". */
function stripCommonFolder(paths: string[]): { prefix: string; strip: (p: string) => string } {
  if (paths.length === 0) return { prefix: '', strip: (p) => p };
  const first = paths[0].split('/');
  if (first.length < 2) return { prefix: '', strip: (p) => p };
  const top = first[0];
  if (!paths.every((p) => p.startsWith(`${top}/`))) return { prefix: '', strip: (p) => p };
  return { prefix: top, strip: (p) => p.slice(top.length + 1) };
}

const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Sorts like a file tree: folders first at each level, then names. */
export function sortPaths<T extends { path: string }>(files: T[]): T[] {
  return [...files].sort((a, b) => {
    const pa = a.path.split('/');
    const pb = b.path.split('/');
    for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
      const aDir = i < pa.length - 1;
      const bDir = i < pb.length - 1;
      if (pa[i] !== pb[i]) {
        if (aDir !== bDir) return aDir ? -1 : 1;
        return natural.compare(pa[i], pb[i]);
      }
    }
    return pa.length - pb.length;
  });
}

function build(entries: { path: string; bytes: Uint8Array }[], fallbackName: string): ImportResult {
  const skipped: ImportResult['skipped'] = [];
  const kept: { path: string; text: string }[] = [];
  let total = 0;
  for (const { path, bytes } of entries) {
    const why = skipReason(path);
    if (why) {
      skipped.push({ path, reason: why });
      continue;
    }
    if (bytes.length > LIMITS.code) {
      skipped.push({ path, reason: 'larger than 200 KB' });
      continue;
    }
    const text = decode(bytes);
    if (text === null) {
      skipped.push({ path, reason: 'not a text file' });
      continue;
    }
    if (!text.trim()) {
      skipped.push({ path, reason: 'empty' });
      continue;
    }
    if (text.split('\n').length > LIMITS.lines) {
      skipped.push({ path, reason: `more than ${LIMITS.lines} lines` });
      continue;
    }
    if (kept.length >= LIMITS.files) {
      skipped.push({ path, reason: `over ${LIMITS.files} files` });
      continue;
    }
    // Formatted code and the original both count, so leave room for both.
    if ((total + text.length) * 2 > LIMITS.totalCode) {
      skipped.push({ path, reason: 'project size limit' });
      continue;
    }
    total += text.length;
    kept.push({ path, text });
  }

  const { prefix, strip } = stripCommonFolder(kept.map((f) => f.path));
  const isC = kept.some((f) => /\.c$/i.test(f.path)) && !kept.some((f) => /\.(cc|cpp|cxx)$/i.test(f.path));
  const files = sortPaths(
    kept.map(({ path, text }) => {
      const p = strip(path);
      let language = languageFromFileName(p) ?? 'text';
      if (isC && /\.h$/i.test(p)) language = 'c';
      return { path: p, language, text };
    }),
  );
  return { files, skipped, name: prefix || fallbackName };
}

export function readZip(data: Uint8Array, archiveName: string): ImportResult {
  let unzipped: Unzipped;
  try {
    unzipped = unzipSync(data, {
      // Skip what we would drop anyway before inflating it.
      filter: (f) => !f.name.endsWith('/') && f.originalSize <= LIMITS.code * 4,
    });
  } catch {
    throw new Error('This file isn’t a valid .zip archive.');
  }
  const entries = Object.entries(unzipped).map(([path, bytes]) => ({
    path: path.replace(/\\/g, '/').replace(/^\.?\//, ''),
    bytes,
  }));
  return build(entries, archiveName.replace(/\.zip$/i, ''));
}

/** Reads what the mentor picked or dropped: one archive, or plain files. */
export async function readUpload(list: FileList | File[]): Promise<ImportResult> {
  const picked = Array.from(list);
  const zip = picked.find((f) => /\.zip$/i.test(f.name));
  if (zip && picked.length === 1) {
    if (zip.size > MAX_ARCHIVE_BYTES) {
      throw new Error('That archive is larger than 30 MB. Leave out build folders and try again.');
    }
    return readZip(new Uint8Array(await zip.arrayBuffer()), zip.name);
  }
  const entries = await Promise.all(
    picked.map(async (f) => ({
      path: (f.webkitRelativePath || f.name).replace(/\\/g, '/'),
      bytes: new Uint8Array(await f.arrayBuffer()),
    })),
  );
  return build(entries, '');
}

/** Packs files into a .zip and starts a download. */
export function downloadZip(name: string, files: { path: string; code: string }[]) {
  const tree: Record<string, Uint8Array> = {};
  for (const f of files) tree[f.path] = strToU8(f.code.endsWith('\n') ? f.code : `${f.code}\n`);
  const blob = new Blob([zipSync(tree, { level: 6 })], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'review'}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
