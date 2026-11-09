// Syntax highlighting with Prism, mapped onto the design system's syntax
// tokens (tok-kw, tok-ty, …) and split into lines for the line-based views.

import Prism from 'prismjs';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-sql';

import { language } from './languages.ts';

export interface Tok {
  /** A tok-* class, or '' for plain text. */
  c: string;
  v: string;
}
export type Line = Tok[];

const CLASS: Record<string, string> = {
  keyword: 'tok-kw',
  boolean: 'tok-kw',
  'class-name': 'tok-ty',
  builtin: 'tok-ty',
  namespace: 'tok-ty',
  'generic-function': 'tok-fn',
  function: 'tok-fn',
  'function-definition': 'tok-fn',
  macro: 'tok-pp',
  directive: 'tok-pp',
  'directive-hash': 'tok-pp',
  annotation: 'tok-pp',
  decorator: 'tok-pp',
  attribute: 'tok-pp',
  string: 'tok-str',
  char: 'tok-str',
  'template-string': 'tok-str',
  'string-interpolation': 'tok-str',
  'raw-string': 'tok-str',
  regex: 'tok-str',
  number: 'tok-num',
  constant: 'tok-num',
  comment: 'tok-cm',
  operator: 'tok-op',
  punctuation: 'tok-op',
  lifetime: 'tok-ty',
};

function flatten(
  tokens: Array<string | Prism.Token>,
  inherited: string,
  out: Tok[],
) {
  for (const t of tokens) {
    if (typeof t === 'string') {
      out.push({ c: inherited, v: t });
      continue;
    }
    // Inside a macro, a nested string or comment keeps its own colour.
    const own = CLASS[t.type] ?? '';
    const cls = own && (inherited === '' || inherited === 'tok-pp' || own === 'tok-cm' || own === 'tok-str')
      ? own
      : inherited;
    const content = t.content as string | Prism.Token | Array<string | Prism.Token>;
    if (typeof content === 'string') out.push({ c: cls, v: content });
    else flatten(Array.isArray(content) ? content : [content], cls, out);
  }
}

/** Highlights `code` and returns one token list per line. */
export function highlight(code: string, langId: string): Line[] {
  const grammar = Prism.languages[language(langId).prism];
  const flat: Tok[] = [];
  if (grammar) flatten(Prism.tokenize(code, grammar), '', flat);
  else flat.push({ c: '', v: code });

  const lines: Line[] = [[]];
  for (const tok of flat) {
    const parts = tok.v.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ c: tok.c, v: part });
    });
  }
  return lines;
}
