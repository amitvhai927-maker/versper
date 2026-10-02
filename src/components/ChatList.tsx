import React, { useState } from 'react';
import {
  Search,
  Pin,
  VolumeX,
  Archive,
  MoreVertical,
  Check,
  CheckCheck,
  Mic,
  Image as ImageIcon,
  FileText,
  Users,
} from 'lucide-react';
import { Conversation, User } from '../../packages/models/types.ts';

interface ChatListProps {
  conversations: Conversation[];
  selectedConvId: string | null;
  onSelectConversation: (id: string) => void;
  currentUser: User;
  onTogglePin: (convId: string, currentPinned: boolean) => void;
  onToggleMute: (convId: string, currentMuted: boolean) => void;
  onToggleArchive: (convId: string, currentArchived: boolean) => void;
  onDeleteConversation: (convId: string) => void;
  onCreateGroup: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  selectedConvId,
  onSelectConversation,
  currentUser,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  onDeleteConversation,
  onCreateGroup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'groups' | 'pinned'>('all');
  const [activeMenuConvId, setActiveMenuConvId] = useState<string | null>(null);

  const filteredConversations = conversations.filter((c) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchLastMsg = c.lastMessage?.content?.toLowerCase().includes(q);
      if (!matchTitle && !matchLastMsg) return false;
    }

    // Filter mode
    if (filterMode === 'unread') return c.unreadCount > 0;
    if (filterMode === 'groups') return c.type === 'group';
    if (filterMode === 'pinned') return !!c.isPinned;
    return !c.isArchived; // All non-archived by default
  });

  const formatTimestamp = (isoDate?: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <aside className="h-full flex flex-col bg-slate-900 border-r border-slate-800 select-none">
      {/* Search Header */}
      <div className="p-3.5 border-b border-slate-800/80 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search messages or people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-slate-800/90 text-sm text-slate-100 placeholder-slate-400 rounded-lg border border-slate-700/60 focus:outline-none focus:border-cyan-500/70 transition-colors"
          />
        </div>

        {/* Filter Segmented Controls */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-800/80 rounded-lg border border-slate-700/50 text-xs">
          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-1 text-center font-medium rounded-md transition-colors ${
              filterMode === 'all'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode('unread')}
            className={`flex-1 py-1 text-center font-medium rounded-md transition-colors ${
              filterMode === 'unread'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilterMode('groups')}
            className={`flex-1 py-1 text-center font-medium rounded-md transition-colors ${
              filterMode === 'groups'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Groups
          </button>
          <button
            onClick={() => setFilterMode('pinned')}
            className={`flex-1 py-1 text-center font-medium rounded-md transition-colors ${
              filterMode === 'pinned'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pinned
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs space-y-3">
            <p>No conversations found</p>
            <button
              onClick={onCreateGroup}
              className="text-cyan-400 hover:underline inline-flex items-center gap-1 font-medium"
            >
              <Users className="w-3.5 h-3.5" />
              Create a Group
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = conv.id === selectedConvId;
            const lastMsg = conv.lastMessage;
            const otherMember =
              conv.type === 'direct'
                ? conv.members.find((m) => m.userId !== currentUser.id)
                : null;
            const isOnline = otherMember?.user?.onlineStatus === 'online';

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`relative group px-3.5 py-3 cursor-pointer flex items-center gap-3 transition-colors ${
                  isSelected
                    ? 'bg-slate-800/90 text-white'
                    : 'hover:bg-slate-800/40 text-slate-300'
                }`}
              >
                {/* Avatar with status indicator */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 ring-1 ring-slate-700/60">
                    {conv.avatar ? (
                      <img
                        src={conv.avatar}
                        alt={conv.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-cyan-900/30 text-cyan-400 text-sm font-semibold">
                        {conv.type === 'group' ? (
                          <Users className="w-5 h-5" />
                        ) : (
                          conv.title.slice(0, 2).toUpperCase()
                        )}
                      </div>
                    )}
                  </div>
                  {conv.type === 'direct' && isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-slate-100 truncate">
                        {conv.title}
                      </span>
                      {conv.isPinned && (
                        <Pin className="w-3 h-3 text-cyan-400 shrink-0 fill-cyan-400" />
                      )}
                      {conv.isMuted && (
                        <VolumeX className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono tabular-nums shrink-0">
                      {formatTimestamp(lastMsg?.createdAt || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                      {lastMsg?.senderId === currentUser.id && (
                        <span className="shrink-0 text-slate-400">
                          {lastMsg.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                          ) : lastMsg.status === 'delivered' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </span>
                      )}

                      {lastMsg?.type === 'voice' ? (
                        <span className="flex items-center gap-1 text-slate-300">
                          <Mic className="w-3 h-3 text-cyan-400" />
                          Voice message ({lastMsg.mediaMeta?.duration || 10}s)
                        </span>
                      ) : lastMsg?.type === 'image' ? (
                        <span className="flex items-center gap-1 text-slate-300">
                          <ImageIcon className="w-3 h-3 text-cyan-400" />
                          Photo
                        </span>
                      ) : lastMsg?.type === 'document' ? (
                        <span className="flex items-center gap-1 text-slate-300">
                          <FileText className="w-3 h-3 text-cyan-400" />
                          Document
                        </span>
                      ) : (
                        <span>{lastMsg?.content || 'No messages yet'}</span>
                      )}
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-cyan-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center font-mono tabular-nums">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Action Menu Button */}
                <div className="relative shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuConvId(activeMenuConvId === conv.id ? null : conv.id);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown Menu */}
                  {activeMenuConvId === conv.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-6 w-36 py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 text-xs text-slate-200 divide-y divide-slate-700/50"
                    >
                      <button
                        onClick={() => {
                          onTogglePin(conv.id, !!conv.isPinned);
                          setActiveMenuConvId(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-700/60 flex items-center gap-2"
                      >
                        <Pin className="w-3.5 h-3.5" />
                        <span>{conv.isPinned ? 'Unpin' : 'Pin'}</span>
                      </button>
                      <button
                        onClick={() => {
                          onToggleMute(conv.id, !!conv.isMuted);
                          setActiveMenuConvId(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-700/60 flex items-center gap-2"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>{conv.isMuted ? 'Unmute' : 'Mute'}</span>
                      </button>
                      <button
                        onClick={() => {
                          onToggleArchive(conv.id, !!conv.isArchived);
                          setActiveMenuConvId(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-slate-700/60 flex items-center gap-2"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>{conv.isArchived ? 'Unarchive' : 'Archive'}</span>
                      </button>
                      <button
                        onClick={() => {
                          onDeleteConversation(conv.id);
                          setActiveMenuConvId(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-rose-900/40 text-rose-400 flex items-center gap-2"
                      >
                        <span>Delete Chat</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
