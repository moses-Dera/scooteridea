'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Bell, Shield, Globe, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white">
      <div className="sticky top-0 z-40 pt-20 px-6 pb-6 border-b border-white/5 bg-[#0A0D14]/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-2xl font-bold">Settings</div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8">
        
        {/* Account Group */}
        <div>
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 ml-2">Account</h3>
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-400" />
                <span className="font-semibold text-slate-200">Personal Information</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
            <div className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-slate-400" />
                <span className="font-semibold text-slate-200">Security & Password</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </div>

        {/* Preferences Group */}
        <div>
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 ml-2">Preferences</h3>
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-400" />
                <span className="font-semibold text-slate-200">Push Notifications</span>
              </div>
              <div className="w-10 h-6 bg-primary rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full"></div>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-slate-400" />
                <span className="font-semibold text-slate-200">Language</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-400">English</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="text-center pt-8">
          <p className="text-xs text-slate-500 font-bold mb-1">E-Bike Platform v1.0.0</p>
          <button className="text-sm font-bold text-danger hover:text-danger/80 transition-colors">Delete Account</button>
        </div>

      </div>
    </div>
  );
}
