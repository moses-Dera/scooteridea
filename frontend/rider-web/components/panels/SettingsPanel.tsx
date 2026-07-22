'use client';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Shield, Bell, Key, LogOut, ChevronRight, User, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="px-6 pb-6 text-white space-y-6">
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-panel', { detail: 'menu' }))}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex flex-shrink-0 items-center justify-center transition-colors cursor-pointer"
          >
            <svg
              className="w-5 h-5 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="text-2xl font-bold">Settings</div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex flex-shrink-0 items-center justify-center transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
          Account
        </div>
        <div
          onClick={() => window.dispatchEvent(new CustomEvent('open-panel', { detail: 'profile' }))}
          className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/5 cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <div className="font-bold text-white">{session?.user?.name || 'Rider'}</div>
              <div className="text-xs text-slate-400">
                {session?.user?.email || 'Update email address'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
          Preferences
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <div className="font-bold text-white">Push Notifications</div>
              <div className="text-xs text-slate-400">Trip updates & promos</div>
            </div>
          </div>
          <div
            onClick={() => setNotifications(!notifications)}
            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${notifications ? 'bg-primary' : 'bg-slate-700'}`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${notifications ? 'translate-x-6' : 'translate-x-0'}`}
            ></div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
          Security
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-panel', { detail: 'password' }))}
          className="w-full glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-slate-300" />
            </div>
            <div className="text-left">
              <div className="font-bold text-white">Password & Security</div>
              <div className="text-xs text-slate-400">Update your password</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </button>

        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-panel', { detail: '2fa' }))}
          className="w-full glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-300" />
            </div>
            <div className="text-left">
              <div className="font-bold text-white">Two-Factor Auth</div>
              <div className="text-xs text-slate-400">Add extra security</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </button>
      </div>
    </div>
  );
}
