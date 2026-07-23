'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiShield } from 'react-icons/fi';
import ProfileModal from '@/components/ProfileModal';

export default function DesktopProfileActions({ role }: { role: string }) {
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2 py-1 rounded text-center">
          {role || 'OPERATOR'}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setProfileModalOpen(true)}
          className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors border border-transparent hover:border-white/20"
          title="Profile & Security"
        >
          <FiShield className="w-4 h-4" />
        </button>
        <Link
          href="/api/auth/signout"
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
          title="Sign Out"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </Link>
      </div>
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </div>
  );
}
