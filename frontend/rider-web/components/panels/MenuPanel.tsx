'use client';

import Link from 'next/link';
import { BarChart, Settings, Shield, AlertTriangle } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface MenuPanelProps {
  onClose: () => void;
}

export default function MenuPanel({ onClose }: MenuPanelProps) {
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
      icon: <BarChart className="w-5 h-5" />,
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
      icon: <Settings className="w-5 h-5" />,
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
      icon: <Shield className="w-5 h-5" />,
      href: '/safety',
    },
    {
      title: 'Report a Problem',
      description: 'Report bug or issue',
      icon: <AlertTriangle className="w-5 h-5" />,
      href: '/report',
    },
  ];

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  return (
    <div className="px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <h2 className="text-2xl font-bold text-white">Menu</h2>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Menu Items */}
      <div className="space-y-3">
        {menuItems.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="group block relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all duration-300 active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base tracking-tight group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">{item.description}</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Logout */}
      <div className="mt-6 pt-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full relative group overflow-hidden py-4 px-6 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-400 hover:text-white font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-red-500/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="relative z-10 tracking-wide uppercase">Logout</span>
        </button>
      </div>
    </div>
  );
}
