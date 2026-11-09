import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import { ToastProvider } from './lib/hooks.tsx';
import { storage } from './lib/storage.ts';
import './styles/tokens.css';
import './styles/bundle.css';
import './styles/app.css';

// Apply the saved theme before the first paint.
document.documentElement.dataset.theme = storage.prefs({ theme: 'dark' }).theme;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
