import './globals.css';
import type { Metadata } from 'next';
import {
  FiLayout,
  FiMap,
  FiBatteryCharging,
  FiSettings,
  FiBell,
  FiBarChart2,
  FiPlayCircle,
} from 'react-icons/fi';
import { MdDirectionsBike } from 'react-icons/md';
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import HeaderActions from '@/components/HeaderActions';
import SessionWatcher from '@/components/SessionWatcher';

import { Outfit } from 'next/font/google';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Scooterfy Operator Dashboard',
  description: 'Fleet management and operations dashboard for Scooterfy.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={`dark ${outfit.variable}`}>
      <body className="h-[100dvh] overflow-hidden bg-background text-white antialiased flex flex-col md:flex-row font-sans">
        <SessionWatcher sessionError={(session as any)?.error} />
        {!session ? (
          /* Render full screen for login page */
          <main className="flex-1 w-full h-full overflow-y-auto">{children}</main>
        ) : (
          /* Render authenticated dashboard layout */
          <>
            {/* Sidebar (Mobile Hidden / Desktop Visible) */}
            <aside className="w-full md:w-64 border-r border-white/10 glass-panel flex flex-col p-6 hidden md:flex">
              <div className="flex items-center mb-10">
                <img
                  src="https://scooterfy.vercel.app/wordmark-transparent.png"
                  alt="Scooterfy"
                  className="h-12 object-contain"
                />
                <span className="ml-3 text-2xl font-bold text-primary tracking-tight">Ops</span>
              </div>
              <nav className="flex flex-col gap-2 flex-grow">
                <Link
                  href="/"
                  className="px-4 py-2.5 rounded-lg bg-primary/10 text-primary font-medium flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <FiLayout className="w-5 h-5" />
                  <span>Overview</span>
                </Link>
                <Link
                  href="/fleet"
                  className="px-4 py-2.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white font-medium flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <FiMap className="w-5 h-5" />
                  <span>Fleet Map</span>
                </Link>
                <Link
                  href="/docks"
                  className="px-4 py-2.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white font-medium flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <FiBatteryCharging className="w-5 h-5" />
                  <span>Docks</span>
                </Link>
                <Link
                  href="/rides"
                  className="px-4 py-2.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white font-medium flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <MdDirectionsBike className="w-5 h-5" />
                  <span>Rides</span>
                </Link>
                <Link
                  href="/analytics"
                  className="px-4 py-2.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white font-medium flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <FiBarChart2 className="w-5 h-5" />
                  <span>Analytics</span>
                </Link>
                <Link
                  href="/simulator"
                  className="px-4 py-2.5 rounded-lg bg-[#1ED760]/10 hover:bg-[#1ED760]/20 text-[#1ED760] border border-[#1ED760]/20 font-medium flex items-center gap-3 transition-colors cursor-pointer mt-4"
                >
                  <FiPlayCircle className="w-5 h-5" />
                  <span>Simulator</span>
                </Link>

                {/* Admin Only Features */}
                {(session?.user as any)?.role === 'ADMIN' && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase px-4">
                      Admin Features
                    </span>
                    <Link
                      href="/settings"
                      className="px-4 py-2.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white font-medium flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <FiSettings className="w-5 h-5" />
                      <span>System Settings</span>
                    </Link>
                  </div>
                )}
              </nav>
              <div className="mt-auto flex flex-col gap-3 pt-6 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {session?.user?.name?.[0]?.toUpperCase() || 'O'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">
                      {session?.user?.name || 'Operator'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2 py-1 rounded text-center">
                    {(session?.user as any)?.role || 'OPERATOR'}
                  </div>
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
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
              <header className="h-16 shrink-0 border-b border-white/10 flex items-center justify-between px-4 md:px-8 bg-surface z-20">
                <div className="hidden md:block text-lg font-semibold">Dashboard Overview</div>
                <div className="md:hidden flex items-center">
                  <img
                    src="https://scooterfy.vercel.app/wordmark-transparent.png"
                    alt="Scooterfy"
                    className="h-8 object-contain drop-shadow-md"
                  />
                  <span className="ml-2 text-xl font-bold text-primary tracking-tight">Ops</span>
                </div>
                <HeaderActions session={session} />
              </header>
              <div className="flex-1 overflow-auto p-4 md:p-8">{children}</div>
            </main>
          </>
        )}
      </body>
    </html>
  );
}
