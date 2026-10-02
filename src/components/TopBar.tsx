import React from 'react';
import {
  MessageSquare,
  Sparkles,
  Phone,
  Shield,
  Settings,
  Smartphone,
  Monitor,
  UserCheck,
  Radio,
  Plus,
} from 'lucide-react';
import { User } from '../../packages/models/types.ts';

interface TopBarProps {
  currentUser: User;
  activeTab: 'chats' | 'stories' | 'calls' | 'settings' | 'admin';
  setActiveTab: (tab: 'chats' | 'stories' | 'calls' | 'settings' | 'admin') => void;
  deviceMode: 'desktop' | 'iphone' | 'android';
  setDeviceMode: (mode: 'desktop' | 'iphone' | 'android') => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  unreadCountTotal: number;
  wsStatus: 'connecting' | 'connected' | 'offline';
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  deviceMode,
  setDeviceMode,
  onNewChat,
  onOpenSettings,
  unreadCountTotal,
  wsStatus,
}) => {
  return (
    <header className="h-16 px-4 md:px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0 select-none z-30">
      {/* Zone 1: Single text element wordmark / brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-900/20 ring-1 ring-cyan-400/30 overflow-hidden">
          <img
            src="/src/assets/images/vesper_brand_logo_1790920775457.jpg"
            alt="Vesper Logo"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
            Vesper
            <span
              className={`w-2 h-2 rounded-full ${
                wsStatus === 'connected'
                  ? 'bg-emerald-400 ring-2 ring-emerald-500/20 animate-pulse'
                  : wsStatus === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
              title={`WebSockets: ${wsStatus}`}
            />
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links (single line, unboxed links with active text states) */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('chats')}
          className={`transition-colors flex items-center gap-1.5 ${
            activeTab === 'chats' ? 'text-white font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Messages</span>
          {unreadCountTotal > 0 && (
            <span className="text-xs text-cyan-400 font-mono tabular-nums">
              ({unreadCountTotal})
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('stories')}
          className={`transition-colors flex items-center gap-1.5 ${
            activeTab === 'stories' ? 'text-white font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Radio className="w-4 h-4 text-pink-400" />
          <span>Stories</span>
        </button>

        <button
          onClick={() => setActiveTab('calls')}
          className={`transition-colors flex items-center gap-1.5 ${
            activeTab === 'calls' ? 'text-white font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Calls</span>
        </button>

        {currentUser.role === 'admin' || currentUser.role === 'superadmin' ? (
          <button
            onClick={() => setActiveTab('admin')}
            className={`transition-colors flex items-center gap-1.5 ${
              activeTab === 'admin' ? 'text-cyan-400 font-semibold' : 'hover:text-cyan-300'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin</span>
          </button>
        ) : null}

        <button
          onClick={onOpenSettings}
          className={`transition-colors flex items-center gap-1.5 ${
            activeTab === 'settings' ? 'text-white font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Zone 3: Primary Actions (Viewport Simulator + New Chat) */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Device Viewport Switcher for effortless testing across iOS / Android / Desktop */}
        <div className="hidden lg:flex items-center p-1 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs text-slate-400">
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
              deviceMode === 'desktop' ? 'bg-slate-700 text-white font-medium' : 'hover:text-slate-200'
            }`}
            title="Desktop 3-Column Experience"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Web</span>
          </button>
          <button
            onClick={() => setDeviceMode('iphone')}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
              deviceMode === 'iphone' ? 'bg-slate-700 text-white font-medium' : 'hover:text-slate-200'
            }`}
            title="iPhone 16 Touch Frame"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iOS</span>
          </button>
          <button
            onClick={() => setDeviceMode('android')}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
              deviceMode === 'android' ? 'bg-slate-700 text-white font-medium' : 'hover:text-slate-200'
            }`}
            title="Android Pixel 9 Touch Frame"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
        </div>

        <button
          onClick={onNewChat}
          className="h-9 px-3.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm shadow-cyan-900/40"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Message</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-9 h-9 rounded-lg overflow-hidden border border-slate-700 hover:border-cyan-500/50 transition-colors flex items-center justify-center bg-slate-800"
          title={currentUser.name}
        >
          {currentUser.profilePhoto ? (
            <img src={currentUser.profilePhoto} alt={currentUser.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-slate-300">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
