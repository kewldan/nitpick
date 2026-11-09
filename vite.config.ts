import { getRequestListener } from '@hono/node-server';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

import { openStore, type Store } from './server/store.ts';

/** Serves the API from the Vite dev server, so `npm run dev` is one process. */
function devApi(): Plugin {
  let store: Store | null = null;
  return {
    name: 'nitpick-dev-api',
    apply: 'serve',
    configureServer(server) {
      store ??= openStore('./data/dev.db');
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        try {
          const mod = await server.ssrLoadModule('/server/app.ts');
          const app = mod.createApp({ store });
          await getRequestListener(app.fetch)(req, res);
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
  server: { port: 5173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
});
