import { createServer as createViteServer } from 'vite';
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import { createApp } from './src/server/app';

dotenv.config();

/**
 * Server Entry Point
 *
 * Boots the configured Mind Bridge backend application and attaches Vite middleware in
 * development or serves optimized production assets from dist/.
 */
async function startServer() {
  const app = createApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Mount Vite dev server in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend assets in production mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MindBridge] Server running on http://localhost:${PORT}`);
  });
}

startServer();
