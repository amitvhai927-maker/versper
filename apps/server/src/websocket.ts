import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { db } from './db.ts';
import { WSEvent, Message } from '@/packages/models/types.ts';

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  deviceId: string;
}

export class VesperWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, Set<ClientConnection>> = new Map(); // userId -> Set of active socket connections

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupListeners();
  }

  private setupListeners() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      let currentUserId = 'usr_alex'; // Default connection user if not yet authenticated
      let currentDeviceId = 'dev_' + Math.random().toString(36).substring(2, 7);

      // Parse query params for direct handshake auth if provided (e.g. /ws?userId=usr_alex)
      if (req.url) {
        try {
          const url = new URL(req.url, 'http://localhost');
          const uid = url.searchParams.get('userId');
          if (uid && db.users.has(uid)) {
            currentUserId = uid;
          }
          const dev = url.searchParams.get('deviceId');
          if (dev) currentDeviceId = dev;
        } catch {
          // ignore
        }
      }

      this.addClient(currentUserId, currentDeviceId, ws);

      // Send connection acknowledgement
      this.sendToSocket(ws, {
        event: 'connection.established',
        payload: {
          status: 'connected',
          userId: currentUserId,
          serverTime: new Date().toISOString(),
        },
      });

      // Broadcast user online presence
      this.broadcastPresence(currentUserId, 'online');

      ws.on('message', (data: Buffer | string) => {
        try {
          const msgStr = data.toString();
          const parsed = JSON.parse(msgStr) as WSEvent;
          this.handleEvent(ws, parsed, currentUserId, (newUid) => {
            if (newUid !== currentUserId) {
              this.removeClient(currentUserId, ws);
              currentUserId = newUid;
              this.addClient(currentUserId, currentDeviceId, ws);
            }
          });
        } catch (err) {
          console.error('[WS Error] Failed to parse message', err);
        }
      });

      ws.on('close', () => {
        this.removeClient(currentUserId, ws);
        // If user has no more open tabs/connections, mark offline
        if (!this.clients.has(currentUserId) || this.clients.get(currentUserId)!.size === 0) {
          this.broadcastPresence(currentUserId, 'offline');
          const user = db.users.get(currentUserId);
          if (user) {
            user.onlineStatus = 'offline';
            user.lastSeen = new Date().toISOString();
          }
        }
      });

      ws.on('error', (err) => {
        console.error('[WS Client Error]', err);
      });
    });
  }

  private handleEvent(
    ws: WebSocket,
    event: WSEvent,
    currentUserId: string,
    setUserId: (id: string) => void
  ) {
    switch (event.event) {
      case 'auth.authenticate': {
        const { userId } = event.payload || {};
        if (userId && db.users.has(userId)) {
          setUserId(userId);
          const u = db.users.get(userId);
          if (u) {
            u.onlineStatus = 'online';
            u.lastSeen = new Date().toISOString();
          }
          this.sendToSocket(ws, {
            event: 'auth.authenticated',
            payload: { userId, user: u },
          });
          this.broadcastPresence(userId, 'online');
        }
        break;
      }

      case 'message.send': {
        const {
          conversationId,
          type = 'text',
          content = '',
          mediaUrl,
          mediaMeta,
          replyToId,
          idempotencyKey,
        } = event.payload;

        const conv = db.conversations.get(conversationId);
        if (!conv) return;

        const sender = db.users.get(currentUserId);
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
          conversationId,
          senderId: currentUserId,
          senderName: sender?.name || 'User',
          senderAvatar: sender?.profilePhoto || '',
          type,
          content,
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

        // Broadcast to all conversation participants
        conv.members.forEach((member) => {
          this.sendToUser(member.userId, {
            event: 'message.new',
            payload: { message: newMsg, conversationId },
          });
        });
        break;
      }

      case 'message.read': {
        const { conversationId, messageIds, readerId } = event.payload;
        const conv = db.conversations.get(conversationId);
        if (conv) {
          conv.members.forEach((member) => {
            this.sendToUser(member.userId, {
              event: 'message.read',
              payload: { conversationId, messageIds, readerId: readerId || currentUserId },
            });
          });
        }
        break;
      }

      case 'message.delivered': {
        const { conversationId, messageId } = event.payload;
        const conv = db.conversations.get(conversationId);
        if (conv) {
          conv.members.forEach((member) => {
            this.sendToUser(member.userId, {
              event: 'message.delivered',
              payload: { conversationId, messageId },
            });
          });
        }
        break;
      }

      case 'typing.start':
      case 'typing.stop': {
        const { conversationId } = event.payload;
        const conv = db.conversations.get(conversationId);
        if (conv) {
          const sender = db.users.get(currentUserId);
          conv.members.forEach((member) => {
            if (member.userId !== currentUserId) {
              this.sendToUser(member.userId, {
                event: event.event,
                payload: {
                  conversationId,
                  userId: currentUserId,
                  userName: sender?.name || 'Someone',
                },
              });
            }
          });
        }
        break;
      }

      case 'message.edit': {
        const { messageId, content, conversationId } = event.payload;
        const updated = db.updateMessage(messageId, { content });
        if (updated) {
          const conv = db.conversations.get(conversationId);
          conv?.members.forEach((m) => {
            this.sendToUser(m.userId, {
              event: 'message.edit',
              payload: { message: updated, conversationId },
            });
          });
        }
        break;
      }

      case 'message.delete': {
        const { messageId, conversationId } = event.payload;
        const deleted = db.deleteMessage(messageId);
        if (deleted) {
          const conv = db.conversations.get(conversationId);
          conv?.members.forEach((m) => {
            this.sendToUser(m.userId, {
              event: 'message.delete',
              payload: { message: deleted, conversationId },
            });
          });
        }
        break;
      }

      case 'message.react': {
        const { messageId, emoji, conversationId } = event.payload;
        const msg = db.messages.get(messageId);
        if (msg) {
          let existing = msg.reactions.find((r) => r.emoji === emoji);
          if (existing) {
            if (existing.userIds.includes(currentUserId)) {
              existing.userIds = existing.userIds.filter((id) => id !== currentUserId);
              existing.count = existing.userIds.length;
              if (existing.count === 0) {
                msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
              }
            } else {
              existing.userIds.push(currentUserId);
              existing.count = existing.userIds.length;
            }
          } else {
            msg.reactions.push({ emoji, userIds: [currentUserId], count: 1 });
          }

          const conv = db.conversations.get(conversationId);
          conv?.members.forEach((m) => {
            this.sendToUser(m.userId, {
              event: 'message.react',
              payload: { messageId, reactions: msg.reactions, conversationId },
            });
          });
        }
        break;
      }

      // WebRTC Calling Signaling Events
      case 'call.initiate': {
        const { targetUserId, call } = event.payload;
        if (targetUserId) {
          const hasActivePeer = this.clients.has(targetUserId) && this.clients.get(targetUserId)!.size > 0;
          if (hasActivePeer) {
            this.sendToUser(targetUserId, {
              event: 'call.initiate',
              payload: {
                ...event.payload,
                senderId: currentUserId,
              },
            });
          } else {
            // Simulated peer response for instant offline/persona testing
            setTimeout(() => {
              this.sendToUser(currentUserId, {
                event: 'call.answer',
                payload: {
                  targetUserId: currentUserId,
                  senderId: targetUserId,
                  callId: call?.id,
                  simulated: true,
                },
              });
            }, 1800);
          }
        }
        break;
      }

      case 'call.offer':
      case 'call.answer':
      case 'call.ice_candidate':
      case 'call.reject':
      case 'call.end': {
        const { targetUserId } = event.payload;
        if (targetUserId) {
          this.sendToUser(targetUserId, {
            event: event.event,
            payload: {
              ...event.payload,
              senderId: currentUserId,
            },
          });
        }
        break;
      }
    }
  }

  private addClient(userId: string, deviceId: string, ws: WebSocket) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add({ ws, userId, deviceId });
  }

  private removeClient(userId: string, ws: WebSocket) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      for (const client of userClients) {
        if (client.ws === ws) {
          userClients.delete(client);
          break;
        }
      }
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  public sendToUser(userId: string, event: WSEvent) {
    const userClients = this.clients.get(userId);
    if (!userClients) return;
    const msg = JSON.stringify(event);
    userClients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    });
  }

  public sendToSocket(ws: WebSocket, event: WSEvent) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  public broadcastPresence(userId: string, status: 'online' | 'offline') {
    const user = db.users.get(userId);
    const event: WSEvent = {
      event: status === 'online' ? 'presence.online' : 'presence.offline',
      payload: {
        userId,
        onlineStatus: status,
        lastSeen: new Date().toISOString(),
        userName: user?.name,
      },
    };
    const msg = JSON.stringify(event);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }
}
