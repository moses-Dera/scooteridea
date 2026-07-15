'use client';

import { useState } from 'react';
import {
  FiBell,
  FiLogOut,
  FiMenu,
  FiX,
  FiLayout,
  FiMap,
  FiBatteryCharging,
  FiSettings,
  FiBarChart2,
  FiPlayCircle,
} from 'react-icons/fi';
import { MdDirectionsBike } from 'react-icons/md';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function HeaderActions({ session }: { session: any }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-4">
      {/* Mobile Hamburger Menu Toggle */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="md:hidden relative p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
      >
        <FiMenu className="w-5 h-5" />
      </button>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md md:hidden flex flex-col pointer-events-auto">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center">
              <img
                src="https://scooterfy.vercel.app/wordmark-transparent.png"
                alt="Scooterfy"
                className="h-10 object-contain drop-shadow-md"
              />
              <span className="ml-2 text-xl font-bold text-primary tracking-tight">Ops</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex flex-col gap-2 p-6 flex-grow overflow-y-auto">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white font-medium flex items-center gap-3 transition-colors"
            >
              <FiLayout className="w-5 h-5" /> Overview
            </Link>
            <Link
              href="/fleet"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white font-medium flex items-center gap-3 transition-colors"
            >
              <FiMap className="w-5 h-5" /> Fleet Map
            </Link>
            <Link
              href="/docks"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white font-medium flex items-center gap-3 transition-colors"
            >
              <FiBatteryCharging className="w-5 h-5" /> Docks
            </Link>
            <Link
              href="/rides"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white font-medium flex items-center gap-3 transition-colors"
            >
              <MdDirectionsBike className="w-5 h-5" /> Rides
            </Link>
            <Link
              href="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white font-medium flex items-center gap-3 transition-colors"
            >
              <FiBarChart2 className="w-5 h-5" /> Analytics
            </Link>
            <Link
              href="/simulator"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 rounded-lg bg-[#1ED760]/10 hover:bg-[#1ED760]/20 text-[#1ED760] border border-[#1ED760]/20 font-medium flex items-center gap-3 transition-colors mt-2"
            >
              <FiPlayCircle className="w-5 h-5" /> Simulator
            </Link>

            {(session?.user as any)?.role === 'ADMIN' && (
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase px-4">
                  Admin Features
                </span>
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white font-medium flex items-center gap-3 transition-colors"
                >
                  <FiSettings className="w-5 h-5" /> System Settings
                </Link>
              </div>
            )}
          </nav>
          
          <div className="p-6 border-t border-white/10 mt-auto">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors font-bold text-sm border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
            >
              <FiLogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Actions Removed */}
    </div>
  );
}
