'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import RiderMap from '@/components/Map/RiderMap'
import { RideTimer } from '@/components/rides/RideTimer'
import { useRide } from '@/context/RideContext'
import { ridesService } from '@/lib/ridesService'
import { Camera, CheckCircle, Navigation, Pause, AlertTriangle, Link2, Smartphone, Bike, X } from 'lucide-react'

type EndRideStep = 'idle' | 'photo-prompt' | 'uploading' | 'done'

export default function ActiveRide() {
  const router = useRouter()
  const { state, setError } = useRide()
  const [isEndingRide, setIsEndingRide] = useState(false)
  const [tetherEnabled, setTetherEnabled] = useState(false)
  const [endStep, setEndStep] = useState<EndRideStep>('idle')
  const watchIdRef = useRef<number | null>(null)

  // Developer Feature: Tether Bike to Phone's GPS
  useEffect(() => {
    if (tetherEnabled && state.activeRide) {
      if (navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (position) => {
            try {
              await fetch('/api/proxy/fleet/simulator/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  bikeId: state.activeRide?.bikeId,
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  battery_pct: 85,
                  speed_kmh: position.coords.speed ? (position.coords.speed * 3.6).toFixed(1) : 0,
                  lock_status: 'UNLOCKED'
                })
              });
            } catch (err) {
              console.error('Failed to sync telemetry', err);
            }
          },
          (err) => console.error("Tether GPS error", err),
          { enableHighAccuracy: true, maximumAge: 0 }
        );
      }
    } else {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    }
  }, [tetherEnabled, state.activeRide?.bikeId])

  // Redirect if no active ride
  useEffect(() => {
    if (!state.activeRide) {
      router.push('/')
    }
  }, [state.activeRide, router])

  const initiateEndRide = () => {
    setEndStep('photo-prompt')
  }

  const handleCapturePhotoAndEnd = async () => {
    if (!state.activeRide || !navigator.geolocation) {
      setError('Unable to end ride: location not available')
      setEndStep('idle')
      return
    }

    setEndStep('uploading')
    setIsEndingRide(true)

    // Simulate photo upload delay
    await new Promise(res => setTimeout(res, 1500))

    try {
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

            setEndStep('done')
            
            setTimeout(() => {
              // Redirect to receipt page
              router.push(`/ride/receipt/${state.activeRide!.id}`)
            }, 1000)
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to end ride'
            setError(message)
            setIsEndingRide(false)
            setEndStep('idle')
          }
        },
        (err) => {
          setError(`Geolocation error: ${err.message}`)
          setIsEndingRide(false)
          setEndStep('idle')
        }
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end ride'
      setError(message)
      setIsEndingRide(false)
      setEndStep('idle')
    }
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      
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
        <button className="mt-2 w-full h-10 bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-sm font-semibold flex items-center justify-center gap-2 group">
          <Navigation className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" /> Navigate
        </button>
      </div>

      {/* 🛑 Bottom Bar: End Ride Controls */}
      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md glass-panel rounded-3xl p-2 flex items-center justify-between z-20 shadow-2xl transition-transform duration-500 ${endStep !== 'idle' ? 'translate-y-32' : 'translate-y-0'}`}>
        
        {/* Bike Status Mini */}
        <div className="flex items-center gap-3 px-4 py-2">
           <div className="w-10 h-10 rounded-full bg-surfaceLight border border-white/5 flex items-center justify-center text-primary">
             <Bike className="w-5 h-5" />
           </div>
           <div className="flex flex-col">
             <span className="font-bold text-sm">{state.activeRide?.bikeId || 'N/A'}</span>
             <span className="text-xs text-primary font-medium">84% Battery</span>
           </div>
        </div>

        {/* End Ride Button */}
        <button 
          onClick={initiateEndRide}
          disabled={isEndingRide}
          className="h-14 px-6 bg-danger text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center transform hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
          End Ride
        </button>
      </div>

      {/* End Ride Parking Modal */}
      {endStep !== 'idle' && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-surfaceLight border-t sm:border border-white/10 shadow-2xl sm:rounded-3xl rounded-t-3xl p-6 md:p-8 relative overflow-hidden animate-in slide-in-from-bottom duration-500">
            
            {endStep === 'photo-prompt' && (
              <>
                <button onClick={() => setEndStep('idle')} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">Parked properly?</h2>
                <p className="text-slate-400 mb-8 leading-relaxed">
                  To end your ride, take a quick photo showing the bike is not blocking the sidewalk or street.
                </p>
                <button 
                  onClick={handleCapturePhotoAndEnd}
                  className="w-full h-14 bg-primary text-black font-bold text-lg rounded-xl shadow-glow-primary flex items-center justify-center gap-2 transform hover:scale-[1.02] transition-transform">
                  <Camera className="w-5 h-5" /> Take Photo to End
                </button>
              </>
            )}

            {endStep === 'uploading' && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-primary animate-spin mb-6"></div>
                <h2 className="text-xl font-bold text-white mb-2">Analyzing Parking...</h2>
                <p className="text-slate-400 text-center">Uploading photo and securely ending your ride.</p>
              </div>
            )}

            {endStep === 'done' && (
              <div className="flex flex-col items-center justify-center py-8 animate-in zoom-in-95">
                <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary shadow-glow-primary flex items-center justify-center mb-6">
                  <CheckCircle className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Ride Completed!</h2>
                <p className="text-slate-400 text-center">Generating your receipt...</p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Extra Controls */}
      <div className={`absolute bottom-28 right-6 flex flex-col gap-3 z-20 transition-transform duration-500 ${endStep !== 'idle' ? 'translate-x-24' : 'translate-x-0'}`}>
        {/* Developer Tether Mode */}
        <button 
          onClick={() => setTetherEnabled(!tetherEnabled)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${tetherEnabled ? 'bg-[#00FFA3] text-black shadow-[0_0_15px_rgba(0,255,163,0.5)] scale-110' : 'glass-panel text-white hover:bg-white/10'}`} 
          title="Tether Bike to Phone (Dev)"
        >
          {tetherEnabled ? <Link2 className="w-5 h-5" /> : <Smartphone className="w-5 h-5 text-slate-300" />}
        </button>

        <button className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors" title="Pause Ride">
          <Pause className="w-5 h-5" />
        </button>
        <button className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-slate-300 hover:text-danger hover:bg-white/10 transition-colors" title="Report Issue">
          <AlertTriangle className="w-5 h-5" />
        </button>
      </div>

    </div>
  )
}
