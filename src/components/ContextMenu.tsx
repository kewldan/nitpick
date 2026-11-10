// A small right-click menu: keyboard navigable, closes on Esc, outside click,
// scroll or resize, and stays inside the viewport.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export interface MenuItem {
  key: string;
  label: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  onSelect: () => void;
}

export function ContextMenu({
  x,
  y,
  title,
  groups,
  onClose,
}: {
  x: number;
  y: number;
  title?: ReactNode;
  groups: MenuItem[][];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const items = groups.flat();
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 8;
    setPos({
      left: Math.max(pad, Math.min(x, window.innerWidth - r.width - pad)),
      top: Math.max(pad, y + r.height > window.innerHeight - pad ? y - r.height : y),
    });
    el.focus({ preventScroll: true });
  }, [x, y]);

  useEffect(() => {
    const close = () => onClose();
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('blur', close);
    };
  }, [onClose]);

  const choose = (i: number) => {
    onClose();
    items[i]?.onSelect();
  };

  let index = -1;
  return (
    <div
      ref={ref}
      className="ctx-menu"
      role="menu"
      tabIndex={-1}
      style={{ left: pos.left, top: pos.top }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActive((a) => (a + 1) % items.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActive((a) => (a - 1 + items.length) % items.length);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          choose(active);
        } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= items.length) {
          choose(Number(e.key) - 1);
        }
      }}
    >
      {title && <div className="ctx-menu__title">{title}</div>}
      {groups.map((group, gi) => (
        <div key={gi} className="ctx-menu__group" role="group">
          {group.map((item) => {
            index++;
            const i = index;
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="ctx-menu__item"
                data-active={i === active || undefined}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
              >
                {item.icon}
                <span className="ctx-menu__label">{item.label}</span>
                {item.hint && <span className="ctx-menu__hint">{item.hint}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
