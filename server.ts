import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './server/app.ts';
import { connectDatabase } from './server/db/connection.ts';
import { config } from './server/config.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = createApp();

  // Start Database initialization in parallel so HTTP port binds immediately
  void connectDatabase();

  const isProduction = process.env.NODE_ENV === 'production';
  const port = config.port || 3000;

  if (!isProduction) {
    // Ensure HMR & file-watching are disabled in AI Studio preview unless explicitly enabled
    if (process.env.DISABLE_HMR === undefined) {
      process.env.DISABLE_HMR = 'true';
    }
    // In development: mount Vite dev server middlewares with HMR disabled
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // In production: serve static build assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Server] ไหน Receipt running at http://0.0.0.0:${port}`);
    console.log(`[AI] Gemini OCR Model: ${config.geminiModel}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
