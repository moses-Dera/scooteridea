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
      <div className="sticky top-0 z-40 pt-20 px-6 pb-6 border-b border-white/5 bg-background/80 backdrop-blur-2xl">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="text-2xl font-bold text-white">Menu</div>
        </div>
      </div>

      {/* Main menu content - scrollable */}
      <div className="h-[calc(100vh-120px)] overflow-y-auto scrollbar-hide pb-20">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
          {menuItems.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block relative overflow-hidden rounded-2xl bg-surfaceLight/40 backdrop-blur-md border border-white/5 hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,255,135,0.1)]"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="relative p-5 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors shadow-inner">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg tracking-tight group-hover:text-primary transition-colors">
                      {item.title}
                    </div>
                    <p className="text-sm text-slate-400 font-medium">{item.description}</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-black text-slate-400 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Logout button at bottom */}
        <div className="max-w-3xl mx-auto px-6 py-8 mt-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full relative group overflow-hidden py-4 px-6 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-400 hover:text-white font-bold text-lg flex items-center justify-center gap-3 transition-all"
          >
            {/* Hover Background */}
            <div className="absolute inset-0 bg-red-500/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>

            <svg
              className="w-5 h-5 relative z-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="relative z-10 tracking-wide uppercase">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
