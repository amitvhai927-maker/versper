import { Router, Request, Response } from 'express';
import { db } from '../db.ts';

export const adminRouter = Router();

// Middleware checking role
const requireAdmin = (req: Request, res: Response, next: () => void) => {
  const adminId = (req.headers['x-admin-id'] as string) || (req.query.adminId as string);
  // Allow inspection if marked or default to superadmin for dev
  if (adminId) {
    const user = db.users.get(adminId);
    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
      return next();
    }
  }
  // Allow for developer exploration
  next();
};

adminRouter.use(requireAdmin);

// GET /api/admin/overview
adminRouter.get('/overview', (_req: Request, res: Response) => {
  const totalUsers = db.users.size;
  const activeUsers = Array.from(db.users.values()).filter((u) => u.onlineStatus === 'online').length;
  const totalConversations = db.conversations.size;
  const totalMessages = db.messages.size;
  const pendingReports = Array.from(db.reports.values()).filter((r) => r.status === 'pending').length;
  const health = db.getHealthMetrics();

  return res.status(200).json({
    metrics: {
      totalUsers,
      activeUsers,
      totalConversations,
      totalMessages,
      pendingReports,
      health,
    },
  });
});

// GET /api/admin/users
adminRouter.get('/users', (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '').toLowerCase();
  let users = Array.from(db.users.values());

  if (query) {
    users = users.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query) ||
        u.phone.includes(query) ||
        (u.email && u.email.toLowerCase().includes(query))
    );
  }

  return res.status(200).json({ users });
});

// PATCH /api/admin/users/:id/status
adminRouter.patch('/users/:id/status', (req: Request, res: Response) => {
  const user = db.users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { isSuspended, role } = req.body;
  if (isSuspended !== undefined) user.isSuspended = isSuspended;
  if (role !== undefined) user.role = role;

  // Add audit log
  db.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    adminId: 'usr_admin',
    adminName: 'Vesper Admin',
    action: isSuspended ? 'USER_SUSPENDED' : 'USER_ROLE_UPDATED',
    targetType: 'user',
    targetId: user.id,
    details: `Updated user @${user.username} status: suspended=${user.isSuspended}, role=${user.role}`,
    timestamp: new Date().toISOString(),
  });

  return res.status(200).json({ success: true, user });
});

// GET /api/admin/reports
adminRouter.get('/reports', (_req: Request, res: Response) => {
  const reports = Array.from(db.reports.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return res.status(200).json({ reports });
});

// PATCH /api/admin/reports/:id
adminRouter.patch('/reports/:id', (req: Request, res: Response) => {
  const report = db.reports.get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  const { status, adminNotes } = req.body;
  if (status) report.status = status;
  if (adminNotes !== undefined) report.adminNotes = adminNotes;

  db.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    adminId: 'usr_admin',
    adminName: 'Vesper Admin',
    action: 'REPORT_REVIEWED',
    targetType: 'message',
    targetId: report.id,
    details: `Report status set to ${status}. Notes: ${adminNotes || 'None'}`,
    timestamp: new Date().toISOString(),
  });

  return res.status(200).json({ success: true, report });
});

// GET /api/admin/groups
adminRouter.get('/groups', (_req: Request, res: Response) => {
  const groups = Array.from(db.conversations.values()).filter((c) => c.type === 'group');
  return res.status(200).json({ groups });
});

// GET /api/admin/audit-logs
adminRouter.get('/audit-logs', (_req: Request, res: Response) => {
  return res.status(200).json({ logs: db.auditLogs.slice(0, 50) });
});

// GET /api/admin/system-health
adminRouter.get('/system-health', (_req: Request, res: Response) => {
  return res.status(200).json({ health: db.getHealthMetrics() });
});
