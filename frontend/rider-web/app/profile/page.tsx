'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, Shield, LogOut } from 'lucide-react';
import { useProfile } from '@/hooks';
import { useAuthStore } from '@/store/authStore';

export default function ProfilePage() {
  const { profile: user, loading, error } = useProfile();
  const logout = useAuthStore((state) => state.logout);

  const stats = {
    totalRides: 0, // Will fetch from ride history if needed
    totalDistance: 0,
    totalTime: 0,
  };

  if (loading) {
    return (
      <div className="w-full h-full relative flex flex-col bg-background overflow-y-auto">
        <header className="pt-20 pb-6 px-6">
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/"
              className="w-10 h-10 rounded-full glass-button flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              ←
            </Link>
            <div className="text-2xl font-bold">Profile</div>
          </div>
        </header>
        <main className="flex-1 px-6 pb-8 overflow-y-auto flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1ED760] mx-auto mb-4"></div>
            <p className="text-slate-400">Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full relative flex flex-col bg-background overflow-y-auto">
        <header className="pt-20 pb-6 px-6">
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/"
              className="w-10 h-10 rounded-full glass-button flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              ←
            </Link>
            <div className="text-2xl font-bold">Profile</div>
          </div>
        </header>
        <main className="flex-1 px-6 pb-8 overflow-y-auto">
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
            {error}
          </div>
        </main>
      </div>
    );
  }
  return (
    <div className="w-full h-full relative flex flex-col bg-background overflow-y-auto">
      {/* Header */}
      <header className="pt-20 pb-6 px-6">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="w-10 h-10 rounded-full glass-button flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            ←
          </Link>
          <div className="text-2xl font-bold">Profile</div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 pb-8 overflow-y-auto">
        {/* Profile Card */}
        <div className="w-full bg-gradient-to-br from-[#111622] to-[#0A0D14] border border-white/10 rounded-2xl p-8 mb-6 shadow-xl">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1ED760] to-[#00CC7F] flex items-center justify-center">
              <span className="text-2xl font-bold text-black">
                {(user?.name?.[0] || 'U') + (user?.email?.[1] || 'U')}
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{user?.name || 'User'}</div>
              <p className="text-slate-400">{user?.status || 'Active'}</p>
              <div className="flex gap-2 mt-2">
                <span className="px-3 py-1 rounded-full bg-[#1ED760]/20 text-[#1ED760] text-xs font-semibold">
                  {user?.verified ? 'Verified' : 'Not Verified'}
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <Mail className="w-5 h-5 text-[#1ED760]" />
              <div className="flex-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Email</p>
                <p className="text-white font-medium text-sm break-all">
                  {user?.email || 'Not set'}
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <Phone className="w-5 h-5 text-[#1ED760]" />
              <div className="flex-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Phone</p>
                <p className="text-white font-medium">{user?.phone || 'Not added'}</p>
              </div>
            </div>

            {/* Wallet Balance */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <MapPin className="w-5 h-5 text-[#1ED760]" />
              <div className="flex-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Balance</p>
                <p className="text-white font-medium">
                  ₦{user?.wallet?.current?.toLocaleString() || '0'}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <Shield className="w-5 h-5 text-[#1ED760]" />
              <div className="flex-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Status</p>
                <p className="text-white font-medium capitalize">{user?.status || 'Active'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="w-full bg-gradient-to-br from-[#111622] to-[#0A0D14] border border-white/10 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="text-lg font-bold text-white mb-6">Riding Statistics</div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#1ED760] mb-2">{stats.totalRides}</div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Rides</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#1ED760] mb-2">{stats.totalDistance}</div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">km Traveled</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#1ED760] mb-2">{stats.totalTime}h</div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Time</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full bg-gradient-to-br from-[#111622] to-[#0A0D14] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="text-lg font-bold text-white mb-4">Account Settings</div>

          <div className="space-y-3">
            <button className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-left font-medium">
              Edit Profile
            </button>
            <button className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-left font-medium">
              Payment Methods
            </button>
            <button className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-left font-medium">
              Emergency Contacts
            </button>
            <button className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-left font-medium">
              Privacy & Security
            </button>
            <button
              className="w-full py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors font-medium flex items-center gap-2"
              onClick={() => {
                import('next-auth/react').then(({ signOut }) => {
                  logout();
                  signOut({ callbackUrl: '/' });
                });
              }}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
