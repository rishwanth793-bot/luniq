/**
 * LUNIQ Server Entry Point
 * Express server binding to 0.0.0.0:3000 with Vite middleware in dev and static serving in prod.
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes.ts';
import { loadDatabase, seedDemoMission, db } from './server/db.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Body parsers
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Load database
  loadDatabase();
  const missions = db.getMissions();
  if (missions.length === 0) {
    db.createMission({
      id: 'mission_active',
      mission_name: 'LUNIQ Workspace',
      description: 'Multi-pass lunar observation reconstruction workspace.',
      status: 'active',
      target_feature: 'Lunar Surface Target',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      observation_count: 0,
    });
  }

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'LUNIQ Aerospace Photogrammetry Engine', timestamp: new Date().toISOString() });
  });

  // Mount REST API router FIRST
  app.use('/api', apiRouter);

  // Serve static uploaded storage files if requested
  app.use('/storage', express.static(path.resolve(process.cwd(), 'data/storage')));

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LUNIQ] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[LUNIQ] Failed to start server:', err);
  process.exit(1);
});
