// The mentor's working copy of a review, before and after publishing.

import type {
  Comment,
  Expiry,
  Review,
  ReviewFile,
  ReviewInput,
  Verdict,
} from '../../shared/types.ts';
import { DEFAULT_FORMAT, type FormatOptions } from './format.ts';
import { language } from './languages.ts';
import { storage } from './storage.ts';
import { shortId } from './text.ts';

export interface DraftFile {
  /** Local id, stable across renames. */
  id: string;
  /** Path in the project; empty for a single pasted file not yet named. */
  path: string;
  language: string;
  /** What the mentor pasted or uploaded. */
  raw: string;
  /** The formatted code being reviewed; empty until "Start review". */
  code: string;
  formatter: string;
}

export interface Draft {
  title: string;
  files: DraftFile[];
  fmt: FormatOptions;
  summary: string;
  verdict: Verdict;
  reviewer: string;
  expiry: Expiry;
  allowResolve: boolean;
  allowReplies: boolean;
  comments: Comment[];
}

interface Prefs {
  language: string;
  fmt: FormatOptions;
  reviewer: string;
  expiry: Expiry;
  allowResolve: boolean;
  allowReplies: boolean;
}

const DEFAULT_PREFS: Prefs = {
  language: 'cpp',
  fmt: DEFAULT_FORMAT,
  reviewer: '',
  expiry: '7d',
  allowResolve: true,
  allowReplies: true,
};

export function prefs(): Prefs {
  return storage.prefs(DEFAULT_PREFS);
}

/** Remembers the choices a mentor makes the same way every time. */
export function rememberPrefs(d: Draft) {
  const single = d.files.length === 1 ? d.files[0].language : undefined;
  storage.savePrefs({
    ...(single ? { language: single } : {}),
    fmt: d.fmt,
    reviewer: d.reviewer,
    expiry: d.expiry,
    allowResolve: d.allowResolve,
    allowReplies: d.allowReplies,
  } satisfies Partial<Prefs>);
}

export function newFile(langId: string, path = '', raw = ''): DraftFile {
  return { id: shortId(), path, language: langId, raw, code: '', formatter: '' };
}

export function emptyDraft(): Draft {
  const p = prefs();
  return {
    title: '',
    files: [newFile(p.language)],
    fmt: p.fmt,
    summary: '',
    verdict: 'changes',
    reviewer: p.reviewer,
    expiry: p.expiry,
    allowResolve: p.allowResolve,
    allowReplies: p.allowReplies,
    comments: [],
  };
}

export function defaultFileName(langId: string) {
  return `main.${language(langId).ext}`;
}

/** The path a file is published under. */
export function filePath(f: DraftFile): string {
  return f.path.trim() || defaultFileName(f.language);
}

/** True once "Start review" has produced code to comment on. */
export function isStarted(d: Draft): boolean {
  return d.files.some((f) => f.code.trim());
}

/** Upgrades a draft saved before multi-file support. */
export function normalizeDraft(raw: unknown): Draft | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Draft & { raw?: string; code?: string; language?: string; fileName?: string; formatter?: string };
  if (Array.isArray(d.files)) return d;
  const file: DraftFile = {
    ...newFile(d.language ?? 'cpp', d.fileName ?? '', d.raw ?? ''),
    code: d.code ?? '',
    formatter: d.formatter ?? '',
  };
  const { raw: _r, code: _c, language: _l, fileName: _f, formatter: _fm, ...rest } = d;
  const path = filePath(file);
  return {
    ...rest,
    files: [file],
    comments: (d.comments ?? []).map((c) => ({ ...c, file: c.file ?? path })),
  };
}

function inputFiles(files: DraftFile[]): ReviewFile[] {
  return files
    .filter((f) => f.code.trim())
    .map((f) => ({
      path: filePath(f),
      language: f.language,
      code: f.code,
      original: f.raw,
      formatter: f.formatter,
    }));
}

export function toInput(d: Draft): ReviewInput {
  const files = inputFiles(d.files);
  const paths = new Set(files.map((f) => f.path));
  return {
    title: d.title.trim(),
    files,
    summary: d.summary.trim(),
    verdict: d.verdict,
    reviewer: d.reviewer.trim(),
    expiry: d.expiry,
    allowResolve: d.allowResolve,
    allowReplies: d.allowReplies,
    comments: d.comments
      .filter((c) => paths.has(c.file))
      .map(({ id, file, line, endLine, severity, text, suggestion }) => ({
        id,
        file,
        line,
        endLine,
        severity,
        text,
        suggestion,
      })),
  };
}

export function fromReview(r: Review): Draft {
  return {
    title: r.title,
    files: r.files.map((f) => ({
      id: shortId(),
      path: f.path,
      language: f.language,
      raw: f.original || f.code,
      code: f.code,
      formatter: f.formatter,
    })),
    fmt: prefs().fmt,
    summary: r.summary,
    verdict: r.verdict,
    reviewer: r.reviewer,
    expiry: r.expiry,
    allowResolve: r.allowResolve,
    allowReplies: r.allowReplies,
    comments: r.comments,
  };
}

// The files part is large; cache its serialization per files array.
const filesPrint = new WeakMap<DraftFile[], string>();

/** A stable fingerprint of what would be published, to detect unsaved edits. */
export function fingerprint(d: Draft): string {
  let fp = filesPrint.get(d.files);
  if (fp === undefined) {
    fp = JSON.stringify(inputFiles(d.files));
    filesPrint.set(d.files, fp);
  }
  const { files: _files, ...rest } = toInput(d);
  return `${fp}|${JSON.stringify(rest)}`;
}

export const SAMPLES: Record<string, string> = {
  cpp: '#include<bits/stdc++.h>\nusing namespace std;\n\nint sum(vector<int> v){int s=0;for(int i=0;i<v.size();i++){s+=v[i];}return s;}\nint main(){\n  int n;cin>>n;\n  int* a=new int[n];\n    for(int i=0;i<n;i++) cin>>a[i];\n  vector<int> v(a,a+n);\n  cout<<sum(v)<<endl;\nreturn 0;}',
  c: '#include <stdio.h>\n#include <stdlib.h>\nint main(){int n;scanf("%d",&n);\nint *a=malloc(n*sizeof(int));\nfor(int i=0;i<n;i++)scanf("%d",&a[i]);\nint best=a[0];for(int i=1;i<n;i++) if(a[i]>best)best=a[i];\nprintf("%d\\n",best);return 0;}',
  java: 'import java.util.*;\npublic class Main{public static void main(String[] args){Scanner sc=new Scanner(System.in);\nint n=sc.nextInt();List<Integer> xs=new ArrayList<>();\nfor(int i=0;i<n;i++){xs.add(sc.nextInt());}\nString out="";for(int x:xs){out+=x+" ";}\nSystem.out.println(out);}}',
  csharp: 'using System;\nusing System.Collections.Generic;\nclass Program{static void Main(){var n=int.Parse(Console.ReadLine());\nvar xs=new List<int>();for(int i=0;i<n;i++){xs.Add(int.Parse(Console.ReadLine()));}\nint s=0;foreach(var x in xs) s+=x;\nConsole.WriteLine(s/xs.Count);}}',
  python: 'def mean(xs) :\n    if len(xs)==0 :return 0\n    return sum(xs)/len(xs)\n\n\n\nprint(mean([1,2,3]))',
  go: 'package main\n\nimport "fmt"\n\nfunc sum(xs []int) int{\ntotal:=0\nfor _,x:=range xs{total+=x}\nreturn total}\nfunc main(){fmt.Println(sum([]int{1,2,3}))}',
  typescript: 'export function groupBy<T>(items:T[],key:(x:T)=>string){\nconst out:Record<string,T[]>={}\nfor(const it of items){const k=key(it)\nif(!out[k]) out[k]=[]\nout[k].push(it)}\nreturn out}',
  javascript: 'function debounce(fn,ms){let t\nreturn function(...args){clearTimeout(t);t=setTimeout(()=>fn.apply(this,args),ms)}}\nmodule.exports={debounce}',
  rust: 'fn main() {\n    let v = vec![1, 2, 3];\n    let mut s = 0;\n    for i in 0..v.len() { s += v[i]; }\n    println!("{}", s);\n}',
};
