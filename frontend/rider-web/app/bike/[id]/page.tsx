'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ridesService } from '@/lib/ridesService'
import { useRide } from '@/context/RideContext'

export default function BikeDetail({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { setActiveRide, setLoading, setError } = useRide()
  const [isReserving, setIsReserving] = useState(false)
  const bikeId = params.id

  const handleReserve = async () => {
    try {
      setIsReserving(true)
      setLoading(true)
      setError(null)

      // Reserve the bike (startDockId would come from bike location/context)
      const ride = await ridesService.reserve(bikeId, 'dock-001') // Mock dock ID
      setActiveRide(ride)

      // Navigate to unlock page
      router.push(`/unlock/${bikeId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reserve bike'
      setError(message)
      setIsReserving(false)
      setLoading(false)
    }
  }
  return (
    <div className="w-full h-full relative flex flex-col xl:flex-row-reverse">
      
      {/* 🗺️ Map Area (Background on Mobile, 60% on Desktop) */}
      <div className="flex-1 relative bg-surface h-full w-full">
        <div className="w-full h-full bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/3.37,6.52,14/1200x800?access_token=pk.ey')] bg-cover bg-center opacity-40"></div>
      </div>

      {/* 🚲 Bike Detail Panel (Right Drawer on Desktop, Bottom Sheet on Mobile) */}
      {/* The 60/40 split is maintained, but this replaces the main home panel */}
      <div className="absolute xl:relative bottom-0 right-0 w-full xl:w-[40%] 2xl:w-[35%] h-[85vh] xl:h-full glass-panel xl:glass-none xl:bg-surface xl:border-l border-white/10 rounded-t-3xl xl:rounded-none p-6 flex flex-col gap-6 animate-in slide-in-from-right xl:slide-in-from-right duration-300 z-40 shadow-2xl xl:shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="w-10 h-10 rounded-full glass-button xl:bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            ←
          </Link>
          <div className="px-3 py-1 bg-primary/20 border border-primary/30 rounded-full text-primary font-medium text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Available
          </div>
        </div>

        {/* Bike Hero */}
        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-6">
          <div className="w-full aspect-[4/3] bg-gradient-to-b from-surfaceLight to-transparent rounded-2xl border border-white/5 flex items-center justify-center relative">
            <span className="text-[120px] drop-shadow-2xl">🚲</span>
            <div className="absolute bottom-4 left-4 font-black text-3xl tracking-tighter opacity-20">BK-892</div>
          </div>

          {/* Battery Status */}
          <div className="bg-surfaceLight/50 p-5 rounded-2xl border border-white/5">
            <div className="flex justify-between items-end mb-2">
              <span className="text-slate-400 font-medium">Battery Level</span>
              <span className="text-primary font-bold text-xl">85%</span>
            </div>
            <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden">
              <div className="h-full bg-primary shadow-glow-primary rounded-full" style={{ width: '85%' }}></div>
            </div>
            <p className="text-slate-500 text-sm mt-3">~42 km of range remaining</p>
          </div>

          {/* Fare Estimate */}
          <div className="bg-surfaceLight/50 p-5 rounded-2xl border border-warning/20 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-warning/10 rounded-full blur-2xl"></div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-lg">Fare Estimate</span>
              <span className="bg-warning/20 text-warning border border-warning/30 px-2 py-0.5 rounded-md text-xs font-bold">1.2x SURGE</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold">₦ 60</span>
              <span className="text-slate-400">/ min</span>
            </div>
            <p className="text-slate-500 text-sm mt-2 flex items-center gap-1">
              <span className="text-warning">⚡</span> High demand in this area
            </p>
          </div>

          {/* Nearest Docks */}
          <div>
            <h3 className="font-semibold mb-3">Nearest Docks for Return</h3>
            <div className="flex flex-col gap-3">
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold">12</div>
                  <div>
                    <p className="font-medium">Oshodi Transit Hub</p>
                    <p className="text-slate-400 text-xs">400m away</p>
                  </div>
                </div>
                <button className="text-secondary hover:text-secondary/80 text-sm font-medium">Map</button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="pt-4 border-t border-white/10 mt-auto bg-surface/80 backdrop-blur-md">
          <button
            onClick={handleReserve}
            disabled={isReserving}
            className="w-full h-14 bg-primary text-black font-bold text-lg rounded-xl shadow-glow-primary flex items-center justify-center transform hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
            {isReserving ? 'Reserving...' : 'Unlock This Bike'}
          </button>
          {isReserving && <p className="text-center text-xs text-slate-400 mt-2">Connecting to bike...</p>}
          <p className="text-center text-xs text-slate-500 mt-4 font-medium tracking-wide uppercase">Scan QR • NFC • Enter PIN</p>
        </div>

      </div>
    </div>
  )
}
