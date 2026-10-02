import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { authRouter } from './apps/server/src/routes/auth.ts';
import { usersRouter } from './apps/server/src/routes/users.ts';
import { conversationsRouter } from './apps/server/src/routes/conversations.ts';
import { groupsRouter } from './apps/server/src/routes/groups.ts';
import { statusesRouter } from './apps/server/src/routes/statuses.ts';
import { mediaRouter } from './apps/server/src/routes/media.ts';
import { callsRouter } from './apps/server/src/routes/calls.ts';
import { adminRouter } from './apps/server/src/routes/admin.ts';
import { VesperWebSocketServer } from './apps/server/src/websocket.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const port = parseInt(process.env.PORT || '3000', 10);

  // Body parser with 50MB limit for rich media
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // REST API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api/statuses', statusesRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api/calls', callsRouter);
  app.use('/api/admin', adminRouter);

  // Initialize WebSocket Server
  const wsServer = new VesperWebSocketServer(server);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Vesper Messenger Core Engine',
      timestamp: new Date().toISOString(),
      version: '2.4.0',
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Vesper Server] Running on http://0.0.0.0:${port}`);
    console.log(`[Vesper WS] WebSocket endpoint available at ws://0.0.0.0:${port}/ws`);
  });
}

startServer().catch((err) => {
  console.error('[Vesper Server Fatal]', err);
  process.exit(1);
});
