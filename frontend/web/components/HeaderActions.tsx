"use client";

import { FiBell, FiLogOut } from 'react-icons/fi';
import { signOut } from 'next-auth/react';

export default function HeaderActions() {
  return (
    <div className="flex items-center gap-4">
      <button className="relative p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors">
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border border-background"></span>
        <FiBell className="w-5 h-5" />
      </button>
      <button 
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors font-medium text-sm border border-red-500/20"
      >
        <FiLogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  );
}
