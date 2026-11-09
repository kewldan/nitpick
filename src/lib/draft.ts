// The mentor's working copy of a review, before and after publishing.

import type {
  Comment,
  Expiry,
  Review,
  ReviewInput,
  Verdict,
} from '../../shared/types.ts';
import { DEFAULT_FORMAT, type FormatOptions } from './format.ts';
import { language } from './languages.ts';
import { storage } from './storage.ts';

export interface Draft {
  title: string;
  language: string;
  fileName: string;
  /** What the mentor pasted. */
  raw: string;
  /** The formatted code being reviewed; empty until "Start review". */
  code: string;
  formatter: string;
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
  storage.savePrefs({
    language: d.language,
    fmt: d.fmt,
    reviewer: d.reviewer,
    expiry: d.expiry,
    allowResolve: d.allowResolve,
    allowReplies: d.allowReplies,
  } satisfies Prefs);
}

export function emptyDraft(): Draft {
  const p = prefs();
  return {
    title: '',
    language: p.language,
    fileName: '',
    raw: '',
    code: '',
    formatter: '',
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

export function toInput(d: Draft): ReviewInput {
  return {
    title: d.title.trim(),
    language: d.language,
    fileName: d.fileName.trim() || defaultFileName(d.language),
    code: d.code,
    original: d.raw,
    formatter: d.formatter,
    summary: d.summary.trim(),
    verdict: d.verdict,
    reviewer: d.reviewer.trim(),
    expiry: d.expiry,
    allowResolve: d.allowResolve,
    allowReplies: d.allowReplies,
    comments: d.comments.map(({ id, line, endLine, severity, text, suggestion }) => ({
      id,
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
    language: r.language,
    fileName: r.fileName,
    raw: r.original || r.code,
    code: r.code,
    formatter: r.formatter,
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

/** A stable fingerprint of what would be published, to detect unsaved edits. */
export function fingerprint(d: Draft): string {
  return JSON.stringify(toInput(d));
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
