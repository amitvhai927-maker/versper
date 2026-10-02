import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Shield,
  Smartphone,
  Ban,
  LogOut,
  Trash2,
  Check,
  Laptop,
  CheckCircle2,
} from 'lucide-react';
import { User, SessionDevice } from '../../packages/models/types.ts';
import { api } from '../services/api.ts';

interface SettingsModalProps {
  currentUser: User;
  onClose: () => void;
  onUpdateUser: (updates: Partial<User>) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentUser,
  onClose,
  onUpdateUser,
  onLogout,
  onDeleteAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'devices' | 'blocked'>('profile');
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio);
  const [username, setUsername] = useState(currentUser.username);
  const [profilePhoto, setProfilePhoto] = useState(currentUser.profilePhoto);
  const [privacy, setPrivacy] = useState(currentUser.privacySettings);
  const [sessions, setSessions] = useState<SessionDevice[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Load sessions
    api.getSessions(currentUser.id).then((res) => {
      if (res.sessions) setSessions(res.sessions);
    });

    // Load blocked user objects
    if (currentUser.blockedUserIds.length > 0) {
      api.searchUsers('', currentUser.id).then((res) => {
        if (res.users) {
          setBlockedUsers(res.users.filter((u) => currentUser.blockedUserIds.includes(u.id)));
        }
      });
    }
  }, [currentUser.id, currentUser.blockedUserIds]);

  const handleSaveProfile = async () => {
    await onUpdateUser({
      name,
      bio,
      username,
      profilePhoto,
      privacySettings: privacy,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleRevokeSession = async (sessId: string) => {
    await api.revokeSession(sessId);
    setSessions((prev) => prev.filter((s) => s.id !== sessId));
  };

  const handleLogoutAllOtherDevices = async () => {
    const current = sessions.find((s) => s.isCurrent)?.id;
    await api.logoutAllDevices(currentUser.id, current || '');
    setSessions((prev) => prev.filter((s) => s.isCurrent));
  };

  const handleUnblock = async (targetId: string) => {
    const res = await api.unblockUser(currentUser.id, targetId);
    if (res.success) {
      setBlockedUsers((prev) => prev.filter((u) => u.id !== targetId));
      onUpdateUser({ blockedUserIds: res.blockedUserIds });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[85vh]">
        {/* Left Sidebar Navigation */}
        <div className="w-full md:w-56 bg-slate-950 p-4 border-b md:border-b-0 md:border-r border-slate-800 shrink-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700">
              {currentUser.profilePhoto ? (
                <img
                  src={currentUser.profilePhoto}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white">
                  {currentUser.name.slice(0, 2)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-white truncate">{currentUser.name}</h4>
              <p className="text-xs text-slate-400 font-mono truncate">@{currentUser.username}</p>
            </div>
          </div>

          <div className="space-y-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full px-3 py-2 rounded-lg text-left flex items-center gap-2.5 transition-colors ${
                activeTab === 'profile'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={`w-full px-3 py-2 rounded-lg text-left flex items-center gap-2.5 transition-colors ${
                activeTab === 'privacy'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Privacy & Security</span>
            </button>

            <button
              onClick={() => setActiveTab('devices')}
              className={`w-full px-3 py-2 rounded-lg text-left flex items-center gap-2.5 transition-colors ${
                activeTab === 'devices'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Active Devices</span>
            </button>

            <button
              onClick={() => setActiveTab('blocked')}
              className={`w-full px-3 py-2 rounded-lg text-left flex items-center gap-2.5 transition-colors ${
                activeTab === 'blocked'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Ban className="w-4 h-4" />
              <span>Blocked Users</span>
            </button>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 space-y-1">
            <button
              onClick={onLogout}
              className="w-full px-3 py-2 rounded-lg text-left flex items-center gap-2.5 text-xs text-rose-400 hover:bg-rose-950/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-14 px-6 border-b border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-sm font-semibold text-white capitalize">
              {activeTab === 'profile'
                ? 'Edit Profile'
                : activeTab === 'privacy'
                ? 'Privacy & Security'
                : activeTab === 'devices'
                ? 'Active Sessions'
                : 'Blocked Contacts'}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Tab: Profile */}
            {activeTab === 'profile' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Username</label>
                  <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 px-3">
                    <span className="text-slate-500 mr-1 font-mono">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full h-9 bg-transparent text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">About / Bio</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Profile Photo URL</label>
                  <input
                    type="text"
                    value={profilePhoto}
                    onChange={(e) => setProfilePhoto(e.target.value)}
                    placeholder="https://..."
                    className="w-full h-9 px-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-md shadow-cyan-900/30"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>

                  {saveSuccess && (
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Saved!
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Privacy & Security */}
            {activeTab === 'privacy' && (
              <div className="space-y-5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-2">
                    Who can see my Last Seen & Online
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['everyone', 'contacts', 'nobody'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setPrivacy({ ...privacy, lastSeen: opt })}
                        className={`py-2 rounded-lg border capitalize font-medium transition-colors ${
                          privacy.lastSeen === opt
                            ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-2">
                    Who can see my Profile Photo
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['everyone', 'contacts', 'nobody'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setPrivacy({ ...privacy, profilePhoto: opt })}
                        className={`py-2 rounded-lg border capitalize font-medium transition-colors ${
                          privacy.profilePhoto === opt
                            ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-2">
                    Who can see my 24-Hour Stories
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['everyone', 'contacts', 'nobody'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setPrivacy({ ...privacy, status: opt })}
                        className={`py-2 rounded-lg border capitalize font-medium transition-colors ${
                          privacy.status === opt
                            ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                  <div>
                    <span className="font-semibold text-slate-200 block">Read Receipts</span>
                    <span className="text-[11px] text-slate-400">
                      If turned off, you won't send or see read checkmarks.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacy.readReceipts}
                    onChange={(e) => setPrivacy({ ...privacy, readReceipts: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500"
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Privacy Rules</span>
                </button>
              </div>
            )}

            {/* Tab: Active Devices */}
            {activeTab === 'devices' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400">
                    You are logged into {sessions.length} authorized sessions
                  </span>
                  {sessions.length > 1 && (
                    <button
                      onClick={handleLogoutAllOtherDevices}
                      className="text-rose-400 hover:underline font-semibold"
                    >
                      Log out from all other devices
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300">
                          {sess.platform === 'desktop' ? (
                            <Laptop className="w-4 h-4" />
                          ) : (
                            <Smartphone className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{sess.deviceName}</span>
                            {sess.isCurrent && (
                              <span className="text-[10px] text-cyan-400 font-mono font-bold">
                                (Current)
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {sess.ipAddress} · {sess.location || 'Active session'}
                          </span>
                        </div>
                      </div>

                      {!sess.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(sess.id)}
                          className="px-2.5 py-1 text-slate-400 hover:text-rose-400 font-medium hover:bg-rose-950/20 rounded"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Blocked Users */}
            {activeTab === 'blocked' && (
              <div className="space-y-3 text-xs">
                {blockedUsers.length === 0 ? (
                  <p className="text-center py-6 text-slate-400">No blocked users</p>
                ) : (
                  blockedUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700">
                          {u.profilePhoto ? (
                            <img src={u.profilePhoto} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold">
                              {u.name.slice(0, 2)}
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-white block">{u.name}</span>
                          <span className="text-slate-400 font-mono">@{u.username}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnblock(u.id)}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium"
                      >
                        Unblock
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
