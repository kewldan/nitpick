// Small design-system controls: segmented control, switch, select, badges.

import type { ReactNode } from 'react';

import type { Severity } from '../../shared/types.ts';
import { t } from '../i18n/index.ts';
import { SEVERITY } from '../lib/text.ts';
import { Icon } from './Icon.tsx';

export function Seg<T extends string | number>({
  items,
  value,
  onChange,
  label,
  labelledBy,
  onBg,
  fill,
}: {
  items: { id: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  labelledBy?: string;
  onBg?: boolean;
  fill?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      aria-labelledby={labelledBy}
      className={`np-seg${onBg ? ' np-seg--on-bg' : ''}${fill ? ' np-seg--fill' : ''}`}
    >
      {items.map((it) => (
        <button
          key={String(it.id)}
          type="button"
          className="np-seg__item"
          aria-pressed={it.id === value}
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="np-switch"
      onClick={() => onChange(!checked)}
    >
      <span>{children}</span>
      <span className="np-switch__track" aria-hidden="true">
        <span className="np-switch__knob" />
      </span>
    </button>
  );
}

export function Select({
  id,
  value,
  onChange,
  options,
  minWidth,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
  minWidth?: number;
}) {
  return (
    <span className="np-select-wrap">
      <select
        id={id}
        className="np-select"
        value={value}
        style={{ minWidth }}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" />
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`np-badge np-badge--${severity}`}>
      <span className="np-dot" />
      {SEVERITY[severity].label}
    </span>
  );
}

export function Pill({
  tone,
  children,
}: {
  tone: Severity | 'outline';
  children: ReactNode;
}) {
  return (
    <span
      className={`np-badge np-pill ${tone === 'outline' ? 'np-pill--outline' : `np-badge--${tone}`}`}
    >
      <span className="np-dot" />
      {children}
    </span>
  );
}

export function Steps({ current }: { current: 1 | 2 | 3 }) {
  const labels = t().steps.items;
  return (
    <ol className="np-steps" aria-label={t().steps.label}>
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        return (
          <li
            key={label}
            className="np-step"
            aria-current={n === current ? 'step' : undefined}
            data-done={done || undefined}
          >
            <span className="np-step__num">{done ? '✓' : n}</span>
            {label}
            {n < labels.length && <span className="np-step__sep" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

/** Renders comment prose: `backticks` become inline code, URLs become links. */
export function Prose({ text }: { text: string }) {
  const parts = text.split('`');
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 && i < parts.length - 1 ? (
          <code key={i} className="np-code-inline">
            {p}
          </code>
        ) : (
          <Linkify key={i} text={i % 2 === 1 ? `\`${p}` : p} />
        ),
      )}
    </>
  );
}

function Linkify({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <a key={m.index} href={m[0]} target="_blank" rel="noopener noreferrer nofollow" className="np-link">
        {m[0]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
