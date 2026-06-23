'use client';

import Link from 'next/link';
import { BarChart, Settings, Shield, AlertTriangle, Wallet, MapPin, HelpCircle } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';

interface MenuPanelProps {
  onClose: () => void;
  onOpenPanel: (panel: any) => void;
}

export default function MenuPanel({ onClose, onOpenPanel }: MenuPanelProps) {
  const { status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      window.dispatchEvent(new CustomEvent('auth-required', { detail: { feature: 'the Menu' } }));
    }
  }, [status]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="px-6 py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00FFA3]"></div>
      </div>
    );
  }

  const menuItems = [
    {
      title: 'Wallet',
      description: 'Balance & Payment Methods',
      icon: <Wallet className="w-5 h-5" />,
      panelType: 'wallet',
    },
    {
      title: 'Ride History',
      description: 'View past trips & analytics',
      icon: <BarChart className="w-5 h-5" />,
      panelType: 'history',
    },
    {
      title: 'Docking Stations',
      description: 'Find nearby docks',
      icon: <MapPin className="w-5 h-5" />,
      panelType: 'docks',
    },
    {
      title: 'Settings',
      description: 'Preferences & Security',
      icon: <Settings className="w-5 h-5" />,
      panelType: 'settings',
    },
    {
      title: 'Help & Support',
      description: 'FAQ & Customer Support',
      icon: <HelpCircle className="w-5 h-5" />,
      panelType: 'help',
    },
    {
      title: 'Safety',
      description: 'Safety features & tips',
      icon: <Shield className="w-5 h-5" />,
      panelType: 'safety',
    },
    {
      title: 'Report a Problem',
      description: 'Report bug or issue',
      icon: <AlertTriangle className="w-5 h-5" />,
      panelType: 'report',
    },
  ];

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  return (
    <div className="px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="text-2xl font-bold text-white">Menu</div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Menu Items */}
      <div className="space-y-3">
        {menuItems.map((item, i) => (
          <button
            key={item.panelType}
            onClick={() => onOpenPanel(item.panelType)}
            className="w-full text-left group block relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all duration-300 active:scale-[0.98] cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                  {item.icon}
                </div>
                <div>
                  <div className="font-bold text-white text-base tracking-tight group-hover:text-primary transition-colors">
                    {item.title}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{item.description}</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
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
