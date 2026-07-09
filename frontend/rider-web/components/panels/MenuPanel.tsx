'use client';

import { signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Wallet, BarChart, MapPin, Settings, HelpCircle, Shield, AlertTriangle } from 'lucide-react';

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
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const menuItems = [
    {
      title: 'Docking Stations',
      description: 'Find nearby docks',
      icon: <MapPin className="w-6 h-6" />,
      panelType: 'docks',
    },
    {
      title: 'Settings',
      description: 'Preferences & Security',
      icon: <Settings className="w-6 h-6" />,
      panelType: 'settings',
    },
    {
      title: 'Help & Support',
      description: 'FAQ & Customer Support',
      icon: <HelpCircle className="w-6 h-6" />,
      panelType: 'help',
    },
    {
      title: 'Safety',
      description: 'Safety features & tips',
      icon: <Shield className="w-6 h-6" />,
      panelType: 'safety',
    },
    {
      title: 'Report a Problem',
      description: 'Report bug or issue',
      icon: <AlertTriangle className="w-6 h-6" />,
      panelType: 'report',
    },
  ];

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  return (
    <div className="px-6 pb-6">
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
      <div className="space-y-4">
        {menuItems.map((item, i) => (
          <button
            key={item.panelType}
            onClick={() => onOpenPanel(item.panelType)}
            className="w-full text-left group block relative overflow-hidden rounded-2xl bg-surfaceLight/40 backdrop-blur-md border border-white/5 hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,255,135,0.1)] cursor-pointer"
            style={{ animationDelay: `${i * 100}ms` }}
          >

            <div className="relative p-5 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors shadow-inner">
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Logout button */}
      <div className="mt-8 border-t border-white/5 pt-6">
        <button
          onClick={handleLogout}
          className="w-full relative group overflow-hidden py-4 px-6 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-400 hover:text-white font-bold text-lg flex items-center justify-center gap-3 transition-all cursor-pointer"
        >
          {/* Hover Background */}
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
