'use client';

import { Mail, Phone, Shield, LogOut } from 'lucide-react';
import { useProfile } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ProfilePanelProps {
  onClose: () => void;
}

export default function ProfilePanel({ onClose }: ProfilePanelProps) {
  const { status } = useSession();
  const { profile: user, loading, error, refetch } = useProfile();
  const logout = useAuthStore((state) => state.logout);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && !isEditing) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
    }
  }, [user, isEditing]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const { userApi } = await import('@/lib/api');
      await userApi.updateProfile({ name: editName, phone: editPhone });
      await refetch();
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      window.dispatchEvent(
        new CustomEvent('auth-required', { detail: { feature: 'your Profile' } }),
      );
    }
  }, [status]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="px-6 py-12 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-6 py-12 flex items-center justify-center">
        <LoadingSpinner size="md" text="Loading profile..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-6">
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="text-2xl font-bold text-white">Profile</div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
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

      {/* Profile Card */}
      <div className="flex items-center gap-5 mb-6 p-5 rounded-2xl bg-white/5 border border-white/10">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1ED760] to-[#00CC7F] flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-black">
            {(user?.name?.[0] || 'U') + (user?.email?.[1] || 'U')}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-white font-bold mb-1 focus:outline-none focus:border-primary/50"
            />
          ) : (
            <div className="text-xl font-bold text-white truncate">{user?.name || 'User'}</div>
          )}
          <p className="text-sm text-slate-400 truncate">{user?.email || ''}</p>
          <div className="flex gap-2 mt-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#1ED760]/20 text-[#1ED760] text-[10px] font-bold uppercase tracking-wider">
              {user?.verified ? 'Verified' : 'Not Verified'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-2xl font-bold text-[#1ED760]">0</div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1 font-bold">
            Rides
          </p>
        </div>
        <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-2xl font-bold text-[#1ED760]">0 km</div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1 font-bold">
            Distance
          </p>
        </div>
        <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-2xl font-bold text-white">
            ₦{user?.wallet?.current?.toLocaleString() || '0'}
          </div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1 font-bold">
            Balance
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
          <Mail className="w-4 h-4 text-[#1ED760] flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Email</p>
            <p className="text-white font-medium text-xs truncate">{user?.email || 'Not set'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
          <Phone className="w-4 h-4 text-[#1ED760] flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Phone</p>
            {isEditing ? (
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+234..."
                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white font-medium text-xs focus:outline-none focus:border-primary/50 mt-0.5"
              />
            ) : (
              <p className="text-white font-medium text-xs">{user?.phone || 'Not added'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 mb-4">
        {isEditing ? (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 px-4 rounded-xl bg-primary text-black hover:bg-primary/90 transition-colors font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSaving ? <LoadingSpinner size="sm" /> : 'Save Changes'}
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-left font-medium text-sm active:scale-[0.98]"
          >
            Edit Profile
          </button>
        )}
        <button className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-left font-medium text-sm active:scale-[0.98]">
          Payment Methods
        </button>
        <button className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-left font-medium text-sm active:scale-[0.98]">
          Privacy & Security
        </button>
      </div>

      {/* Logout */}
      <button
        className="w-full py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
        onClick={() => {
          logout();
          signOut({ redirect: false }).then(() => {
            window.location.reload();
          });
          onClose();
        }}
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  );
}
