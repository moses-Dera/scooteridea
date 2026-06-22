import './globals.css'
import type { Metadata } from 'next'
import { LayoutDashboard, Map, BatteryCharging, Bike, BarChart3, Bell } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Scooter Operator Dashboard',
  description: 'Fleet management and operations dashboard for Scooter E-Bikes.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-white antialiased flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-white/10 glass-panel flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">V</div>
            <h1 className="text-xl font-bold tracking-tight">Scooter <span className="text-primary">Ops</span></h1>
          </div>
          <nav className="flex flex-col gap-2 flex-grow">
            <Link href="/" className="px-4 py-2.5 rounded-lg bg-primary/10 text-primary font-medium flex items-center gap-3 transition-colors cursor-pointer">
              <LayoutDashboard className="w-5 h-5" />
              <span>Overview</span>
            </Link>
            <Link href="/fleet" className="px-4 py-2.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white font-medium flex items-center gap-3 transition-colors cursor-pointer">
              <Map className="w-5 h-5" />
              <span>Fleet Map</span>
            </Link>
            <Link href="/docks" className="px-4 py-2.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white font-medium flex items-center gap-3 transition-colors cursor-pointer">
              <BatteryCharging className="w-5 h-5" />
              <span>Docks</span>
            </Link>
            <Link href="/rides" className="px-4 py-2.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white font-medium flex items-center gap-3 transition-colors cursor-pointer">
              <Bike className="w-5 h-5" />
              <span>Rides</span>
            </Link>
            <Link href="/analytics" className="px-4 py-2.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white font-medium flex items-center gap-3 transition-colors cursor-pointer">
              <BarChart3 className="w-5 h-5" />
              <span>Analytics</span>
            </Link>
            <Link href="/simulator" className="px-4 py-2.5 rounded-lg bg-[#00FFA3]/10 hover:bg-[#00FFA3]/20 text-[#00FFA3] border border-[#00FFA3]/20 font-medium flex items-center gap-3 transition-colors cursor-pointer mt-4">
              <span className="text-xl">🎮</span>
              <span>Simulator</span>
            </Link>
          </nav>
          <div className="mt-auto flex items-center gap-3 pt-6 border-t border-white/10">
             <div className="w-10 h-10 rounded-full bg-slate-700"></div>
             <div>
               <p className="text-sm font-medium">Ops Admin</p>
               <p className="text-xs text-slate-400">admin@scooter.com</p>
             </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-surface/40 backdrop-blur-sm z-10">
             <h2 className="text-lg font-semibold">Dashboard Overview</h2>
             <div className="flex items-center gap-4">
                <button className="relative p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors">
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border border-background"></span>
                  <Bell className="w-5 h-5" />
                </button>
             </div>
          </header>
          <div className="flex-1 overflow-auto p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
