import React, { useState, useEffect } from 'react';
import { X, Users, Check } from 'lucide-react';
import { User } from '../../packages/models/types.ts';
import { api } from '../services/api.ts';

interface GroupModalProps {
  currentUser: User;
  onClose: () => void;
  onGroupCreated: () => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  currentUser,
  onClose,
  onGroupCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.getContacts(currentUser.id).then((res) => {
      if (res.contacts) setContacts(res.contacts);
    });
  }, [currentUser.id]);

  const handleToggleSelect = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    await api.createGroup({
      title: title.trim(),
      description: description.trim(),
      creatorId: currentUser.id,
      memberIds: selectedUserIds,
    });
    setIsSubmitting(false);
    onGroupCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Create New Group</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 border-b border-slate-800 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Group Name *</label>
            <input
              type="text"
              placeholder="e.g. Distributed Infrastructure Team"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 bg-slate-800 text-white placeholder-slate-500 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="What is this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 bg-slate-800 text-white placeholder-slate-500 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Member selection */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <span className="text-xs font-semibold text-slate-400 block">
            Add Members ({selectedUserIds.length} selected)
          </span>

          <div className="space-y-1.5">
            {contacts.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => handleToggleSelect(user.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/70 text-white'
                      : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700">
                      {user.profilePhoto ? (
                        <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                          {user.name.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium truncate">{user.name}</span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      isSelected
                        ? 'bg-cyan-600 border-cyan-500 text-white'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={handleCreate}
            disabled={!title.trim() || isSubmitting}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-cyan-900/30"
          >
            {isSubmitting ? 'Creating Group...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};
