import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pickLocale, ruPlural } from '../shared/i18n.ts';
import { en } from '../src/i18n/en.ts';
import { ru } from '../src/i18n/ru.ts';

test('Russian plurals', () => {
  const f = (n: number) => ruPlural(n, 'файл', 'файла', 'файлов');
  assert.deepEqual([1, 2, 5, 11, 12, 21, 22, 25, 101, 111].map(f), [
    '1 файл', '2 файла', '5 файлов', '11 файлов', '12 файлов',
    '21 файл', '22 файла', '25 файлов', '101 файл', '111 файлов',
  ]);
});

test('locale detection prefers the explicit choice, then the browser', () => {
  assert.equal(pickLocale('en', 'ru-RU'), 'en');
  assert.equal(pickLocale(null, 'uk-UA,en;q=0.8'), 'ru');
  assert.equal(pickLocale(null, 'en-GB'), 'en');
  assert.equal(pickLocale(null, 'de-DE'), 'ru');
  assert.equal(pickLocale('xx', null), 'ru');
});

test('both dictionaries have the same keys', () => {
  const keys = (o: object, prefix = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) =>
      v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
    );
  const ruKeys = keys(ru).filter((k) => !k.startsWith('languages.'));
  const enKeys = keys(en).filter((k) => !k.startsWith('languages.'));
  assert.deepEqual(enKeys.sort(), ruKeys.sort());
});
