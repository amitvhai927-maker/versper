import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Send,
  Check,
  CheckCheck,
  Reply,
  Copy,
  Edit2,
  Trash2,
  Share2,
  Star,
  FileText,
  Play,
  Pause,
  MapPin,
  User as UserIcon,
  X,
  ChevronDown,
} from 'lucide-react';
import { Conversation, Message, User } from '../../packages/models/types.ts';
import { VoiceRecorder } from './VoiceRecorder.tsx';
import { playSafeAudio, DEFAULT_VOICE_NOTE_URI } from '../utils/audio.ts';

interface ChatConversationProps {
  conversation: Conversation;
  messages: Message[];
  currentUser: User;
  onSendMessage: (payload: Partial<Message>) => void;
  onEditMessage: (msgId: string, content: string) => void;
  onDeleteMessage: (msgId: string) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onStartCall: (type: 'voice' | 'video', receiverId: string) => void;
  onOpenDetails: () => void;
  typingUser: string | null;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onBackMobile?: () => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🙏', '🚀', '🎉', '💯'];

export const ChatConversation: React.FC<ChatConversationProps> = ({
  conversation,
  messages,
  currentUser,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onStartCall,
  onOpenDetails,
  typingUser,
  onTypingStart,
  onTypingStop,
  onBackMobile,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [activeActionMenuMsgId, setActiveActionMenuMsgId] = useState<string | null>(null);
  const [searchInChat, setSearchInChat] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioSpeed, setAudioSpeed] = useState<number>(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const otherMember =
    conversation.type === 'direct'
      ? conversation.members.find((m) => m.userId !== currentUser.id)
      : null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onTypingStart();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop();
    }, 1500);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    if (editingMessage) {
      onEditMessage(editingMessage.id, inputText.trim());
      setEditingMessage(null);
      setInputText('');
      return;
    }

    onSendMessage({
      conversationId: conversation.id,
      senderId: currentUser.id,
      content: inputText.trim(),
      type: 'text',
      replyToId: replyingTo?.id,
    });

    setInputText('');
    setReplyingTo(null);
    onTypingStop();
  };

  const handleSendVoice = (duration: number, audioUrl: string) => {
    onSendMessage({
      conversationId: conversation.id,
      senderId: currentUser.id,
      type: 'voice',
      content: `Voice message (${duration}s)`,
      mediaUrl: audioUrl,
      mediaMeta: {
        duration,
        fileName: `voice_${duration}s.ogg`,
        mimeType: 'audio/ogg',
      },
      replyToId: replyingTo?.id,
    });
    setIsRecordingVoice(false);
    setReplyingTo(null);
  };

  const handleSendMockAttachment = (type: 'image' | 'document' | 'location') => {
    setShowAttachMenu(false);
    if (type === 'image') {
      onSendMessage({
        conversationId: conversation.id,
        senderId: currentUser.id,
        type: 'image',
        content: 'Shared photo',
        mediaUrl:
          'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
        mediaMeta: {
          fileName: 'architectural_drawing.jpg',
          fileSize: 1840000,
          mimeType: 'image/jpeg',
        },
      });
    } else if (type === 'document') {
      onSendMessage({
        conversationId: conversation.id,
        senderId: currentUser.id,
        type: 'document',
        content: 'System_Specifications_RFC_104.pdf',
        mediaMeta: {
          fileName: 'System_Specifications_RFC_104.pdf',
          fileSize: 3200000,
          mimeType: 'application/pdf',
        },
      });
    } else if (type === 'location') {
      onSendMessage({
        conversationId: conversation.id,
        senderId: currentUser.id,
        type: 'location',
        content: 'Live Location: San Francisco Technology District',
        mediaMeta: {
          latitude: 37.7749,
          longitude: -122.4194,
          address: 'Market St, San Francisco, CA',
        },
      });
    }
  };

  const handleTogglePlayAudio = (msgId: string, url?: string) => {
    if (playingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audioSource = url || DEFAULT_VOICE_NOTE_URI;
      audioPlayerRef.current = playSafeAudio(
        audioSource,
        audioSpeed,
        () => setPlayingAudioId(null),
        () => setPlayingAudioId(null)
      );
      setPlayingAudioId(msgId);
    }
  };

  const cycleAudioSpeed = () => {
    const nextSpeed = audioSpeed === 1 ? 1.5 : audioSpeed === 1.5 ? 2 : 1;
    setAudioSpeed(nextSpeed);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = nextSpeed;
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (!searchInChat.trim()) return true;
    return m.content.toLowerCase().includes(searchInChat.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      {/* Header */}
      <div className="h-16 px-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0 select-none z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg"
            >
              <ChevronDown className="w-5 h-5 rotate-90" />
            </button>
          )}

          <div
            onClick={onOpenDetails}
            className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 cursor-pointer shrink-0 ring-1 ring-slate-700/60"
          >
            {conversation.avatar ? (
              <img
                src={conversation.avatar}
                alt={conversation.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-cyan-900/30 text-cyan-400 text-xs font-semibold">
                {conversation.title.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 cursor-pointer" onClick={onOpenDetails}>
            <div className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
              <span>{conversation.title}</span>
            </div>
            <div className="text-xs text-slate-400 truncate">
              {typingUser ? (
                <span className="text-cyan-400 font-medium animate-pulse">
                  {typingUser} is typing...
                </span>
              ) : conversation.type === 'direct' ? (
                otherMember?.user?.onlineStatus === 'online' ? (
                  <span className="text-emerald-400">online</span>
                ) : (
                  <span>last seen recently</span>
                )
              ) : (
                <span>{conversation.members.length} members</span>
              )}
            </div>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-1 sm:gap-2 text-slate-400">
          <button
            onClick={() => setShowSearchBar(!showSearchBar)}
            className="w-9 h-9 rounded-lg hover:bg-slate-800 hover:text-white flex items-center justify-center transition-colors"
            title="Search in Chat"
          >
            <Search className="w-4 h-4" />
          </button>

          {conversation.type === 'direct' && otherMember && (
            <>
              <button
                onClick={() => onStartCall('voice', otherMember.userId)}
                className="w-9 h-9 rounded-lg hover:bg-slate-800 hover:text-white flex items-center justify-center transition-colors"
                title="Voice Call"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStartCall('video', otherMember.userId)}
                className="w-9 h-9 rounded-lg hover:bg-slate-800 hover:text-white flex items-center justify-center transition-colors"
                title="Video Call"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={onOpenDetails}
            className="w-9 h-9 rounded-lg hover:bg-slate-800 hover:text-white flex items-center justify-center transition-colors"
            title="Conversation Details"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* In-chat Search Bar */}
      {showSearchBar && (
        <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Search keywords in this conversation..."
            value={searchInChat}
            onChange={(e) => setSearchInChat(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => {
              setSearchInChat('');
              setShowSearchBar(false);
            }}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {filteredMessages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const isDeleted = !!msg.isDeleted;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}
            >
              {/* Sender Name in Group Chat */}
              {!isMe && conversation.type === 'group' && (
                <span className="text-[11px] font-medium text-cyan-400 mb-0.5 ml-2">
                  {msg.senderName}
                </span>
              )}

              {/* Message Bubble Container */}
              <div
                className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-md text-sm ${
                  isMe
                    ? 'bg-cyan-700 text-white rounded-br-sm shadow-cyan-950/30'
                    : 'bg-slate-800 text-slate-100 rounded-bl-sm shadow-slate-950/40 border border-slate-700/50'
                }`}
              >
                {/* Reply preview */}
                {msg.replyToMessage && (
                  <div className="mb-2 p-1.5 rounded bg-black/20 border-l-2 border-cyan-300 text-xs opacity-90">
                    <span className="font-semibold text-cyan-200 block text-[11px]">
                      {msg.replyToMessage.senderName}
                    </span>
                    <span className="truncate block opacity-80">
                      {msg.replyToMessage.content}
                    </span>
                  </div>
                )}

                {/* Deleted state */}
                {isDeleted ? (
                  <span className="italic text-xs opacity-60">This message was deleted</span>
                ) : (
                  <>
                    {/* Image message */}
                    {msg.type === 'image' && msg.mediaUrl && (
                      <div className="rounded-lg overflow-hidden mb-1.5 border border-white/10">
                        <img
                          src={msg.mediaUrl}
                          alt="Photo"
                          className="w-full max-h-72 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Document message */}
                    {msg.type === 'document' && (
                      <div className="flex items-center gap-3 p-2 bg-black/20 rounded-lg mb-1.5">
                        <FileText className="w-7 h-7 text-cyan-300 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">
                            {msg.mediaMeta?.fileName || 'Document.pdf'}
                          </p>
                          <p className="text-[10px] opacity-70">
                            {Math.round((msg.mediaMeta?.fileSize || 1024) / 1024)} KB · PDF
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Voice Note message */}
                    {msg.type === 'voice' && (
                      <div className="flex items-center gap-3 py-1 min-w-[200px]">
                        <button
                          onClick={() => handleTogglePlayAudio(msg.id, msg.mediaUrl)}
                          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors shrink-0"
                        >
                          {playingAudioId === msg.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1 space-y-1">
                          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-white rounded-full ${
                                playingAudioId === msg.id ? 'animate-pulse w-2/3' : 'w-1/4'
                              }`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] opacity-80 font-mono tabular-nums">
                            <span>0:00</span>
                            <span>{msg.mediaMeta?.duration || 14}s</span>
                          </div>
                        </div>
                        <button
                          onClick={cycleAudioSpeed}
                          className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono font-bold hover:bg-black/30"
                        >
                          {audioSpeed}x
                        </button>
                      </div>
                    )}

                    {/* Location message */}
                    {msg.type === 'location' && (
                      <div className="p-2 bg-black/20 rounded-lg mb-1.5 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-rose-400 shrink-0" />
                        <div className="text-xs">
                          <span className="font-semibold block">Pinned Location</span>
                          <span className="opacity-80 text-[11px]">
                            {msg.mediaMeta?.address || 'San Francisco, CA'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Main text content */}
                    {msg.content && msg.type !== 'voice' && (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </p>
                    )}
                  </>
                )}

                {/* Footer: Time + Status Ticks */}
                <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] opacity-75 font-mono tabular-nums select-none">
                  {msg.isEdited && <span>(edited)</span>}
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isMe && !isDeleted && (
                    <span>
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3 h-3 text-cyan-200" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3 h-3 opacity-80" />
                      ) : (
                        <Check className="w-3 h-3 opacity-80" />
                      )}
                    </span>
                  )}
                </div>

                {/* Reactions badge */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="absolute -bottom-2.5 right-2 flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5 text-xs shadow-md">
                    {msg.reactions.map((r, idx) => (
                      <button
                        key={idx}
                        onClick={() => onToggleReaction(msg.id, r.emoji)}
                        className={`flex items-center gap-0.5 hover:scale-110 transition-transform ${
                          r.userIds.includes(currentUser.id) ? 'font-bold text-cyan-400' : ''
                        }`}
                      >
                        <span>{r.emoji}</span>
                        {r.count > 1 && <span className="text-[10px]">{r.count}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hover Quick Action Buttons */}
              <div
                className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 my-0.5 text-slate-400 ${
                  isMe ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Emoji quick reactions */}
                {['👍', '❤️', '🔥'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onToggleReaction(msg.id, emoji)}
                    className="p-1 hover:bg-slate-800 rounded text-xs hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}

                <button
                  onClick={() => setReplyingTo(msg)}
                  className="p-1 hover:bg-slate-800 rounded hover:text-white transition-colors"
                  title="Reply"
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(msg.content);
                  }}
                  className="p-1 hover:bg-slate-800 rounded hover:text-white transition-colors"
                  title="Copy"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {isMe && !isDeleted && (
                  <>
                    <button
                      onClick={() => {
                        setEditingMessage(msg);
                        setInputText(msg.content);
                      }}
                      className="p-1 hover:bg-slate-800 rounded hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteMessage(msg.id)}
                      className="p-1 hover:bg-slate-800 rounded hover:text-rose-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Replying or Editing Banner */}
      {(replyingTo || editingMessage) && (
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2 min-w-0">
            {replyingTo ? (
              <>
                <Reply className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">
                  Replying to <strong className="text-white">{replyingTo.senderName}</strong>:{' '}
                  {replyingTo.content}
                </span>
              </>
            ) : (
              <>
                <Edit2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Editing message</span>
              </>
            )}
          </div>
          <button
            onClick={() => {
              setReplyingTo(null);
              setEditingMessage(null);
              setInputText('');
            }}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Voice Recorder Overlay or Standard Composer */}
      {isRecordingVoice ? (
        <VoiceRecorder
          onSendVoice={handleSendVoice}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 select-none relative">
          {/* Attachment button */}
          <div className="relative">
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="w-10 h-10 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              title="Attach File"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Attachment popover */}
            {showAttachMenu && (
              <div className="absolute bottom-12 left-0 w-44 py-1.5 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 text-xs text-slate-200 divide-y divide-slate-700/50">
                <button
                  onClick={() => handleSendMockAttachment('image')}
                  className="w-full px-3 py-2 text-left hover:bg-slate-700/60 flex items-center gap-2.5"
                >
                  <span className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                    📸
                  </span>
                  <span>Photos & Videos</span>
                </button>
                <button
                  onClick={() => handleSendMockAttachment('document')}
                  className="w-full px-3 py-2 text-left hover:bg-slate-700/60 flex items-center gap-2.5"
                >
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    📄
                  </span>
                  <span>Document (PDF)</span>
                </button>
                <button
                  onClick={() => handleSendMockAttachment('location')}
                  className="w-full px-3 py-2 text-left hover:bg-slate-700/60 flex items-center gap-2.5"
                >
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    📍
                  </span>
                  <span>Location</span>
                </button>
              </div>
            )}
          </div>

          {/* Emoji button */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-10 h-10 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              title="Emojis"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Emoji popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 p-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 grid grid-cols-5 gap-1.5">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setInputText((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="w-8 h-8 rounded hover:bg-slate-700 text-base flex items-center justify-center transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Input */}
          <input
            type="text"
            placeholder={
              conversation.adminOnlyMessaging &&
              conversation.members.find((m) => m.userId === currentUser.id)?.role === 'member'
                ? 'Only admins can send messages'
                : 'Write a message...'
            }
            disabled={
              conversation.adminOnlyMessaging &&
              conversation.members.find((m) => m.userId === currentUser.id)?.role === 'member'
            }
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 h-10 px-4 bg-slate-800 text-sm text-slate-100 placeholder-slate-400 rounded-xl border border-slate-700/60 focus:outline-none focus:border-cyan-500 transition-colors"
          />

          {/* Send or Voice Note Trigger */}
          {inputText.trim() ? (
            <button
              onClick={handleSend}
              className="w-10 h-10 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white rounded-xl flex items-center justify-center transition-all shadow-md shadow-cyan-900/30 shrink-0"
              title="Send"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          ) : (
            <button
              onClick={() => setIsRecordingVoice(true)}
              className="w-10 h-10 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded-xl flex items-center justify-center transition-all shrink-0 border border-slate-700"
              title="Hold to Record Voice Message"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
