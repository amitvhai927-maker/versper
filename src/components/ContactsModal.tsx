import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, MessageSquare, Users } from 'lucide-react';
import { User } from '../../packages/models/types.ts';
import { api } from '../services/api.ts';

interface ContactsModalProps {
  currentUser: User;
  onClose: () => void;
  onStartConversation: (targetUserId: string) => void;
  onCreateGroup: () => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  currentUser,
  onClose,
  onStartConversation,
  onCreateGroup,
}) => {
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    api.getContacts(currentUser.id).then((res) => {
      if (res.contacts) setContacts(res.contacts);
    });
  }, [currentUser.id]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const delay = setTimeout(() => {
      api.searchUsers(query, currentUser.id).then((res) => {
        if (res.users) setSearchResults(res.users);
        setIsSearching(false);
      });
    }, 200);

    return () => clearTimeout(delay);
  }, [query, currentUser.id]);

  const displayedUsers = query.trim() ? searchResults : contacts;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">New Conversation</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, @username, or phone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-slate-800 text-sm text-white placeholder-slate-400 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500"
              autoFocus
            />
          </div>

          <button
            onClick={() => {
              onClose();
              onCreateGroup();
            }}
            className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl text-xs font-semibold text-cyan-400 flex items-center gap-2 border border-slate-700/60 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Create a New Group Chat</span>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/60">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {query.trim() ? 'Search Results' : 'Saved Contacts'}
          </div>

          {displayedUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {isSearching ? 'Searching...' : 'No users found matching your search.'}
            </div>
          ) : (
            displayedUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => {
                  onStartConversation(user.id);
                  onClose();
                }}
                className="p-3 rounded-xl hover:bg-slate-800/70 flex items-center justify-between gap-3 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 ring-1 ring-slate-700 shrink-0">
                    {user.profilePhoto ? (
                      <img
                        src={user.profilePhoto}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-cyan-400">
                        {user.name.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-white truncate block">
                      {user.name}
                    </span>
                    <span className="text-xs text-slate-400 font-mono truncate block">
                      @{user.username} · {user.phone}
                    </span>
                  </div>
                </div>

                <button className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600 hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
