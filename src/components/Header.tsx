import type { ReactNode } from 'react';

import { navigate, useTheme } from '../lib/hooks.tsx';
import { Icon, LogoMark } from './Icon.tsx';

export function Header({
  crumb,
  middle,
  actions,
}: {
  crumb?: ReactNode;
  middle?: ReactNode;
  actions?: ReactNode;
}) {
  const [theme, toggle] = useTheme();
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <a
          href="/"
          className="app-brand"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            navigate('/');
          }}
        >
          <LogoMark />
          <span>Nitpick</span>
        </a>
        {crumb && (
          <>
            <span className="app-header__slash" aria-hidden="true">
              /
            </span>
            {crumb}
          </>
        )}
      </div>
      {middle}
      <div className="app-header__actions">
        {actions}
        <button
          type="button"
          className="np-btn np-btn--icon"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </div>
    </header>
  );
}
