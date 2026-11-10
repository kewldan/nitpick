// The languages Nitpick knows: how to name, highlight and format each one.

export type FormatterId = 'clang-format' | 'prettier' | 'gofmt' | 'ruff';

export interface Language {
  id: string;
  label: string;
  ext: string;
  /** Prism grammar name; empty for plain text. */
  prism: string;
  formatter: FormatterId | null;
}

export const LANGUAGES: Language[] = [
  { id: 'cpp', label: 'C++', ext: 'cpp', prism: 'cpp', formatter: 'clang-format' },
  { id: 'c', label: 'C', ext: 'c', prism: 'c', formatter: 'clang-format' },
  { id: 'java', label: 'Java', ext: 'java', prism: 'java', formatter: 'clang-format' },
  { id: 'csharp', label: 'C#', ext: 'cs', prism: 'csharp', formatter: 'clang-format' },
  { id: 'python', label: 'Python', ext: 'py', prism: 'python', formatter: 'ruff' },
  { id: 'go', label: 'Go', ext: 'go', prism: 'go', formatter: 'gofmt' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts', prism: 'typescript', formatter: 'prettier' },
  { id: 'javascript', label: 'JavaScript', ext: 'js', prism: 'javascript', formatter: 'prettier' },
  { id: 'rust', label: 'Rust', ext: 'rs', prism: 'rust', formatter: null },
  { id: 'kotlin', label: 'Kotlin', ext: 'kt', prism: 'kotlin', formatter: null },
  { id: 'sql', label: 'SQL', ext: 'sql', prism: 'sql', formatter: null },
  { id: 'json', label: 'JSON', ext: 'json', prism: 'json', formatter: 'prettier' },
  { id: 'yaml', label: 'YAML', ext: 'yml', prism: 'yaml', formatter: null },
  { id: 'markdown', label: 'Markdown', ext: 'md', prism: 'markdown', formatter: null },
  { id: 'cmake', label: 'CMake', ext: 'cmake', prism: 'cmake', formatter: null },
  { id: 'makefile', label: 'Makefile', ext: 'mk', prism: 'makefile', formatter: null },
  { id: 'bash', label: 'Shell', ext: 'sh', prism: 'bash', formatter: null },
  { id: 'html', label: 'HTML', ext: 'html', prism: 'markup', formatter: null },
  { id: 'css', label: 'CSS', ext: 'css', prism: 'css', formatter: null },
  { id: 'text', label: 'Plain text', ext: 'txt', prism: '', formatter: null },
];

const BY_ID = new Map(LANGUAGES.map((l) => [l.id, l]));

export function language(id: string): Language {
  return BY_ID.get(id) ?? BY_ID.get('text')!;
}

const BY_EXT: Record<string, string> = {
  cc: 'cpp', cxx: 'cpp', cpp: 'cpp', hpp: 'cpp', hh: 'cpp', hxx: 'cpp', h: 'cpp',
  c: 'c', java: 'java', cs: 'csharp', py: 'python', go: 'go',
  ts: 'typescript', tsx: 'typescript', mts: 'typescript',
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  rs: 'rust', kt: 'kotlin', kts: 'kotlin', sql: 'sql', txt: 'text',
  json: 'json', yml: 'yaml', yaml: 'yaml', md: 'markdown', markdown: 'markdown',
  cmake: 'cmake', mk: 'makefile', sh: 'bash', bash: 'bash', zsh: 'bash',
  html: 'html', htm: 'html', xml: 'html', css: 'css', ipp: 'cpp', tpp: 'cpp',
};

const BY_NAME: Record<string, string> = {
  'cmakelists.txt': 'cmake',
  makefile: 'makefile',
  gnumakefile: 'makefile',
  dockerfile: 'bash',
  '.clang-format': 'yaml',
  '.clang-tidy': 'yaml',
  '.gitignore': 'text',
};

export function languageFromFileName(name: string): string | null {
  const base = name.trim().split('/').pop()?.toLowerCase() ?? '';
  if (BY_NAME[base]) return BY_NAME[base];
  const m = /\.([A-Za-z0-9]+)$/.exec(base);
  return m ? (BY_EXT[m[1]] ?? null) : null;
}

/** A rough guess from the code itself, used when code is pasted. */
export function guessLanguage(code: string): string | null {
  const s = code.slice(0, 4000);
  const has = (re: RegExp) => re.test(s);
  if (has(/^\s*package\s+\w+\s*$/m) && has(/\bfunc\s+\w*\s*\(/)) return 'go';
  if (has(/^\s*#\s*include\s*[<"]/m)) {
    return has(/\b(std::|cout|cin|template\s*<|namespace|class\s+\w+|vector<|auto\s+\w+\s*=|nullptr)\b/)
      ? 'cpp'
      : 'c';
  }
  if (has(/\busing\s+namespace\s+std\b|\bstd::/)) return 'cpp';
  if (has(/^\s*fn\s+\w+\s*\(|\blet\s+mut\b|println!\(/m)) return 'rust';
  if (has(/^\s*(def|class)\s+\w+.*:\s*$/m) || has(/^\s*(from\s+\w+\s+)?import\s+\w+\s*$/m) && has(/:\s*$/m)) {
    return 'python';
  }
  if (has(/\bpublic\s+static\s+void\s+main\s*\(|\bSystem\.out\.print/)) return 'java';
  if (has(/\bConsole\.Write|\busing\s+System\s*;|\bnamespace\s+\w+\s*;/)) return 'csharp';
  if (has(/\bfun\s+main\s*\(|\bval\s+\w+\s*[:=]/)) return 'kotlin';
  if (has(/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE)\b/im)) return 'sql';
  if (has(/:\s*(string|number|boolean)\b|\binterface\s+\w+\s*\{|\btype\s+\w+\s*=|<T>/)) {
    return 'typescript';
  }
  if (has(/\b(const|let|var)\s+\w+\s*=|=>|\bfunction\s+\w+\s*\(|console\.log/)) {
    return 'javascript';
  }
  return null;
}
