// Line icons from the design system: 16×16, 1.5 stroke, currentColor.

import type { ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  'chevron-down': <path d="M4 6l4 4 4-4" />,
  'arrow-right': <path d="M3 8h10M9 4l4 4-4 4" />,
  'arrow-left': <path d="M13 8H3M7 4L3 8l4 4" />,
  link: (
    <path d="M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 0 1 4 4l-1 1M9 11.5l-1 1a2.8 2.8 0 0 1-4-4l1-1" />
  ),
  copy: (
    <>
      <rect x="5" y="5" width="8.5" height="8.5" rx="1.5" />
      <path d="M10.5 5V3.5A1.5 1.5 0 0 0 9 2H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5H5" />
    </>
  ),
  check: <path d="M3 8.5l3 3 7-7" />,
  pencil: <path d="M10.5 2.5l3 3L6 13H3v-3z" />,
  trash: <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4" />,
  code: <path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" />,
  file: <path d="M4 1.5h5L12.5 5v9.5h-8.5zM9 1.5V5h3.5" />,
  lock: (
    <>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </>
  ),
  clock: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 1.5" />
    </>
  ),
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  external: <path d="M9 3h4v4M13 3L7.5 8.5M11 9.5V13H3V5h3.5" />,
  lines: <path d="M2 4h12M2 8h8M2 12h10" />,
  sun: (
    <>
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" />
    </>
  ),
  moon: <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z" />,
  plus: <path d="M8 3v10M3 8h10" />,
  reply: <path d="M6.5 4L3 7.5 6.5 11M3 7.5h6.5a3.5 3.5 0 0 1 3.5 3.5V12.5" />,
  refresh: <path d="M13 8a5 5 0 1 1-1.5-3.55M13 2.5V5h-2.5" />,
  alert: (
    <>
      <path d="M8 2l6 11H2z" />
      <path d="M8 6.5v3M8 11.5v.01" />
    </>
  ),
};

const WIDTH: Record<string, number> = {
  check: 2,
  file: 1.3,
  lines: 1.2,
  copy: 1.4,
  pencil: 1.4,
  trash: 1.4,
  code: 1.4,
  lock: 1.4,
  clock: 1.4,
};

export function Icon({
  name,
  size,
  strokeWidth,
}: {
  name: keyof typeof P | string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? WIDTH[name] ?? 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {P[name]}
    </svg>
  );
}

/** The Nitpick mark: a rounded tile with < > cut out. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="var(--text)" />
      <path
        d="M9.5 8L6 12l3.5 4M14.5 8L18 12l-3.5 4"
        stroke="var(--bg)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
