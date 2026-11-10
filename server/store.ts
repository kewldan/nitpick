// Review storage on SQLite (node:sqlite, no native dependencies).
//
// Each review is one row holding the whole document as JSON. All writes are
// synchronous read-modify-write calls, so within one process they are atomic.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { normalizeReview, type Review } from '../shared/types.ts';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomId(length: number): string {
  const bytes = randomBytes(length * 2);
  let out = '';
  for (let i = 0; out.length < length && i < bytes.length; i++) {
    // Rejection sampling keeps the distribution uniform.
    const b = bytes[i];
    if (b < 256 - (256 % ALPHABET.length)) out += ALPHABET[b % ALPHABET.length];
  }
  return out.length === length ? out : randomId(length);
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export interface Store {
  create(review: Omit<Review, 'id'>): { id: string; editKey: string };
  get(id: string): Review | null;
  /** Applies `fn` to the stored review and saves the result atomically. */
  update(id: string, fn: (review: Review) => Review): Review | null;
  remove(id: string): boolean;
  checkKey(id: string, key: string | undefined): boolean;
  purgeExpired(now?: number): number;
  close(): void;
}

export function openStore(file: string): Store {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      key_hash TEXT NOT NULL,
      doc TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      expires_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS reviews_expires ON reviews(expires_at)
      WHERE expires_at IS NOT NULL;
  `);

  const insert = db.prepare(
    `INSERT INTO reviews (id, key_hash, doc, created_at, updated_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const select = db.prepare('SELECT doc FROM reviews WHERE id = ?');
  const selectKey = db.prepare('SELECT key_hash FROM reviews WHERE id = ?');
  const save = db.prepare(
    'UPDATE reviews SET doc = ?, updated_at = ?, expires_at = ? WHERE id = ?',
  );
  const del = db.prepare('DELETE FROM reviews WHERE id = ?');
  const purge = db.prepare(
    'DELETE FROM reviews WHERE expires_at IS NOT NULL AND expires_at < ?',
  );

  const toMs = (iso: string | null) => (iso ? Date.parse(iso) : null);

  return {
    create(review) {
      const editKey = randomId(24);
      for (let attempt = 0; attempt < 8; attempt++) {
        const id = randomId(attempt < 4 ? 6 : 8);
        if (select.get(id)) continue;
        const doc: Review = { ...review, id };
        insert.run(
          id,
          hashKey(editKey),
          JSON.stringify(doc),
          Date.parse(doc.createdAt),
          Date.parse(doc.updatedAt),
          toMs(doc.expiresAt),
        );
        return { id, editKey };
      }
      throw new Error('Could not allocate an id');
    },

    get(id) {
      const row = select.get(id) as { doc: string } | undefined;
      return row ? normalizeReview(JSON.parse(row.doc)) : null;
    },

    update(id, fn) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const row = select.get(id) as { doc: string } | undefined;
        if (!row) {
          db.exec('ROLLBACK');
          return null;
        }
        const next = fn(normalizeReview(JSON.parse(row.doc)));
        save.run(
          JSON.stringify(next),
          Date.parse(next.updatedAt),
          toMs(next.expiresAt),
          id,
        );
        db.exec('COMMIT');
        return next;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    remove(id) {
      return del.run(id).changes > 0;
    },

    checkKey(id, key) {
      if (!key) return false;
      const row = selectKey.get(id) as { key_hash: string } | undefined;
      if (!row) return false;
      const a = Buffer.from(row.key_hash, 'hex');
      const b = Buffer.from(hashKey(key), 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    },

    purgeExpired(now = Date.now()) {
      return Number(purge.run(now).changes);
    },

    close() {
      db.close();
    },
  };
}
