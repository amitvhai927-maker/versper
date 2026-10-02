import { Router, Request, Response } from 'express';
import { db } from '../db.ts';

export const authRouter = Router();

// POST /api/auth/request-otp
authRouter.post('/request-otp', (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'Valid phone number is required (e.g. +15551234567)' });
  }

  const code = db.generateOtp(phone.trim());
  return res.status(200).json({
    success: true,
    message: 'Verification OTP sent successfully',
    expiresInSeconds: 300,
    devHintCode: code, // Provided for instant seamless testing in development/sandbox
  });
});

// POST /api/auth/verify-otp
authRouter.post('/verify-otp', (req: Request, res: Response) => {
  const { phone, code, deviceName = 'Web Browser', platform = 'web' } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone number and verification code are required' });
  }

  const result = db.verifyOtp(phone.trim(), code.trim());
  if (!result.success || !result.user) {
    return res.status(400).json({ error: result.error || 'Verification failed' });
  }

  const user = result.user;
  user.onlineStatus = 'online';
  user.lastSeen = new Date().toISOString();

  // Create session
  const sessionId = 'sess_' + Math.random().toString(36).substring(2, 9);
  const session = {
    id: sessionId,
    userId: user.id,
    deviceId: 'dev_' + Math.random().toString(36).substring(2, 9),
    deviceName,
    platform: (platform as any) || 'web',
    ipAddress: req.ip || '127.0.0.1',
    lastActive: new Date().toISOString(),
    isCurrent: true,
  };
  db.sessions.set(sessionId, session);

  const token = 'vsp_tok_' + Buffer.from(JSON.stringify({ userId: user.id, sessionId, exp: Date.now() + 86400000 * 7 })).toString('base64');
  const refreshToken = 'vsp_ref_' + Math.random().toString(36).substring(2, 15);

  return res.status(200).json({
    success: true,
    token,
    refreshToken,
    user,
    session,
  });
});

// POST /api/auth/login-password (Optional email/password authentication)
authRouter.post('/login-password', (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required' });
  }

  // Find user by username or email
  const user = Array.from(db.users.values()).find(
    (u) => u.username === identifier || u.email === identifier
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Session
  const sessionId = 'sess_' + Math.random().toString(36).substring(2, 9);
  const session = {
    id: sessionId,
    userId: user.id,
    deviceId: 'dev_' + Math.random().toString(36).substring(2, 9),
    deviceName: 'Desktop Client',
    platform: 'desktop' as const,
    ipAddress: req.ip || '127.0.0.1',
    lastActive: new Date().toISOString(),
    isCurrent: true,
  };
  db.sessions.set(sessionId, session);

  const token = 'vsp_tok_' + Buffer.from(JSON.stringify({ userId: user.id, sessionId, exp: Date.now() + 86400000 * 7 })).toString('base64');

  return res.status(200).json({
    success: true,
    token,
    user,
    session,
  });
});

// GET /api/auth/sessions
authRouter.get('/sessions', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'usr_alex';
  const sessions = db.getSessions(userId);
  return res.status(200).json({ sessions });
});

// DELETE /api/auth/sessions/:id
authRouter.delete('/sessions/:id', (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const deleted = db.revokeSession(sessionId);
  return res.status(200).json({ success: deleted });
});

// POST /api/auth/logout-all-devices
authRouter.post('/logout-all-devices', (req: Request, res: Response) => {
  const { userId, currentSessionId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  db.revokeAllSessionsExcept(userId, currentSessionId || '');
  return res.status(200).json({ success: true, message: 'Terminated all other active sessions' });
});
