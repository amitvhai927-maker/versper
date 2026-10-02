import React, { useState, useEffect } from 'react';
import { X, Eye, ChevronLeft, ChevronRight, Send, Plus } from 'lucide-react';
import { StatusItem, User } from '../../packages/models/types.ts';

interface StoryViewerProps {
  statuses: StatusItem[];
  currentUser: User;
  onClose: () => void;
  onPostStatus: (payload: { type: string; content?: string; mediaUrl?: string; backgroundColor?: string }) => void;
  onReplyToStatus: (userId: string, text: string) => void;
  onViewStatus: (statusId: string) => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  statuses,
  currentUser,
  onClose,
  onPostStatus,
  onReplyToStatus,
  onViewStatus,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newText, setNewText] = useState('');
  const [newBgColor, setNewBgColor] = useState('#0F172A');
  const [showViewersList, setShowViewersList] = useState(false);

  const activeStory = statuses[currentIndex];

  useEffect(() => {
    if (!activeStory) return;
    onViewStatus(activeStory.id);
  }, [currentIndex, activeStory?.id]);

  useEffect(() => {
    if (isPaused || !activeStory || showCreateModal) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < statuses.length - 1) {
            setCurrentIndex((idx) => idx + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2; // ~5 seconds per status story
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, activeStory, statuses.length, showCreateModal]);

  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !activeStory) return;
    onReplyToStatus(activeStory.userId, `Replying to your status: "${replyText.trim()}"`);
    setReplyText('');
    onClose();
  };

  const handleCreateStory = () => {
    if (!newText.trim()) return;
    onPostStatus({
      type: 'text',
      content: newText.trim(),
      backgroundColor: newBgColor,
    });
    setShowCreateModal(false);
    setNewText('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center select-none">
      {/* Top Header & Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Container */}
      <div className="relative w-full max-w-md h-[90vh] bg-slate-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-slate-800">
        {statuses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <p className="text-sm mb-4">No recent stories in the last 24 hours</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Post a Story</span>
            </button>
          </div>
        ) : (
          <>
            {/* Multi-segment Progress Bars */}
            <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
              {statuses.map((_, i) => (
                <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-100"
                    style={{
                      width:
                        i < currentIndex
                          ? '100%'
                          : i === currentIndex
                          ? `${progress}%`
                          : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Author bar */}
            <div className="absolute top-7 left-4 right-4 z-30 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-700 ring-2 ring-white/50">
                  {activeStory.userAvatar ? (
                    <img
                      src={activeStory.userAvatar}
                      alt={activeStory.userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                      {activeStory.userName.slice(0, 2)}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold leading-tight">{activeStory.userName}</h4>
                  <span className="text-[11px] text-white/70 font-mono">
                    {new Date(activeStory.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Story</span>
              </button>
            </div>

            {/* Story Content Viewport */}
            <div
              className="flex-1 flex items-center justify-center p-8 relative overflow-hidden"
              style={{
                backgroundColor: activeStory.backgroundColor || '#0F172A',
              }}
              onMouseDown={() => setIsPaused(true)}
              onMouseUp={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
            >
              {activeStory.mediaUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <img
                    src={activeStory.mediaUrl}
                    alt="Status media"
                    className="max-h-[70vh] object-contain rounded-lg shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                  {activeStory.content && (
                    <p className="mt-4 text-center text-sm font-medium text-white bg-black/60 backdrop-blur-sm px-4 py-2 rounded-xl">
                      {activeStory.content}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center p-6">
                  <p className="text-xl md:text-2xl font-serif text-white leading-relaxed font-semibold">
                    {activeStory.content}
                  </p>
                </div>
              )}

              {/* Prev / Next Click Targets */}
              <button
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white/40 hover:text-white/90 transition-colors"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/40 hover:text-white/90 transition-colors"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>

            {/* Bottom Bar: Reply or Viewers count */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 z-30 flex items-center gap-2">
              {activeStory.userId === currentUser.id ? (
                <div className="w-full flex items-center justify-between text-xs text-slate-300 px-2">
                  <button
                    onClick={() => setShowViewersList(!showViewersList)}
                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>{activeStory.views.length} viewers</span>
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">Expires in 24h</span>
                </div>
              ) : (
                <div className="w-full flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Reply to ${activeStory.userName}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendReply();
                    }}
                    className="flex-1 h-9 px-3 bg-slate-800 text-xs text-white placeholder-slate-400 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleSendReply}
                    className="w-9 h-9 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Viewers modal drawer */}
            {showViewersList && (
              <div className="absolute inset-x-0 bottom-0 bg-slate-900 border-t border-slate-700 p-4 rounded-t-2xl z-40 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-200">
                  <span>Viewers ({activeStory.views.length})</span>
                  <button onClick={() => setShowViewersList(false)}>
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <div className="space-y-2">
                  {activeStory.views.map((v, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-200">{v.userName}</span>
                      <span className="text-slate-400 font-mono">
                        {new Date(v.viewedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Post New Story Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Create 24-Hour Story</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              placeholder="What's on your mind? (Disappears in 24 hours)"
              rows={4}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              className="w-full p-3 bg-slate-800 text-sm text-white rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500"
            />

            <div>
              <span className="text-xs text-slate-400 block mb-2 font-medium">Background Color</span>
              <div className="flex items-center gap-2">
                {['#0F172A', '#1E293B', '#064E3B', '#1E1B4B', '#4C0519', '#701A75'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewBgColor(color)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      newBgColor === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateStory}
              disabled={!newText.trim()}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Publish to Story
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
