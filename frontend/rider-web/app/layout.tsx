'use client'
import './globals.css'
import { AuthProvider } from '@/providers/AuthProvider'
import { RideProvider } from '@/context/RideContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useCallback, useEffect } from 'react'
import RiderMap from '@/components/Map/RiderMap'
import MenuPanel from '@/components/panels/MenuPanel'
import ProfilePanel from '@/components/panels/ProfilePanel'
import WalletPanel from '@/components/panels/WalletPanel'
import HistoryPanel from '@/components/panels/HistoryPanel'
import LoginOverlay from '@/components/panels/LoginOverlay'

import { AlertCircle } from 'lucide-react'

type PanelType = 'menu' | 'profile' | 'wallet' | 'history' | 'docks' | 'settings' | 'help' | 'safety' | 'report' | 'login' | null;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [authFeature, setAuthFeature] = useState<string | null>(null);

  // Clear active panel on route change
  useEffect(() => {
    setActivePanel(null);
  }, [pathname]);

  const togglePanel = useCallback((panel: PanelType) => {
    setActivePanel(prev => prev === panel ? null : panel);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  const openPanel = useCallback((panel: PanelType) => {
    setActivePanel(panel);
  }, []);

  useEffect(() => {
    const handleAuthRequired = (e: CustomEvent<{ feature: string }>) => {
      setAuthFeature(e.detail?.feature || null);
      setActivePanel('login');
    };
    window.addEventListener('auth-required', handleAuthRequired as EventListener);
    return () => window.removeEventListener('auth-required', handleAuthRequired as EventListener);
  }, []);

  // Pages that need their own full layout (unlock flow, active ride, etc.)
  const isFullScreenPage = pathname?.startsWith('/ride/active') ||
                           pathname?.startsWith('/unlock');

  return (
    <html lang="en" className="dark">
      <head>
        <title>Scooter - E-Bike Sharing</title>
        <meta name="description" content="Unlock and ride electric bikes in your city." />
      </head>
      <body className="min-h-screen bg-background text-white antialiased overflow-hidden">
        <AuthProvider>
        <RideProvider>
        <div className="w-full h-screen h-[100dvh] relative flex flex-col overflow-hidden bg-background">
          
          {isFullScreenPage ? (
            /* Full-screen pages get their own layout */
            <main className="h-full w-full relative flex-1">
              {children}
            </main>
          ) : (
            <>
              {/* 🗺️ Persistent Map Background */}
              <div className="absolute inset-0 z-0 pointer-events-auto">
                <RiderMap />
              </div>

              {/* 📱 Main Floating Header Navigation (Hide when login overlay is active) */}
              {activePanel !== 'login' && !pathname?.startsWith('/login') && !pathname?.startsWith('/register') && (
                <header className={`absolute top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50 px-6 py-3 flex items-center justify-between bg-surfaceLight/40 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 ${activePanel ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                
                {/* Left: Menu & Profile */}
                <div className="flex items-center gap-2 sm:gap-6">
                   <button 
                     onClick={() => togglePanel('menu')} 
                     className={`group flex items-center gap-2 px-3 py-2 rounded-full transition-all cursor-pointer active:scale-95 ${activePanel === 'menu' ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5'}`}
                   >
                     <div className="relative">
                       <svg className={`w-5 h-5 transition-colors ${activePanel === 'menu' ? 'text-primary' : 'text-slate-300 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h8" /></svg>
                       <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                     </div>
                     <span className={`font-semibold text-sm transition-colors hidden sm:block ${activePanel === 'menu' ? 'text-primary' : 'text-slate-300 group-hover:text-white'}`}>Menu</span>
                   </button>
                   <button 
                     onClick={() => togglePanel('profile')} 
                     className={`group flex items-center gap-2 px-3 py-2 rounded-full transition-all cursor-pointer active:scale-95 ${activePanel === 'profile' ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5'}`}
                   >
                     <svg className={`w-5 h-5 transition-colors ${activePanel === 'profile' ? 'text-primary' : 'text-slate-300 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                     <span className={`font-semibold text-sm transition-colors hidden sm:block ${activePanel === 'profile' ? 'text-primary' : 'text-slate-300 group-hover:text-white'}`}>Profile</span>
                   </button>
                </div>
                
                {/* Center: Glowing Bike Logo */}
                <div className="flex items-center justify-center absolute left-1/2 -translate-x-1/2">
                   <button onClick={closePanel} className="relative group cursor-pointer">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition-all duration-500"></div>
                    <div className="relative bg-background border border-white/10 p-2.5 rounded-full shadow-xl transform group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <circle cx="5" cy="18" r="3" strokeWidth={2.5} />
                        <circle cx="19" cy="18" r="3" strokeWidth={2.5} />
                        <path strokeWidth={2.5} d="M12 17.5V14l-3-3 4-3 2 3h2" />
                      </svg>
                    </div>
                   </button>
                </div>
                
                {/* Right: Map, Docks, History */}
                <div className="flex items-center gap-1 sm:gap-4">
                   <button onClick={closePanel} className="relative group flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer active:scale-95 transition-all bg-primary/10 border border-primary/20">
                     <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                     <span className="font-bold text-sm text-primary hidden sm:block">Map</span>
                   </button>
                   <button onClick={() => togglePanel('wallet')} className="group flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/5 transition-all cursor-pointer active:scale-95">
                     <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                   </button>
                   <button onClick={() => togglePanel('history')} className="group flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/5 transition-all cursor-pointer active:scale-95">
                     <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </button>
                 </div>
              </header>
              )}

              {/* Overlay Panels - slide up from bottom over the map */}
              {activePanel && activePanel !== 'login' && (
                <div className="absolute inset-0 z-40 flex flex-col justify-end pointer-events-none">
                  {/* Backdrop */}
                  <div 
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300"
                    onClick={closePanel}
                  />
                  {/* Panel */}
                  <div className="relative pointer-events-auto max-h-[85vh] bg-[#0A0D14]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[32px] shadow-[0_-20px_60px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-500 ease-out overflow-hidden flex flex-col">
                    {/* Drag handle */}
                    <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                      <div className="w-10 h-1 rounded-full bg-white/20"></div>
                    </div>
                    <div className="overflow-y-auto flex-1 scrollbar-hide pb-8">
                      {activePanel === 'menu' && <MenuPanel onClose={closePanel} onOpenPanel={openPanel} />}
                      {activePanel === 'profile' && <ProfilePanel onClose={closePanel} />}
                      {activePanel === 'wallet' && <WalletPanel onClose={closePanel} />}
                      {activePanel === 'history' && <HistoryPanel onClose={closePanel} />}
                      {['docks', 'settings', 'help', 'safety', 'report'].includes(activePanel || '') && (
                        <div className="px-6 pb-6 text-center py-12">
                          <div className="flex justify-center mb-4"><AlertCircle className="w-12 h-12 text-slate-500" /></div>
                          <h2 className="text-xl font-bold text-white mb-2">Coming Soon</h2>
                          <p className="text-slate-400">This feature is currently under development.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Full-screen Login Overlay */}
              {activePanel === 'login' && (
                <div className="absolute inset-0 z-50 pointer-events-auto animate-in fade-in duration-300">
                  <LoginOverlay feature={authFeature} onClose={closePanel} />
                </div>
              )}

              {/* Page-specific overlays (bike details, etc.) */}
              <div className="absolute inset-0 z-30 pointer-events-none">
                {children}
              </div>
            </>
          )}
          
        </div>
        </RideProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
