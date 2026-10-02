import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { Conversation, ConversationMember } from '@/packages/models/types.ts';

export const groupsRouter = Router();

// POST /api/groups
groupsRouter.post('/', (req: Request, res: Response) => {
  const { title, description, avatar, creatorId = 'usr_alex', memberIds = [] } = req.body;
  if (!title) return res.status(400).json({ error: 'Group title is required' });

  const groupId = 'conv_grp_' + Math.random().toString(36).substring(2, 9);
  const creatorUser = db.users.get(creatorId);

  const members: ConversationMember[] = [
    {
      conversationId: groupId,
      userId: creatorId,
      role: 'owner',
      joinedAt: new Date().toISOString(),
      archived: false,
      pinned: false,
      user: creatorUser,
    },
  ];

  memberIds.forEach((uid: string) => {
    if (uid !== creatorId && db.users.has(uid)) {
      members.push({
        conversationId: groupId,
        userId: uid,
        role: 'member',
        joinedAt: new Date().toISOString(),
        archived: false,
        pinned: false,
        user: db.users.get(uid),
      });
    }
  });

  const group: Conversation = {
    id: groupId,
    type: 'group',
    title,
    description: description || '',
    avatar: avatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
    creatorId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    members,
    adminOnlyMessaging: false,
  };

  db.conversations.set(groupId, group);
  return res.status(201).json({ success: true, group });
});

// PATCH /api/groups/:id
groupsRouter.patch('/:id', (req: Request, res: Response) => {
  const group = db.conversations.get(req.params.id);
  if (!group || group.type !== 'group') {
    return res.status(404).json({ error: 'Group not found' });
  }

  const { title, description, avatar, adminOnlyMessaging } = req.body;
  if (title !== undefined) group.title = title;
  if (description !== undefined) group.description = description;
  if (avatar !== undefined) group.avatar = avatar;
  if (adminOnlyMessaging !== undefined) group.adminOnlyMessaging = adminOnlyMessaging;
  group.updatedAt = new Date().toISOString();

  return res.status(200).json({ success: true, group });
});

// POST /api/groups/:id/members
groupsRouter.post('/:id/members', (req: Request, res: Response) => {
  const group = db.conversations.get(req.params.id);
  if (!group || group.type !== 'group') {
    return res.status(404).json({ error: 'Group not found' });
  }

  const { userIds = [] } = req.body;
  userIds.forEach((uid: string) => {
    if (!group.members.some((m) => m.userId === uid) && db.users.has(uid)) {
      group.members.push({
        conversationId: group.id,
        userId: uid,
        role: 'member',
        joinedAt: new Date().toISOString(),
        archived: false,
        pinned: false,
        user: db.users.get(uid),
      });
    }
  });

  return res.status(200).json({ success: true, members: group.members });
});

// DELETE /api/groups/:id/members/:userId
groupsRouter.delete('/:id/members/:userId', (req: Request, res: Response) => {
  const group = db.conversations.get(req.params.id);
  if (!group || group.type !== 'group') {
    return res.status(404).json({ error: 'Group not found' });
  }

  group.members = group.members.filter((m) => m.userId !== req.params.userId);
  return res.status(200).json({ success: true, members: group.members });
});

// PATCH /api/groups/:id/members/:userId/role
groupsRouter.patch('/:id/members/:userId/role', (req: Request, res: Response) => {
  const group = db.conversations.get(req.params.id);
  if (!group || group.type !== 'group') {
    return res.status(404).json({ error: 'Group not found' });
  }

  const member = group.members.find((m) => m.userId === req.params.userId);
  if (!member) return res.status(404).json({ error: 'Member not found in group' });

  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin or member.' });
  }

  member.role = role;
  return res.status(200).json({ success: true, member });
});
