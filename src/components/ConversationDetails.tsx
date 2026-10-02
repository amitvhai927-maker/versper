import React, { useState } from 'react';
import {
  X,
  Users,
  Shield,
  UserMinus,
  Pin,
  VolumeX,
  Archive,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { Conversation, Message, User } from '../../packages/models/types.ts';

interface ConversationDetailsProps {
  conversation: Conversation;
  messages: Message[];
  currentUser: User;
  onClose: () => void;
  onTogglePin: (convId: string, currentPinned: boolean) => void;
  onToggleMute: (convId: string, currentMuted: boolean) => void;
  onToggleArchive: (convId: string, currentArchived: boolean) => void;
  onPromoteAdmin?: (userId: string, role: string) => void;
  onRemoveMember?: (userId: string) => void;
  onReport: () => void;
}

export const ConversationDetails: React.FC<ConversationDetailsProps> = ({
  conversation,
  messages,
  currentUser,
  onClose,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  onPromoteAdmin,
  onRemoveMember,
  onReport,
}) => {
  const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'docs'>('media');

  const mediaMessages = messages.filter((m) => m.type === 'image' && m.mediaUrl);
  const docMessages = messages.filter((m) => m.type === 'document');

  const isOwnerOrAdmin = conversation.members.some(
    (m) => m.userId === currentUser.id && (m.role === 'owner' || m.role === 'admin')
  );

  return (
    <aside className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col select-none overflow-hidden shrink-0">
      {/* Header */}
      <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-100">
          {conversation.type === 'group' ? 'Group Details' : 'Contact Details'}
        </span>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile Card */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-full mx-auto overflow-hidden bg-slate-800 ring-2 ring-slate-700">
            {conversation.avatar ? (
              <img
                src={conversation.avatar}
                alt={conversation.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-cyan-900/30 text-cyan-400 text-lg font-bold">
                {conversation.title.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{conversation.title}</h3>
            {conversation.description && (
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                {conversation.description}
              </p>
            )}
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="space-y-1 bg-slate-800/50 rounded-xl p-2 border border-slate-800 text-xs">
          <button
            onClick={() => onTogglePin(conversation.id, !!conversation.isPinned)}
            className="w-full px-3 py-2 flex items-center justify-between rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <div className="flex items-center gap-2.5">
              <Pin className="w-4 h-4 text-cyan-400" />
              <span>Pin Conversation</span>
            </div>
            <span className="font-semibold text-cyan-400">
              {conversation.isPinned ? 'Yes' : 'No'}
            </span>
          </button>

          <button
            onClick={() => onToggleMute(conversation.id, !!conversation.isMuted)}
            className="w-full px-3 py-2 flex items-center justify-between rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <div className="flex items-center gap-2.5">
              <VolumeX className="w-4 h-4 text-slate-400" />
              <span>Mute Notifications</span>
            </div>
            <span className="font-semibold text-slate-400">
              {conversation.isMuted ? 'Muted' : 'Off'}
            </span>
          </button>

          <button
            onClick={() => onToggleArchive(conversation.id, !!conversation.isArchived)}
            className="w-full px-3 py-2 flex items-center justify-between rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <div className="flex items-center gap-2.5">
              <Archive className="w-4 h-4 text-slate-400" />
              <span>Archive</span>
            </div>
            <span className="font-semibold text-slate-400">
              {conversation.isArchived ? 'Archived' : 'Active'}
            </span>
          </button>
        </div>

        {/* Members Section (Group Only) */}
        {conversation.type === 'group' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Members ({conversation.members.length})
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 bg-slate-800/40 rounded-xl border border-slate-800 overflow-hidden">
              {conversation.members.map((member) => (
                <div
                  key={member.userId}
                  className="p-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-700 overflow-hidden shrink-0">
                      {member.user?.profilePhoto ? (
                        <img
                          src={member.user.profilePhoto}
                          alt={member.user.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-300">
                          {member.user?.name?.slice(0, 2) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-slate-200 truncate block">
                        {member.user?.name || 'User'}
                        {member.userId === currentUser.id && ' (You)'}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {member.role.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Admin controls */}
                  {isOwnerOrAdmin && member.userId !== currentUser.id && (
                    <div className="flex items-center gap-1">
                      {onPromoteAdmin && member.role === 'member' && (
                        <button
                          onClick={() => onPromoteAdmin(member.userId, 'admin')}
                          className="p-1 text-slate-400 hover:text-cyan-400"
                          title="Promote to Admin"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onRemoveMember && member.role !== 'owner' && (
                        <button
                          onClick={() => onRemoveMember(member.userId)}
                          className="p-1 text-slate-400 hover:text-rose-400"
                          title="Remove Member"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shared Media / Documents */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-1 bg-slate-800/80 rounded-lg text-xs">
            <button
              onClick={() => setActiveMediaTab('media')}
              className={`flex-1 py-1 text-center font-medium rounded-md transition-colors ${
                activeMediaTab === 'media' ? 'bg-slate-700 text-white' : 'text-slate-400'
              }`}
            >
              Media ({mediaMessages.length})
            </button>
            <button
              onClick={() => setActiveMediaTab('docs')}
              className={`flex-1 py-1 text-center font-medium rounded-md transition-colors ${
                activeMediaTab === 'docs' ? 'bg-slate-700 text-white' : 'text-slate-400'
              }`}
            >
              Files ({docMessages.length})
            </button>
          </div>

          {activeMediaTab === 'media' ? (
            mediaMessages.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-4">No photos or videos yet</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {mediaMessages.map((m) => (
                  <div key={m.id} className="aspect-square rounded-lg overflow-hidden bg-slate-800">
                    <img
                      src={m.mediaUrl}
                      alt="Media"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>
            )
          ) : docMessages.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-4">No shared documents</p>
          ) : (
            <div className="space-y-1.5">
              {docMessages.map((m) => (
                <div
                  key={m.id}
                  className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center gap-2 text-xs"
                >
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate text-slate-200">
                    {m.mediaMeta?.fileName || 'Document.pdf'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security & Report */}
        <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Messages protected with transport & end-to-end architecture</span>
          </div>

          <button
            onClick={onReport}
            className="w-full py-2 px-3 text-left text-rose-400 hover:bg-rose-950/20 rounded-lg flex items-center gap-2 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Report Conversation</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
