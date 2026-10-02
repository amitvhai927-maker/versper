/**
 * Vesper Messenger - Client API Service
 */

import {
  User,
  Conversation,
  Message,
  StatusItem,
  CallRecord,
  SessionDevice,
  AdminReport,
  AuditLog,
  SystemHealthMetrics,
} from '../../packages/models/types.ts';

const BASE_URL = '/api';

export const api = {
  // Auth
  async requestOtp(phone: string): Promise<{ success: boolean; message: string; devHintCode?: string }> {
    const res = await fetch(`${BASE_URL}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return res.json();
  },

  async verifyOtp(phone: string, code: string, platform = 'web'): Promise<{
    success: boolean;
    token: string;
    user: User;
    session: SessionDevice;
    error?: string;
  }> {
    const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, platform }),
    });
    return res.json();
  },

  async getSessions(userId: string): Promise<{ sessions: SessionDevice[] }> {
    const res = await fetch(`${BASE_URL}/auth/sessions?userId=${userId}`);
    return res.json();
  },

  async revokeSession(sessionId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/auth/sessions/${sessionId}`, { method: 'DELETE' });
    return res.json();
  },

  async logoutAllDevices(userId: string, currentSessionId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/auth/logout-all-devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, currentSessionId }),
    });
    return res.json();
  },

  // Users
  async getMe(userId: string): Promise<{ user: User }> {
    const res = await fetch(`${BASE_URL}/users/me?userId=${userId}`);
    return res.json();
  },

  async updateMe(userId: string, updates: Partial<User>): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${BASE_URL}/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...updates }),
    });
    return res.json();
  },

  async searchUsers(query: string, currentUserId: string): Promise<{ users: User[] }> {
    const res = await fetch(`${BASE_URL}/users/search?q=${encodeURIComponent(query)}&currentUserId=${currentUserId}`);
    return res.json();
  },

  async getContacts(userId: string): Promise<{ contacts: User[] }> {
    const res = await fetch(`${BASE_URL}/users/contacts?userId=${userId}`);
    return res.json();
  },

  async addContact(userId: string, contactUserId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/users/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, contactUserId }),
    });
    return res.json();
  },

  async blockUser(userId: string, targetUserId: string): Promise<{ success: boolean; blockedUserIds: string[] }> {
    const res = await fetch(`${BASE_URL}/users/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, targetUserId }),
    });
    return res.json();
  },

  async unblockUser(userId: string, targetUserId: string): Promise<{ success: boolean; blockedUserIds: string[] }> {
    const res = await fetch(`${BASE_URL}/users/unblock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, targetUserId }),
    });
    return res.json();
  },

  async reportUser(payload: { reporterId: string; reportedUserId?: string; reportedGroupId?: string; reason: string }): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/users/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Conversations
  async getConversations(userId: string): Promise<{ conversations: Conversation[] }> {
    const res = await fetch(`${BASE_URL}/conversations?userId=${userId}`);
    return res.json();
  },

  async createConversation(payload: { creatorId: string; targetUserId?: string; type?: string; title?: string; avatar?: string; description?: string }): Promise<{ conversation: Conversation }> {
    const res = await fetch(`${BASE_URL}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async updateConversation(convId: string, updates: Partial<Conversation>): Promise<{ success: boolean; conversation: Conversation }> {
    const res = await fetch(`${BASE_URL}/conversations/${convId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async getMessages(convId: string): Promise<{ messages: Message[] }> {
    const res = await fetch(`${BASE_URL}/conversations/${convId}/messages`);
    return res.json();
  },

  async sendMessage(convId: string, payload: Partial<Message>): Promise<{ success: boolean; message: Message }> {
    const res = await fetch(`${BASE_URL}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async editMessage(convId: string, msgId: string, content: string): Promise<{ success: boolean; message: Message }> {
    const res = await fetch(`${BASE_URL}/conversations/${convId}/messages/${msgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return res.json();
  },

  async deleteMessage(convId: string, msgId: string): Promise<{ success: boolean; message: Message }> {
    const res = await fetch(`${BASE_URL}/conversations/${convId}/messages/${msgId}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async toggleReaction(convId: string, msgId: string, emoji: string, userId: string): Promise<{ success: boolean; reactions: any[] }> {
    const res = await fetch(`${BASE_URL}/conversations/${convId}/messages/${msgId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, userId }),
    });
    return res.json();
  },

  // Groups
  async createGroup(payload: { title: string; description?: string; avatar?: string; creatorId: string; memberIds?: string[] }): Promise<{ success: boolean; group: Conversation }> {
    const res = await fetch(`${BASE_URL}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async addGroupMembers(groupId: string, userIds: string[]): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds }),
    });
    return res.json();
  },

  async removeGroupMember(groupId: string, userId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
    return res.json();
  },

  async updateMemberRole(groupId: string, userId: string, role: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/groups/${groupId}/members/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    return res.json();
  },

  // Statuses (Stories)
  async getStatuses(): Promise<{ statuses: StatusItem[] }> {
    const res = await fetch(`${BASE_URL}/statuses`);
    return res.json();
  },

  async postStatus(payload: { userId: string; type: string; content?: string; mediaUrl?: string; backgroundColor?: string }): Promise<{ success: boolean; status: StatusItem }> {
    const res = await fetch(`${BASE_URL}/statuses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async viewStatus(statusId: string, viewerId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/statuses/${statusId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewerId }),
    });
    return res.json();
  },

  // Calls
  async getCalls(userId: string): Promise<{ calls: CallRecord[] }> {
    const res = await fetch(`${BASE_URL}/calls/history?userId=${userId}`);
    return res.json();
  },

  async initiateCall(payload: { callerId: string; receiverId: string; type: 'voice' | 'video' }): Promise<{ success: boolean; call: CallRecord }> {
    const res = await fetch(`${BASE_URL}/calls/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async updateCall(callId: string, updates: Partial<CallRecord>): Promise<{ success: boolean; call: CallRecord }> {
    const res = await fetch(`${BASE_URL}/calls/${callId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  // Media Upload
  async uploadMedia(fileName: string, fileData: string, mimeType: string, duration?: number): Promise<{ success: boolean; attachment: any }> {
    const res = await fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, fileData, mimeType, duration }),
    });
    return res.json();
  },

  // Admin
  async getAdminOverview(): Promise<{ metrics: { totalUsers: number; activeUsers: number; totalConversations: number; totalMessages: number; pendingReports: number; health: SystemHealthMetrics } }> {
    const res = await fetch(`${BASE_URL}/admin/overview`);
    return res.json();
  },

  async getAdminUsers(query = ''): Promise<{ users: User[] }> {
    const res = await fetch(`${BASE_URL}/admin/users?q=${encodeURIComponent(query)}`);
    return res.json();
  },

  async setAdminUserStatus(userId: string, isSuspended?: boolean, role?: string): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isSuspended, role }),
    });
    return res.json();
  },

  async getAdminReports(): Promise<{ reports: AdminReport[] }> {
    const res = await fetch(`${BASE_URL}/admin/reports`);
    return res.json();
  },

  async updateAdminReport(reportId: string, status: string, adminNotes?: string): Promise<{ success: boolean; report: AdminReport }> {
    const res = await fetch(`${BASE_URL}/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes }),
    });
    return res.json();
  },

  async getAdminAuditLogs(): Promise<{ logs: AuditLog[] }> {
    const res = await fetch(`${BASE_URL}/admin/audit-logs`);
    return res.json();
  },
};
