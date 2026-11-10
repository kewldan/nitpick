import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import { ToastProvider } from './lib/hooks.tsx';
import { t } from './i18n/index.ts';
import { storage } from './lib/storage.ts';
import './styles/tokens.css';
import './styles/bundle.css';
import './styles/app.css';

// Apply the saved theme before the first paint.
document.documentElement.dataset.theme = storage.prefs({ theme: 'dark' }).theme;
document.documentElement.lang = t().meta.htmlLang;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
