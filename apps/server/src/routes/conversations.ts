import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { Message, MessageType, Conversation } from '@/packages/models/types.ts';

export const conversationsRouter = Router();

// GET /api/conversations
conversationsRouter.get('/', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'usr_alex';
  const list = db.getConversationsForUser(userId);
  return res.status(200).json({ conversations: list });
});

// POST /api/conversations (Start new 1:1 or Group conversation)
conversationsRouter.post('/', (req: Request, res: Response) => {
  const { creatorId = 'usr_alex', targetUserId, type = 'direct', title, avatar, description } = req.body;

  if (type === 'direct') {
    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required for direct chat' });
    }

    // Check if direct conversation already exists between creator and target
    for (const conv of db.conversations.values()) {
      if (conv.type === 'direct') {
        const uids = conv.members.map((m) => m.userId);
        if (uids.includes(creatorId) && uids.includes(targetUserId)) {
          return res.status(200).json({ conversation: conv, alreadyExists: true });
        }
      }
    }

    const targetUser = db.users.get(targetUserId);
    const creatorUser = db.users.get(creatorId);

    const convId = 'conv_' + Math.random().toString(36).substring(2, 9);
    const newConv: Conversation = {
      id: convId,
      type: 'direct',
      title: targetUser?.name || 'Direct Chat',
      avatar: targetUser?.profilePhoto || '',
      creatorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unreadCount: 0,
      members: [
        {
          conversationId: convId,
          userId: creatorId,
          role: 'member',
          joinedAt: new Date().toISOString(),
          archived: false,
          pinned: false,
          user: creatorUser,
        },
        {
          conversationId: convId,
          userId: targetUserId,
          role: 'member',
          joinedAt: new Date().toISOString(),
          archived: false,
          pinned: false,
          user: targetUser,
        },
      ],
    };

    db.conversations.set(convId, newConv);
    return res.status(201).json({ conversation: newConv });
  }

  // Group creation
  const convId = 'conv_' + Math.random().toString(36).substring(2, 9);
  const creatorUser = db.users.get(creatorId);
  const newGroup: Conversation = {
    id: convId,
    type: 'group',
    title: title || 'New Group',
    avatar: avatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
    description: description || '',
    creatorId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    members: [
      {
        conversationId: convId,
        userId: creatorId,
        role: 'owner',
        joinedAt: new Date().toISOString(),
        archived: false,
        pinned: false,
        user: creatorUser,
      },
    ],
  };

  db.conversations.set(convId, newGroup);
  return res.status(201).json({ conversation: newGroup });
});

// GET /api/conversations/:id
conversationsRouter.get('/:id', (req: Request, res: Response) => {
  const conv = db.conversations.get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  return res.status(200).json({ conversation: conv });
});

// PATCH /api/conversations/:id
conversationsRouter.patch('/:id', (req: Request, res: Response) => {
  const conv = db.conversations.get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const { isPinned, isArchived, isMuted, unreadCount, title, description, avatar } = req.body;
  if (isPinned !== undefined) conv.isPinned = isPinned;
  if (isArchived !== undefined) conv.isArchived = isArchived;
  if (isMuted !== undefined) conv.isMuted = isMuted;
  if (unreadCount !== undefined) conv.unreadCount = unreadCount;
  if (title !== undefined) conv.title = title;
  if (description !== undefined) conv.description = description;
  if (avatar !== undefined) conv.avatar = avatar;

  return res.status(200).json({ success: true, conversation: conv });
});

// DELETE /api/conversations/:id
conversationsRouter.delete('/:id', (req: Request, res: Response) => {
  const deleted = db.conversations.delete(req.params.id);
  return res.status(200).json({ success: deleted });
});

// GET /api/conversations/:id/messages
conversationsRouter.get('/:id/messages', (req: Request, res: Response) => {
  const convId = req.params.id;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const messages = db.getMessagesForConversation(convId, limit);
  return res.status(200).json({ messages });
});

// POST /api/conversations/:id/messages
conversationsRouter.post('/:id/messages', (req: Request, res: Response) => {
  const convId = req.params.id;
  const {
    senderId = 'usr_alex',
    type = 'text',
    content,
    mediaUrl,
    mediaMeta,
    replyToId,
    idempotencyKey,
  } = req.body;

  if (!content && !mediaUrl) {
    return res.status(400).json({ error: 'Message content or mediaUrl is required' });
  }

  // Prevent duplicate messages if idempotencyKey supplied
  if (idempotencyKey) {
    for (const m of db.messages.values()) {
      if (m.idempotencyKey === idempotencyKey) {
        return res.status(200).json({ message: m, duplicatePrevented: true });
      }
    }
  }

  const sender = db.users.get(senderId);
  const msgId = 'msg_' + Math.random().toString(36).substring(2, 9);

  let replyToMessage;
  if (replyToId) {
    const parent = db.messages.get(replyToId);
    if (parent) {
      replyToMessage = {
        id: parent.id,
        senderName: parent.senderName,
        content: parent.content,
        type: parent.type,
      };
    }
  }

  const newMsg: Message = {
    id: msgId,
    conversationId: convId,
    senderId,
    senderName: sender?.name || 'Unknown',
    senderAvatar: sender?.profilePhoto || '',
    type: type as MessageType,
    content: content || '',
    mediaUrl,
    mediaMeta,
    replyToId,
    replyToMessage,
    status: 'sent',
    reactions: [],
    createdAt: new Date().toISOString(),
    idempotencyKey,
  };

  db.addMessage(newMsg);
  return res.status(201).json({ success: true, message: newMsg });
});

// PATCH /api/conversations/:id/messages/:msgId
conversationsRouter.patch('/:id/messages/:msgId', (req: Request, res: Response) => {
  const { content, status } = req.body;
  const updated = db.updateMessage(req.params.msgId, {
    ...(content !== undefined ? { content, isEdited: true } : {}),
    ...(status !== undefined ? { status } : {}),
  });

  if (!updated) return res.status(404).json({ error: 'Message not found' });
  return res.status(200).json({ success: true, message: updated });
});

// DELETE /api/conversations/:id/messages/:msgId
conversationsRouter.delete('/:id/messages/:msgId', (req: Request, res: Response) => {
  const deleted = db.deleteMessage(req.params.msgId);
  if (!deleted) return res.status(404).json({ error: 'Message not found' });
  return res.status(200).json({ success: true, message: deleted });
});

// POST /api/conversations/:id/messages/:msgId/reactions
conversationsRouter.post('/:id/messages/:msgId/reactions', (req: Request, res: Response) => {
  const { userId = 'usr_alex', emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

  const msg = db.messages.get(req.params.msgId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  let existing = msg.reactions.find((r) => r.emoji === emoji);
  if (existing) {
    if (existing.userIds.includes(userId)) {
      // Toggle off / remove reaction
      existing.userIds = existing.userIds.filter((id) => id !== userId);
      existing.count = existing.userIds.length;
      if (existing.count === 0) {
        msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      existing.userIds.push(userId);
      existing.count = existing.userIds.length;
    }
  } else {
    msg.reactions.push({
      emoji,
      userIds: [userId],
      count: 1,
    });
  }

  return res.status(200).json({ success: true, reactions: msg.reactions });
});
