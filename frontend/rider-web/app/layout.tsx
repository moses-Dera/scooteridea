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
        <div className="w-full h-screen h-[100dvh] relative flex flex-col overflow-hidden bg-[#0A0D14]">
          
          {/* Top Navbar - Floats over everything */}
          <header className="absolute top-0 w-full z-50 px-6 py-4 flex items-center justify-between">
            
            {/* Left: Menu & Profile */}
            <div className="flex items-center gap-6">
               <button onClick={() => router.push('/menu')} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-95">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                  <span className="font-medium hidden sm:block">Menu</span>
                </button>
               <button onClick={() => router.push('/profile')} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-95">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <span className="font-medium hidden sm:block">Profile</span>
                </button>
            </div>
            
            {/* Center: Bike Logo */}
            <div className="flex items-center justify-center">
               <Link href="/" className="cursor-pointer hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-[#00FFA3] drop-shadow-[0_0_10px_rgba(0,255,163,0.8)] hover:drop-shadow-[0_0_20px_rgba(0,255,163,1.0)] transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <circle cx="5" cy="18" r="3" />
                  <circle cx="19" cy="18" r="3" />
                  <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
                </svg>
               </Link>
            </div>
            
            {/* Right: Map, Docks, History */}
            <div className="flex items-center gap-8">
               <button onClick={() => router.push('/')} className="flex items-center gap-2 text-[#00FFA3] border-b-2 border-[#00FFA3] pb-1 cursor-pointer hover:opacity-80 transition-opacity active:scale-95">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="font-medium hidden sm:block">Map</span>
                </button>
               <button onClick={() => router.push('/docks')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors pb-1 border-b-2 border-transparent cursor-pointer active:scale-95">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  <span className="font-medium hidden sm:block">Docks</span>
                </button>
               <button onClick={() => router.push('/ride/history')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors pb-1 border-b-2 border-transparent cursor-pointer active:scale-95">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="font-medium hidden sm:block">History</span>
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
