'use client'
import './globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from '@/providers/AuthProvider'
import { RideProvider } from '@/context/RideContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Note: metadata can't be used in 'use client' components
// This is commented out - move to a parent layout if needed
// export const metadata: Metadata = {
//   title: 'VoltRide - E-Bike Sharing',
//   description: 'Unlock and ride electric bikes in your city.',
// }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  
  return (
    <html lang="en" className="dark">
      <head>
        <title>VoltRide - E-Bike Sharing</title>
        <meta name="description" content="Unlock and ride electric bikes in your city." />
      </head>
      <body className="min-h-screen bg-background text-white antialiased overflow-hidden">
        <AuthProvider>
        <RideProvider>
        <div className="w-full h-screen h-[100dvh] relative flex flex-col overflow-hidden bg-background">
          
          {/* Top Navbar - Premium Floating Glass Pill */}
          <header className="absolute top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50 px-6 py-3 flex items-center justify-between bg-surfaceLight/40 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            
            {/* Left: Menu & Profile */}
            <div className="flex items-center gap-2 sm:gap-6">
               <button onClick={() => router.push('/menu')} className="group flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/5 transition-all cursor-pointer active:scale-95">
                  <div className="relative">
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h8" /></svg>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  </div>
                  <span className="font-semibold text-sm text-slate-300 group-hover:text-white transition-colors hidden sm:block">Menu</span>
                </button>
               <button onClick={() => router.push('/profile')} className="group flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/5 transition-all cursor-pointer active:scale-95">
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <span className="font-semibold text-sm text-slate-300 group-hover:text-white transition-colors hidden sm:block">Profile</span>
                </button>
            </div>
            
            {/* Center: Glowing Bike Logo */}
            <div className="flex items-center justify-center absolute left-1/2 -translate-x-1/2">
               <Link href="/" className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition-all duration-500"></div>
                <div className="relative bg-background border border-white/10 p-2.5 rounded-full shadow-xl transform group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <circle cx="5" cy="18" r="3" strokeWidth={2.5} />
                    <circle cx="19" cy="18" r="3" strokeWidth={2.5} />
                    <path strokeWidth={2.5} d="M12 17.5V14l-3-3 4-3 2 3h2" />
                  </svg>
                </div>
               </Link>
            </div>
            
            {/* Right: Map, Docks, History */}
            <div className="flex items-center gap-1 sm:gap-4">
               <button onClick={() => router.push('/')} className="relative group flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer active:scale-95 transition-all bg-primary/10 border border-primary/20">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="font-bold text-sm text-primary hidden sm:block">Map</span>
                </button>
               <button onClick={() => router.push('/docks')} className="group flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/5 transition-all cursor-pointer active:scale-95">
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </button>
               <button onClick={() => router.push('/ride/history')} className="group flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/5 transition-all cursor-pointer active:scale-95">
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
            </div>
          </header>
          
          {/* Main Map Background Area */}
          <main className="h-full w-full relative flex-1">
            {children}
          </main>
          
        </div>
        </RideProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
