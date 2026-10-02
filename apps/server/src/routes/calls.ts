import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { CallRecord } from '@/packages/models/types.ts';

export const callsRouter = Router();

// GET /api/calls/history
callsRouter.get('/history', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'usr_alex';
  const calls = Array.from(db.calls.values())
    .filter((c) => c.callerId === userId || c.receiverId === userId)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return res.status(200).json({ calls });
});

// POST /api/calls/initiate
callsRouter.post('/initiate', (req: Request, res: Response) => {
  const { callerId = 'usr_alex', receiverId, type = 'voice' } = req.body;
  if (!receiverId || !db.users.has(receiverId)) {
    return res.status(400).json({ error: 'Valid receiverId is required' });
  }

  const caller = db.users.get(callerId);
  const receiver = db.users.get(receiverId);

  const callId = 'call_' + Math.random().toString(36).substring(2, 9);
  const newCall: CallRecord = {
    id: callId,
    callerId,
    callerName: caller?.name || 'Caller',
    callerAvatar: caller?.profilePhoto || '',
    receiverId,
    receiverName: receiver?.name || 'Receiver',
    receiverAvatar: receiver?.profilePhoto || '',
    type: type as any,
    status: 'ringing',
    startTime: new Date().toISOString(),
    duration: 0,
  };

  db.calls.set(callId, newCall);
  return res.status(201).json({ success: true, call: newCall });
});

// PATCH /api/calls/:id
callsRouter.patch('/:id', (req: Request, res: Response) => {
  const call = db.calls.get(req.params.id);
  if (!call) return res.status(404).json({ error: 'Call not found' });

  const { status, duration } = req.body;
  if (status) call.status = status;
  if (duration !== undefined) {
    call.duration = duration;
    call.endTime = new Date().toISOString();
  }

  return res.status(200).json({ success: true, call });
});
