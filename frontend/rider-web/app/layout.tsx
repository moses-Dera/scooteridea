'use client';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { RideProvider } from '@/context/RideContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useEffect, Suspense } from 'react';
import RiderMap from '@/components/Map/RiderMap';
import MenuPanel from '@/components/panels/MenuPanel';
import ProfilePanel from '@/components/panels/ProfilePanel';
import WalletPanel from '@/components/panels/WalletPanel';
import HistoryPanel from '@/components/panels/HistoryPanel';
import DocksPanel from '@/components/panels/DocksPanel';
import LoginOverlay from '@/components/panels/LoginOverlay';
import SettingsPanel from '@/components/panels/SettingsPanel';
import HelpPanel from '@/components/panels/HelpPanel';
import SafetyPanel from '@/components/panels/SafetyPanel';
import ReportPanel from '@/components/panels/ReportPanel';
import PasswordUpdateModal from '@/components/panels/PasswordUpdateModal';
import TwoFactorSetupModal from '@/components/panels/TwoFactorSetupModal';
import PaymentMethodsModal from '@/components/panels/PaymentMethodsModal';
import SplashScreen from '@/components/SplashScreen';

import { AlertCircle } from 'lucide-react';

import { Toaster } from 'react-hot-toast';

type PanelType =
  | 'menu'
  | 'profile'
  | 'wallet'
  | 'history'
  | 'docks'
  | 'settings'
  | 'help'
  | 'safety'
  | 'report'
  | 'login'
  | 'password'
  | '2fa'
  | 'payment-methods'
  | null;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [authFeature, setAuthFeature] = useState<string | null>(null);

  // Clear active panel on route change
  useEffect(() => {
    setActivePanel(null);
  }, [pathname]);

  const togglePanel = useCallback((panel: PanelType) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
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
    const handleOpenPanel = (e: CustomEvent<PanelType>) => {
      setActivePanel(e.detail);
    };
    window.addEventListener('auth-required', handleAuthRequired as EventListener);
    window.addEventListener('open-panel', handleOpenPanel as EventListener);

    return () => {
      window.removeEventListener('auth-required', handleAuthRequired as EventListener);
      window.removeEventListener('open-panel', handleOpenPanel as EventListener);
    };
  }, []);

  // Pages that need their own full layout (unlock flow, active ride, etc.)
  const isFullScreenPage = pathname?.startsWith('/ride/active') || pathname?.startsWith('/unlock');

  return (
    <html lang="en" className="dark">
      <head>
        <title>Scooterfy - Premium Urban Mobility</title>
        <meta name="description" content="Unlock and ride electric bikes in your city." />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1ED760" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-background text-white antialiased overflow-hidden">
        <SplashScreen />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#111622',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            },
            success: { iconTheme: { primary: '#1ED760', secondary: '#000' } },
          }}
        />
        <AuthProvider>
          <RideProvider>
            <div className="w-full h-screen h-[100dvh] relative flex flex-col overflow-hidden bg-background">
              {isFullScreenPage ? (
                /* Full-screen pages get their own layout */
                <main className="h-full w-full relative flex-1">
                  <Suspense fallback={null}>{children}</Suspense>
                </main>
              ) : (
                <>
                  {/* 🗺️ Persistent Map Background */}
                  <div className="absolute inset-0 z-0 pointer-events-auto">
                    <Suspense
                      fallback={<div className="w-full h-full bg-[#0A0D14] animate-pulse" />}
                    >
                      <RiderMap />
                    </Suspense>
                  </div>

                  {/* 📱 Main Floating Header Navigation */}
                  {activePanel !== 'login' &&
                    !pathname?.startsWith('/login') &&
                    !pathname?.startsWith('/register') && (
                      <header
                        className={`absolute top-safe-6 top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50 px-2 py-2 sm:px-6 sm:py-3 flex items-center justify-between bg-[#111622]/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300 ${activePanel ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}`}
                      >
                        {/* Left: Menu & Profile */}
                        <div className="flex items-center gap-1 sm:gap-4 flex-1">
                          <button
                            onClick={() => togglePanel('menu')}
                            className={`group flex items-center gap-2 px-3 py-2 rounded-full transition-all cursor-pointer active:scale-95 ${activePanel === 'menu' ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5'}`}
                          >
                            <div className="relative">
                              <svg
                                className={`w-5 h-5 transition-colors ${activePanel === 'menu' ? 'text-primary' : 'text-slate-300 group-hover:text-white'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M4 6h16M4 12h16M4 18h8"
                                />
                              </svg>
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            </div>
                            <span
                              className={`font-semibold text-sm transition-colors hidden sm:block ${activePanel === 'menu' ? 'text-primary' : 'text-slate-300 group-hover:text-white'}`}
                            >
                              Menu
                            </span>
                          </button>
                          <button
                            onClick={() => togglePanel('profile')}
                            className={`group flex items-center gap-2 px-3 py-2 rounded-full transition-all cursor-pointer active:scale-95 ${activePanel === 'profile' ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5'}`}
                          >
                            <svg
                              className={`w-5 h-5 transition-colors ${activePanel === 'profile' ? 'text-primary' : 'text-slate-300 group-hover:text-white'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            <span
                              className={`font-semibold text-sm transition-colors hidden sm:block ${activePanel === 'profile' ? 'text-primary' : 'text-slate-300 group-hover:text-white'}`}
                            >
                              Profile
                            </span>
                          </button>
                        </div>

                        {/* Center: Custom Brand Logo */}
                        <div className="flex items-center justify-center shrink-0 mx-2">
                          <button
                            onClick={closePanel}
                            className="relative group cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95"
                          >
                            <img
                              src="/wordmark-transparent.png"
                              alt="Scooterfy"
                              className="h-9 sm:h-12 object-contain drop-shadow-md"
                            />
                          </button>
                        </div>

                        {/* Right: Wallet, History */}
                        <div className="flex items-center gap-1 sm:gap-4 flex-1 justify-end">
                          <button
                            onClick={() => togglePanel('wallet')}
                            className={`group flex items-center gap-2 px-3 py-2 rounded-full transition-all cursor-pointer active:scale-95 ${activePanel === 'wallet' ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5'}`}
                          >
                            <svg
                              className={`w-5 h-5 transition-colors ${activePanel === 'wallet' ? 'text-primary' : 'text-slate-300 group-hover:text-white'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => togglePanel('history')}
                            className={`group flex items-center gap-2 px-3 py-2 rounded-full transition-all cursor-pointer active:scale-95 ${activePanel === 'history' ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5'}`}
                          >
                            <svg
                              className={`w-5 h-5 transition-colors ${activePanel === 'history' ? 'text-primary' : 'text-slate-300 group-hover:text-white'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
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
                      <div className="relative pointer-events-auto max-h-[85vh] w-full md:max-w-md md:mx-auto md:mb-6 md:rounded-[32px] bg-[#0A0D14]/95 backdrop-blur-2xl border border-transparent border-t-white/10 md:border-white/10 rounded-t-[32px] shadow-[0_-20px_60px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-500 ease-out overflow-hidden flex flex-col">
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-2 flex-shrink-0 md:hidden">
                          <div className="w-10 h-1 rounded-full bg-white/20"></div>
                        </div>
                        <div className="overflow-y-auto flex-1 scrollbar-hide pb-8">
                          {activePanel === 'menu' && (
                            <MenuPanel onClose={closePanel} onOpenPanel={openPanel} />
                          )}
                          {activePanel === 'profile' && <ProfilePanel onClose={closePanel} />}
                          {activePanel === 'wallet' && <WalletPanel onClose={closePanel} />}
                          {activePanel === 'history' && <HistoryPanel onClose={closePanel} />}
                          {activePanel === 'docks' && <DocksPanel onClose={closePanel} />}
                          {activePanel === 'settings' && <SettingsPanel onClose={closePanel} />}
                          {activePanel === 'help' && <HelpPanel onClose={closePanel} />}
                          {activePanel === 'safety' && <SafetyPanel onClose={closePanel} />}
                          {activePanel === 'report' && <ReportPanel onClose={closePanel} />}
                          {activePanel === 'password' && (
                            <PasswordUpdateModal onClose={closePanel} />
                          )}
                          {activePanel === '2fa' && <TwoFactorSetupModal onClose={closePanel} />}
                          {activePanel === 'payment-methods' && (
                            <PaymentMethodsModal onClose={closePanel} />
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
                    <Suspense fallback={null}>{children}</Suspense>
                  </div>
                </>
              )}
            </div>
          </RideProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
