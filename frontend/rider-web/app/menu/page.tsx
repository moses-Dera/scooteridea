'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function MenuPage() {
  const router = useRouter();

  const menuItems = [
    {
      title: 'Wallet',
      description: 'Balance & Payment Methods',
      icon: '💳',
      href: '/wallet',
    },
    {
      title: 'Ride History',
      description: 'View past trips & analytics',
      icon: '📊',
      href: '/ride/history',
    },
    {
      title: 'Docking Stations',
      description: 'Find nearby docks',
      icon: '🚲',
      href: '/docks',
    },
    {
      title: 'Settings',
      description: 'Preferences & Security',
      icon: '⚙️',
      href: '/settings',
    },
    {
      title: 'Help & Support',
      description: 'FAQ & Customer Support',
      icon: '❓',
      href: '/help',
    },
    {
      title: 'Safety',
      description: 'Safety features & tips',
      icon: '🛡️',
      href: '/safety',
    },
    {
      title: 'Report a Problem',
      description: 'Report bug or issue',
      icon: '⚠️',
      href: '/report',
    },
  ];

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  return (
    <div className="w-full h-screen bg-[#0A0D14]">
      {/* Header with back button */}
      <div className="sticky top-0 z-40 pt-20 px-6 pb-6 border-b border-white/10 bg-[#0A0D14]/95 backdrop-blur">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-white">Menu</h1>
        </div>
      </div>

      {/* Main menu content - scrollable */}
      <div className="h-[calc(100vh-120px)] overflow-y-auto">
        <div className="px-6 py-6 space-y-3">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block p-4 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl mt-1">{item.icon}</div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-[#00FFA3] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-400">{item.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Logout button at bottom */}
        <div className="px-6 py-6 border-t border-white/10 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
