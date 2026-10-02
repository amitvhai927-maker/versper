import { Router, Request, Response } from 'express';
import { db } from '../db.ts';

export const usersRouter = Router();

// GET /api/users/me
usersRouter.get('/me', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'usr_alex';
  const user = db.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.status(200).json({ user });
});

// PATCH /api/users/me
usersRouter.patch('/me', (req: Request, res: Response) => {
  const userId = (req.body.userId as string) || (req.query.userId as string) || 'usr_alex';
  const user = db.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { name, bio, profilePhoto, username, privacySettings } = req.body;
  if (name !== undefined) user.name = name;
  if (bio !== undefined) user.bio = bio;
  if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
  if (username !== undefined) user.username = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (privacySettings) {
    user.privacySettings = { ...user.privacySettings, ...privacySettings };
  }
  user.updatedAt = new Date().toISOString();

  return res.status(200).json({ success: true, user });
});

// GET /api/users/search
usersRouter.get('/search', (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '').toLowerCase().trim();
  const currentUserId = (req.query.currentUserId as string) || 'usr_alex';

  if (!query) {
    return res.status(200).json({ users: [] });
  }

  const matches = Array.from(db.users.values()).filter((u) => {
    if (u.id === currentUserId) return false;
    return (
      u.name.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query) ||
      u.phone.includes(query)
    );
  });

  return res.status(200).json({ users: matches });
});

// GET /api/users/contacts
usersRouter.get('/contacts', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'usr_alex';
  const contactIds = db.contacts.get(userId) || new Set();
  const contactList = Array.from(contactIds)
    .map((id) => db.users.get(id))
    .filter(Boolean);

  return res.status(200).json({ contacts: contactList });
});

// POST /api/users/contacts
usersRouter.post('/contacts', (req: Request, res: Response) => {
  const { userId = 'usr_alex', contactUserId } = req.body;
  if (!contactUserId || !db.users.has(contactUserId)) {
    return res.status(400).json({ error: 'Valid contactUserId required' });
  }

  if (!db.contacts.has(userId)) {
    db.contacts.set(userId, new Set());
  }
  db.contacts.get(userId)?.add(contactUserId);

  return res.status(200).json({ success: true, message: 'Contact added' });
});

// DELETE /api/users/contacts/:id
usersRouter.delete('/contacts/:id', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'usr_alex';
  const contactId = req.params.id;

  db.contacts.get(userId)?.delete(contactId);
  return res.status(200).json({ success: true, message: 'Contact removed' });
});

// POST /api/users/block
usersRouter.post('/block', (req: Request, res: Response) => {
  const { userId = 'usr_alex', targetUserId } = req.body;
  const user = db.users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.blockedUserIds.includes(targetUserId)) {
    user.blockedUserIds.push(targetUserId);
  }
  return res.status(200).json({ success: true, blockedUserIds: user.blockedUserIds });
});

// POST /api/users/unblock
usersRouter.post('/unblock', (req: Request, res: Response) => {
  const { userId = 'usr_alex', targetUserId } = req.body;
  const user = db.users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.blockedUserIds = user.blockedUserIds.filter((id) => id !== targetUserId);
  return res.status(200).json({ success: true, blockedUserIds: user.blockedUserIds });
});

// POST /api/users/report
usersRouter.post('/report', (req: Request, res: Response) => {
  const { reporterId = 'usr_alex', reportedUserId, reportedMessageId, reportedGroupId, reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Reason is required' });

  const reporter = db.users.get(reporterId);
  const reportedUser = reportedUserId ? db.users.get(reportedUserId) : undefined;

  const report = {
    id: 'rep_' + Math.random().toString(36).substring(2, 9),
    reporterId,
    reporterName: reporter ? reporter.name : 'Unknown User',
    reportedUserId,
    reportedUserName: reportedUser?.name,
    reportedMessageId,
    reportedGroupId,
    reason,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  };

  db.reports.set(report.id, report);
  return res.status(201).json({ success: true, report });
});

// DELETE /api/users/delete-account
usersRouter.delete('/delete-account', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId || !db.users.has(userId)) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.users.delete(userId);
  db.contacts.delete(userId);
  for (const s of db.sessions.values()) {
    if (s.userId === userId) db.sessions.delete(s.id);
  }

  return res.status(200).json({ success: true, message: 'Account deleted permanently' });
});
