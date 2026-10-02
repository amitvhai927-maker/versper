/**
 * Vesper Messenger - Unified Cross-Platform Application Entry Point
 * Supports: Responsive Web Desktop (3-column), iPhone 16 Touch Frame, Android Pixel 9 Frame
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Radio,
  Phone,
  Settings,
  Users,
  Shield,
  Smartphone,
  Plus,
  ArrowLeft,
  Volume2,
  Trash2,
} from 'lucide-react';
import {
  User,
  Conversation,
  Message,
  StatusItem,
  CallRecord,
} from '../packages/models/types.ts';
import { api } from './services/api.ts';
import { wsClient } from './services/websocket.ts';
import { TopBar } from './components/TopBar.tsx';
import { ChatList } from './components/ChatList.tsx';
import { ChatConversation } from './components/ChatConversation.tsx';
import { ConversationDetails } from './components/ConversationDetails.tsx';
import { StoryViewer } from './components/StoryViewer.tsx';
import { CallModal } from './components/CallModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { ContactsModal } from './components/ContactsModal.tsx';
import { GroupModal } from './components/GroupModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { webrtcManager } from './services/webrtc.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'chats' | 'stories' | 'calls' | 'settings' | 'admin'>('chats');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'iphone' | 'android'>('desktop');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);

  // Active overlays
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState<boolean>(false);
  const [showStoryViewer, setShowStoryViewer] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showContacts, setShowContacts] = useState<boolean>(false);
  const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState<boolean>(true);

  // Real-time state
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');

  // 1. Initial Load of default user
  const loadInitialData = useCallback(async (userId = 'usr_alex') => {
    try {
      const userRes = await api.getMe(userId);
      if (userRes.user) {
        setCurrentUser(userRes.user);
        wsClient.init(userRes.user.id);

        // Fetch conversations, statuses, calls
        const [convRes, statusRes, callsRes] = await Promise.all([
          api.getConversations(userRes.user.id),
          api.getStatuses(),
          api.getCalls(userRes.user.id),
        ]);

        if (convRes.conversations) {
          setConversations(convRes.conversations);
          if (convRes.conversations.length > 0 && !selectedConvId) {
            setSelectedConvId(convRes.conversations[0].id);
          }
        }
        if (statusRes.statuses) setStatuses(statusRes.statuses);
        if (callsRes.calls) setCallHistory(callsRes.calls);
      }
    } catch (err) {
      console.error('Failed to load initial Vesper data', err);
    }
  }, [selectedConvId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Fetch messages whenever selected conversation changes
  useEffect(() => {
    if (!selectedConvId) return;
    api.getMessages(selectedConvId).then((res) => {
      if (res.messages) {
        setMessages(res.messages);
        // Mark as read in WebSocket
        if (currentUser) {
          wsClient.send('message.read', {
            conversationId: selectedConvId,
            messageIds: res.messages.map((m) => m.id),
            readerId: currentUser.id,
          });
        }
      }
    });
  }, [selectedConvId, currentUser]);

  // 3. Setup WebSocket Event Listeners
  useEffect(() => {
    const unsubStatus = wsClient.on('status.change', ({ status }) => {
      setWsStatus(status);
    });

    const unsubNewMessage = wsClient.on('message.new', ({ message, conversationId }) => {
      if (conversationId === selectedConvId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              lastMessage: message,
              updatedAt: message.createdAt,
              unreadCount:
                conversationId === selectedConvId || message.senderId === currentUser?.id
                  ? 0
                  : c.unreadCount + 1,
            };
          }
          return c;
        })
      );
    });

    const unsubTypingStart = wsClient.on('typing.start', ({ conversationId, userName }) => {
      if (conversationId === selectedConvId) {
        setTypingUser(userName);
      }
    });

    const unsubTypingStop = wsClient.on('typing.stop', ({ conversationId }) => {
      if (conversationId === selectedConvId) {
        setTypingUser(null);
      }
    });

    const unsubReaction = wsClient.on('message.react', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    });

    const unsubEdit = wsClient.on('message.edit', ({ message }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    });

    const unsubDelete = wsClient.on('message.delete', ({ message }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    });

    const unsubPresence = wsClient.on('presence.online', ({ userId }) => {
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          members: c.members.map((m) =>
            m.userId === userId && m.user
              ? { ...m, user: { ...m.user, onlineStatus: 'online' as const } }
              : m
          ),
        }))
      );
    });

    const unsubCallInitiate = wsClient.on('call.initiate', ({ call }) => {
      if (call) {
        setActiveCall(call);
        setIsIncomingCall(true);
      }
    });

    const unsubCallOffer = wsClient.on('call.offer', ({ call }) => {
      if (call) {
        setActiveCall(call);
        setIsIncomingCall(true);
      }
    });

    const unsubCallAnswer = wsClient.on('call.answer', ({ answer }) => {
      setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
      if (answer) {
        webrtcManager.handleRemoteAnswer(answer);
      }
    });

    const unsubCallIce = wsClient.on('call.ice_candidate', ({ candidate }) => {
      if (candidate) {
        webrtcManager.handleRemoteIceCandidate(candidate);
      }
    });

    const unsubCallReject = wsClient.on('call.reject', () => {
      webrtcManager.endCall();
      setActiveCall(null);
      setIsIncomingCall(false);
    });

    const unsubCallEnd = wsClient.on('call.end', () => {
      webrtcManager.endCall();
      setActiveCall(null);
      setIsIncomingCall(false);
    });

    return () => {
      unsubStatus();
      unsubNewMessage();
      unsubTypingStart();
      unsubTypingStop();
      unsubReaction();
      unsubEdit();
      unsubDelete();
      unsubPresence();
      unsubCallInitiate();
      unsubCallOffer();
      unsubCallAnswer();
      unsubCallIce();
      unsubCallReject();
      unsubCallEnd();
    };
  }, [selectedConvId, currentUser]);

  // Messaging Actions
  const handleSendMessage = async (payload: Partial<Message>) => {
    if (!selectedConvId) return;

    // Send via WebSocket for real-time delivery
    wsClient.send('message.send', {
      ...payload,
      conversationId: selectedConvId,
    });
  };

  const handleEditMessage = (msgId: string, content: string) => {
    if (!selectedConvId) return;
    wsClient.send('message.edit', {
      messageId: msgId,
      content,
      conversationId: selectedConvId,
    });
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!selectedConvId) return;
    wsClient.send('message.delete', {
      messageId: msgId,
      conversationId: selectedConvId,
    });
  };

  const handleToggleReaction = (msgId: string, emoji: string) => {
    if (!selectedConvId) return;
    wsClient.send('message.react', {
      messageId: msgId,
      emoji,
      conversationId: selectedConvId,
    });
  };

  const handleTogglePin = async (convId: string, currentPinned: boolean) => {
    await api.updateConversation(convId, { isPinned: !currentPinned });
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, isPinned: !currentPinned } : c))
    );
  };

  const handleToggleMute = async (convId: string, currentMuted: boolean) => {
    await api.updateConversation(convId, { isMuted: !currentMuted });
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, isMuted: !currentMuted } : c))
    );
  };

  const handleToggleArchive = async (convId: string, currentArchived: boolean) => {
    await api.updateConversation(convId, { isArchived: !currentArchived });
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, isArchived: !currentArchived } : c))
    );
  };

  const handleDeleteConversation = async (convId: string) => {
    await api.updateConversation(convId, { isArchived: true });
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (selectedConvId === convId) {
      setSelectedConvId(conversations[0]?.id || null);
    }
  };

  // Call Handlers
  const handleStartCall = async (type: 'voice' | 'video', receiverId: string) => {
    if (!currentUser) return;
    const res = await api.initiateCall({
      callerId: currentUser.id,
      receiverId,
      type,
    });
    if (res.call) {
      setActiveCall(res.call);
      setIsIncomingCall(false);
      wsClient.send('call.initiate', {
        targetUserId: receiverId,
        call: res.call,
      });
      // Add to local history
      setCallHistory((prev) => [res.call, ...prev]);
    }
  };

  const handleAcceptCall = () => {
    if (activeCall) {
      webrtcManager.stopRinging();
      setActiveCall({ ...activeCall, status: 'connected' });
      wsClient.send('call.answer', {
        targetUserId: activeCall.callerId,
      });
    }
  };

  const handleRejectCall = () => {
    if (activeCall) {
      webrtcManager.endCall();
      wsClient.send('call.reject', {
        targetUserId: activeCall.callerId,
      });
      setActiveCall(null);
      setIsIncomingCall(false);
    }
  };

  const handleEndCall = () => {
    if (activeCall) {
      webrtcManager.endCall();
      wsClient.send('call.end', {
        targetUserId:
          activeCall.callerId === currentUser?.id
            ? activeCall.receiverId
            : activeCall.callerId,
      });
      api.updateCall(activeCall.id, { status: 'ended' });
      setActiveCall(null);
      setIsIncomingCall(false);
    }
  };

  const handleStartConversationWithUser = async (targetUserId: string) => {
    if (!currentUser) return;
    const res = await api.createConversation({
      creatorId: currentUser.id,
      targetUserId,
      type: 'direct',
    });
    if (res.conversation) {
      setConversations((prev) => {
        if (prev.some((c) => c.id === res.conversation.id)) return prev;
        return [res.conversation, ...prev];
      });
      setSelectedConvId(res.conversation.id);
      setActiveTab('chats');
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConvId);
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  if (!currentUser) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <AuthModal
          onSuccess={(u) => {
            setCurrentUser(u);
            loadInitialData(u.id);
          }}
        />
      </div>
    );
  }

  // --- Render Core Workspace ---
  const renderWorkspace = () => {
    if (activeTab === 'admin') {
      return <AdminDashboard />;
    }

    if (activeTab === 'calls') {
      return (
        <div className="flex-1 p-6 bg-slate-950 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-base font-semibold text-white">Call Log & Signaling History</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 text-xs">
              {callHistory.length === 0 ? (
                <p className="p-6 text-center text-slate-400">No recent calls</p>
              ) : (
                callHistory.map((call) => {
                  const isOutgoing = call.callerId === currentUser.id;
                  const peerName = isOutgoing ? call.receiverName : call.callerName;
                  return (
                    <div key={call.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center ${
                            call.status === 'missed'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-cyan-500/20 text-cyan-400'
                          }`}
                        >
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-white block">{peerName}</span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {isOutgoing ? 'Outgoing' : 'Incoming'} · {call.type} ·{' '}
                            {call.status}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {new Date(call.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'stories') {
      return (
        <div className="flex-1 p-6 bg-slate-950 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">24-Hour Stories</h2>
                <p className="text-xs text-slate-400">Photos, notes, and updates that disappear</p>
              </div>
              <button
                onClick={() => setShowStoryViewer(true)}
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Open Story Player</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {statuses.map((st) => (
                <div
                  key={st.id}
                  onClick={() => setShowStoryViewer(true)}
                  className="aspect-[3/4] rounded-2xl overflow-hidden p-3 relative cursor-pointer border border-slate-800 hover:scale-[1.02] transition-transform shadow-lg flex flex-col justify-between"
                  style={{ backgroundColor: st.backgroundColor || '#0F172A' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-700 ring-2 ring-white/30">
                      {st.userAvatar ? (
                        <img src={st.userAvatar} alt={st.userName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-white">
                          {st.userName.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white truncate drop-shadow">
                      {st.userName}
                    </span>
                  </div>

                  {st.mediaUrl ? (
                    <img
                      src={st.mediaUrl}
                      alt="Story"
                      className="absolute inset-0 w-full h-full object-cover -z-0"
                    />
                  ) : (
                    <p className="text-xs text-white/90 line-clamp-3 font-serif">
                      {st.content}
                    </p>
                  )}

                  <span className="text-[10px] text-white/80 font-mono self-end relative z-10 drop-shadow">
                    {new Date(st.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Default: 'chats' tab
    return (
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Chat List */}
        <div
          className={`${
            selectedConversation && deviceMode !== 'desktop' ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-96 shrink-0 h-full flex-col`}
        >
          <ChatList
            conversations={conversations}
            selectedConvId={selectedConvId}
            onSelectConversation={(id) => setSelectedConvId(id)}
            currentUser={currentUser}
            onTogglePin={handleTogglePin}
            onToggleMute={handleToggleMute}
            onToggleArchive={handleToggleArchive}
            onDeleteConversation={handleDeleteConversation}
            onCreateGroup={() => setShowGroupModal(true)}
          />
        </div>

        {/* Center Column: Active Conversation */}
        {selectedConversation ? (
          <div
            className={`${
              !selectedConversation && deviceMode !== 'desktop' ? 'hidden' : 'flex'
            } flex-1 h-full flex-col overflow-hidden`}
          >
            <ChatConversation
              conversation={selectedConversation}
              messages={messages}
              currentUser={currentUser}
              onSendMessage={handleSendMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onToggleReaction={handleToggleReaction}
              onStartCall={handleStartCall}
              onOpenDetails={() => setShowDetailsPanel(!showDetailsPanel)}
              typingUser={typingUser}
              onTypingStart={() => {
                if (selectedConvId) {
                  wsClient.send('typing.start', { conversationId: selectedConvId });
                }
              }}
              onTypingStop={() => {
                if (selectedConvId) {
                  wsClient.send('typing.stop', { conversationId: selectedConvId });
                }
              }}
              onBackMobile={() => setSelectedConvId(null)}
            />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center p-8 text-center text-slate-500 text-sm">
            Select a conversation to start messaging
          </div>
        )}

        {/* Right Column: Conversation Details (Desktop only) */}
        {deviceMode === 'desktop' && showDetailsPanel && selectedConversation && (
          <div className="hidden xl:flex h-full">
            <ConversationDetails
              conversation={selectedConversation}
              messages={messages}
              currentUser={currentUser}
              onClose={() => setShowDetailsPanel(false)}
              onTogglePin={handleTogglePin}
              onToggleMute={handleToggleMute}
              onToggleArchive={handleToggleArchive}
              onReport={() => {
                api.reportUser({
                  reporterId: currentUser.id,
                  reportedGroupId: selectedConversation.id,
                  reason: 'Inappropriate discussion content',
                });
                alert('Report submitted to administrator for audit review.');
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden font-sans">
      {/* Top Bar Contract */}
      <TopBar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        deviceMode={deviceMode}
        setDeviceMode={setDeviceMode}
        onNewChat={() => setShowContacts(true)}
        onOpenSettings={() => setShowSettings(true)}
        unreadCountTotal={totalUnread}
        wsStatus={wsStatus}
      />

      {/* Viewport Frame Container */}
      <div className="flex-1 flex overflow-hidden justify-center items-center">
        {deviceMode === 'desktop' ? (
          <main className="w-full h-full flex flex-col overflow-hidden">
            {renderWorkspace()}
          </main>
        ) : (
          /* Mobile Device Frame Simulation (iPhone 16 Pro / Android Pixel 9) */
          <div className="relative w-full max-w-[420px] h-[92vh] max-h-[850px] bg-slate-900 rounded-[44px] border-[8px] border-slate-800 shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-700/50">
            {/* Dynamic Island / Camera Notch */}
            <div className="h-7 w-full bg-slate-900 flex items-center justify-center shrink-0 z-40">
              <div
                className={`h-4 rounded-full bg-black flex items-center justify-center ${
                  deviceMode === 'iphone' ? 'w-28' : 'w-4 h-4'
                }`}
              />
            </div>

            {/* Mobile Body Workspace */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {renderWorkspace()}
            </div>

            {/* Bottom Mobile Tab Bar (Thumb Navigation Pattern) */}
            <div className="h-16 px-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 items-center shrink-0 z-30 select-none">
              <button
                onClick={() => setActiveTab('chats')}
                className={`flex flex-col items-center justify-center transition-colors ${
                  activeTab === 'chats' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-[10px] tracking-tight mt-1">Chats</span>
              </button>

              <button
                onClick={() => setActiveTab('stories')}
                className={`flex flex-col items-center justify-center transition-colors ${
                  activeTab === 'stories' ? 'text-pink-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Radio className="w-5 h-5" />
                <span className="text-[10px] tracking-tight mt-1">Status</span>
              </button>

              <button
                onClick={() => setActiveTab('calls')}
                className={`flex flex-col items-center justify-center transition-colors ${
                  activeTab === 'calls' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Phone className="w-5 h-5" />
                <span className="text-[10px] tracking-tight mt-1">Calls</span>
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span className="text-[10px] tracking-tight mt-1">Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global Modals & Overlays */}
      {showStoryViewer && (
        <StoryViewer
          statuses={statuses}
          currentUser={currentUser}
          onClose={() => setShowStoryViewer(false)}
          onPostStatus={async (payload) => {
            const res = await api.postStatus({ ...payload, userId: currentUser.id });
            if (res.status) setStatuses((prev) => [res.status, ...prev]);
          }}
          onReplyToStatus={(userId, text) => {
            handleStartConversationWithUser(userId).then(() => {
              handleSendMessage({ content: text, type: 'text' });
            });
          }}
          onViewStatus={(statusId) => {
            api.viewStatus(statusId, currentUser.id);
          }}
        />
      )}

      {activeCall && (
        <CallModal
          call={activeCall}
          currentUser={currentUser}
          isIncoming={isIncomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          onEnd={handleEndCall}
        />
      )}

      {showSettings && (
        <SettingsModal
          currentUser={currentUser}
          onClose={() => setShowSettings(false)}
          onUpdateUser={async (updates) => {
            const res = await api.updateMe(currentUser.id, updates);
            if (res.user) setCurrentUser(res.user);
          }}
          onLogout={() => {
            setShowSettings(false);
            setShowAuthModal(true);
          }}
          onDeleteAccount={async () => {
            await api.reportUser({
              reporterId: currentUser.id,
              reason: 'User account deletion request',
            });
            setShowSettings(false);
            setShowAuthModal(true);
          }}
        />
      )}

      {showContacts && (
        <ContactsModal
          currentUser={currentUser}
          onClose={() => setShowContacts(false)}
          onStartConversation={handleStartConversationWithUser}
          onCreateGroup={() => setShowGroupModal(true)}
        />
      )}

      {showGroupModal && (
        <GroupModal
          currentUser={currentUser}
          onClose={() => setShowGroupModal(false)}
          onGroupCreated={() => loadInitialData(currentUser.id)}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onSuccess={(u) => {
            setCurrentUser(u);
            setShowAuthModal(false);
            loadInitialData(u.id);
          }}
        />
      )}
    </div>
  );
}
