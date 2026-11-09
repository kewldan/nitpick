// Generates src/styles/tokens.css from design/tokens.json (the Nitpick design
// system). Run after changing tokens: `npm run tokens`.
import { readFileSync, writeFileSync } from 'node:fs';

interface Token {
  name: string;
  value: string | Record<string, string>;
}
interface Family {
  tokens: Token[];
}
interface TypeStyle {
  name: string;
  fontSize: string;
  lineHeight: string | number;
  fontWeight: number;
  letterSpacing?: string;
}

const root = new URL('../', import.meta.url);
const tokens = JSON.parse(
  readFileSync(new URL('design/tokens.json', root), 'utf8'),
);

const themes: string[] = tokens.color.themes.map((t: { id: string }) => t.id);
const perTheme: Record<string, string[]> = Object.fromEntries(
  themes.map((t) => [t, []]),
);
const shared: string[] = [];

const resolve = (v: string) =>
  v.replace(/^\{(.+)\}$/, (_m, name: string) => `var(--${name})`);

function addFamily(family: Family | undefined) {
  if (!family) return;
  for (const tok of family.tokens) {
    if (typeof tok.value === 'string') {
      shared.push(`  --${tok.name}: ${resolve(tok.value)};`);
      continue;
    }
    for (const theme of themes) {
      const v = tok.value[theme] ?? tok.value[themes[0]];
      perTheme[theme].push(`  --${tok.name}: ${resolve(v)};`);
    }
  }
}

addFamily(tokens.color);
for (const key of ['spacing', 'radius', 'size', 'shadow', 'zIndex', 'opacity']) {
  addFamily(tokens[key]);
}

const families = tokens.type.families as Record<string, string>;
for (const [name, stack] of Object.entries(families)) {
  shared.push(`  --font-${name}: ${stack};`);
}

const typeRules: string[] = [];
for (const group of tokens.type.groups) {
  const family = `var(--font-${group.family})`;
  for (const s of group.styles as TypeStyle[]) {
    const lh =
      typeof s.lineHeight === 'number' ? String(s.lineHeight) : s.lineHeight;
    const ls = s.letterSpacing ? ` letter-spacing: ${s.letterSpacing};` : '';
    typeRules.push(
      `.${s.name} { font: ${s.fontWeight} ${s.fontSize}/${lh} ${family};${ls} }`,
    );
  }
}

const [first, ...rest] = themes;
const out = [
  '/* Nitpick — generated from design/tokens.json. Do not edit by hand. */',
  `:root {\n${shared.join('\n')}\n}`,
  `:root,\n[data-theme="${first}"] {\n  color-scheme: ${first};\n${perTheme[first].join('\n')}\n}`,
  ...rest.map(
    (t) =>
      `[data-theme="${t}"] {\n  color-scheme: ${t};\n${perTheme[t].join('\n')}\n}`,
  ),
  typeRules.join('\n'),
  '',
].join('\n\n');

writeFileSync(new URL('src/styles/tokens.css', root), out);
console.log(`tokens.css: ${themes.length} themes, ${typeRules.length} type styles`);
