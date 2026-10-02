import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { StatusItem } from '@/packages/models/types.ts';

export const statusesRouter = Router();

// GET /api/statuses
statusesRouter.get('/', (_req: Request, res: Response) => {
  const statuses = db.getActiveStatuses();
  return res.status(200).json({ statuses });
});

// POST /api/statuses
statusesRouter.post('/', (req: Request, res: Response) => {
  const { userId = 'usr_alex', type = 'text', content, mediaUrl, backgroundColor = '#0F172A' } = req.body;
  const user = db.users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const statusId = 'status_' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const newStatus: StatusItem = {
    id: statusId,
    userId,
    userName: user.name,
    userAvatar: user.profilePhoto,
    type: type as any,
    content,
    mediaUrl,
    backgroundColor,
    createdAt: now.toISOString(),
    expiresAt,
    views: [],
  };

  db.addStatus(newStatus);
  return res.status(201).json({ success: true, status: newStatus });
});

// POST /api/statuses/:id/view
statusesRouter.post('/:id/view', (req: Request, res: Response) => {
  const { viewerId = 'usr_alex' } = req.body;
  db.viewStatus(req.params.id, viewerId);
  return res.status(200).json({ success: true });
});

// DELETE /api/statuses/:id
statusesRouter.delete('/:id', (req: Request, res: Response) => {
  const deleted = db.statuses.delete(req.params.id);
  return res.status(200).json({ success: deleted });
});
