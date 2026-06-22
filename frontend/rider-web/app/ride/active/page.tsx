'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import RiderMap from '@/components/Map/RiderMap'
import { RideTimer } from '@/components/rides/RideTimer'
import { useRide } from '@/context/RideContext'
import { ridesService } from '@/lib/ridesService'

export default function ActiveRide() {
  const router = useRouter()
  const { state, setError } = useRide()
  const [isEndingRide, setIsEndingRide] = useState(false)

  // Redirect if no active ride
  useEffect(() => {
    if (!state.activeRide) {
      router.push('/')
    }
  }, [state.activeRide, router])

  const handleEndRide = async () => {
    if (!state.activeRide || !navigator.geolocation) {
      setError('Unable to end ride: location not available')
      return
    }

    try {
      setIsEndingRide(true)

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // End ride with current location (for demo, using first dock)
            const endDockId = 'dock-002' // Should be selected by user
            await ridesService.endRide(
              state.activeRide!.id,
              endDockId,
              position.coords.latitude,
              position.coords.longitude
            )

            // Redirect to receipt page
            router.push(`/ride/receipt/${state.activeRide!.id}`)
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to end ride'
            setError(message)
            setIsEndingRide(false)
          }
        },
        (err) => {
          setError(`Geolocation error: ${err.message}`)
          setIsEndingRide(false)
        }
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end ride'
      setError(message)
      setIsEndingRide(false)
    }
  }

  return (
    <div className="w-full h-full relative">
      
      {/* 🗺️ Full Screen Map Area */}
      <div className="absolute inset-0 bg-surface">
        <RiderMap />
      </div>

      {/* ⏱️ Top-Left: Active Ride Timer & Cost */}
      <div className="absolute top-24 xl:top-8 left-6 glass-panel rounded-2xl p-4 flex flex-col gap-1 z-20 min-w-[200px]">
        <RideTimer surgeMultiplier={state.activeRide?.surgeMultiplier || 1} />
      </div>

      {/* 🧭 Top-Right: Nearest Dock Navigation */}
      <div className="absolute top-24 xl:top-8 right-6 glass-panel rounded-2xl p-4 flex flex-col gap-2 z-20 w-[240px]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-slate-400 uppercase">Nearest Dock</span>
          <span className="bg-secondary/20 text-secondary text-xs px-2 py-0.5 rounded-md font-bold">3 free slots</span>
        </div>
        <h3 className="font-semibold text-white truncate">Oshodi Transit Hub</h3>
        <p className="text-slate-400 text-sm">1.2 km away • ~4 mins</p>
        <button className="mt-2 w-full h-10 bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
          <span>↗</span> Navigate
        </button>
      </div>

      {/* 🛑 Bottom Bar: End Ride Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md glass-panel rounded-3xl p-2 flex items-center justify-between z-20 shadow-2xl">
        
        {/* Bike Status Mini */}
        <div className="flex items-center gap-3 px-4 py-2">
           <div className="w-10 h-10 rounded-full bg-surfaceLight border border-white/5 flex items-center justify-center text-lg">🚲</div>
           <div className="flex flex-col">
             <span className="font-bold text-sm">{state.activeRide?.bikeId || 'N/A'}</span>
             <span className="text-xs text-primary font-medium">84% Battery</span>
           </div>
        </div>

        {/* End Ride Button */}
        <button 
          onClick={handleEndRide}
          disabled={isEndingRide}
          className="h-14 px-6 bg-danger text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center transform hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
          {isEndingRide ? 'Ending...' : 'End Ride'}
        </button>
        
      </div>

      {/* Extra Controls */}
      <div className="absolute bottom-28 right-6 flex flex-col gap-3 z-20">
        <button className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-xl hover:bg-white/10 transition-colors" title="Pause Ride">
          ⏸️
        </button>
        <button className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-xl hover:bg-white/10 transition-colors" title="Report Issue">
          🚩
        </button>
      </div>

    </div>
  )
}
