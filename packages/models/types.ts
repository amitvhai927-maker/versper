/**
 * Vesper Messenger - Core Domain Models & Type Definitions
 * Shared across Mobile (Flutter), Web (React), and Server (Node.js/Express)
 */

export type UserRole = 'user' | 'admin' | 'superadmin';
export type OnlineStatus = 'online' | 'offline' | 'away';
export type PlatformType = 'ios' | 'android' | 'web' | 'desktop';

export interface PrivacySettings {
  lastSeen: 'everyone' | 'contacts' | 'nobody';
  profilePhoto: 'everyone' | 'contacts' | 'nobody';
  status: 'everyone' | 'contacts' | 'nobody';
  readReceipts: boolean;
  onlineVisibility: 'everyone' | 'contacts' | 'nobody';
}

export interface User {
  id: string;
  username: string;
  phone: string;
  email?: string;
  name: string;
  profilePhoto: string;
  bio: string;
  onlineStatus: OnlineStatus;
  lastSeen: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
  role: UserRole;
  isSuspended?: boolean;
  privacySettings: PrivacySettings;
  blockedUserIds: string[];
}

export interface SessionDevice {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  platform: PlatformType;
  ipAddress: string;
  location?: string;
  lastActive: string;
  isCurrent?: boolean;
  pushToken?: string;
}

export type ConversationType = 'direct' | 'group' | 'channel' | 'broadcast';

export interface ConversationMember {
  conversationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  mutedUntil?: string | null;
  archived: boolean;
  pinned: boolean;
  user?: Partial<User>;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string;
  avatar: string;
  description?: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  members: ConversationMember[];
  adminOnlyMessaging?: boolean;
}

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'document'
  | 'location'
  | 'contact_card';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface MessageReaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export interface MessageMediaMeta {
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number; // audio/voice/video duration in seconds
  thumbnail?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  mediaMeta?: MessageMediaMeta;
  replyToId?: string;
  replyToMessage?: {
    id: string;
    senderName: string;
    content: string;
    type: MessageType;
  };
  isForwarded?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  status: MessageStatus;
  reactions: MessageReaction[];
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  idempotencyKey?: string;
}

export interface StatusViewer {
  userId: string;
  userName: string;
  userAvatar: string;
  viewedAt: string;
}

export interface StatusItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'text' | 'image' | 'video';
  content?: string;
  mediaUrl?: string;
  backgroundColor?: string;
  fontStyle?: string;
  createdAt: string;
  expiresAt: string;
  views: StatusViewer[];
  hiddenFrom?: string[];
}

export type CallType = 'voice' | 'video';
export type CallStatus =
  | 'ringing'
  | 'connected'
  | 'ended'
  | 'missed'
  | 'rejected'
  | 'busy';

export interface CallRecord {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  type: CallType;
  status: CallStatus;
  startTime: string;
  endTime?: string;
  duration?: number; // seconds
}

export interface AdminReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId?: string;
  reportedUserName?: string;
  reportedMessageId?: string;
  reportedGroupId?: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  adminNotes?: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: 'user' | 'group' | 'message' | 'system';
  targetId: string;
  details: string;
  timestamp: string;
}

export interface SystemHealthMetrics {
  serverUptimeSeconds: number;
  activeWebSocketConnections: number;
  messagesSentLastHour: number;
  databaseQueryLatencyMs: number;
  redisCacheHitRatio: number;
  memoryUsageMb: number;
  cpuLoadPercent: number;
}

// WebSocket Protocol Definitions
export type WSEventType =
  | 'connection.established'
  | 'auth.authenticate'
  | 'auth.authenticated'
  | 'message.send'
  | 'message.new'
  | 'message.delivered'
  | 'message.read'
  | 'message.edit'
  | 'message.delete'
  | 'message.react'
  | 'typing.start'
  | 'typing.stop'
  | 'presence.online'
  | 'presence.offline'
  | 'call.initiate'
  | 'call.offer'
  | 'call.answer'
  | 'call.ice_candidate'
  | 'call.reject'
  | 'call.end'
  | 'group.member_added'
  | 'group.member_removed'
  | 'group.updated';

export interface WSEvent<T = any> {
  event: WSEventType;
  payload: T;
  timestamp?: string;
}
