'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ridesService } from '@/lib/ridesService'
import { useRide } from '@/context/RideContext'

type UnlockStep = 'confirm' | 'method' | 'manual-pin' | 'done'

export default function UnlockModal({ params }: { params: { bikeId: string } }) {
  const [step, setStep] = useState<UnlockStep>('confirm')
  const router = useRouter()
  const { state, setLoading, setError } = useRide()
  const [isStarting, setIsStarting] = useState(false)
  const [unlockPin, setUnlockPin] = useState<string>('')

  const handleStartRide = async () => {
    if (!state.activeRide) {
      setError('No active reservation found')
      return
    }

    try {
      setIsStarting(true)
      setLoading(true)
      setError(null)

      await ridesService.startRide(state.activeRide.id)
      setStep('done')

      // Navigate after a short delay to show the success screen
      setTimeout(() => {
        router.push('/ride/active')
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start ride'
      setError(message)
      setIsStarting(false)
      setLoading(false)
    }
  }

  const handleStartManualPin = async () => {
    if (!state.activeRide) {
      setError('No active reservation found')
      return
    }

    try {
      setIsStarting(true)
      setLoading(true)
      setError(null)

      // Generate a secure 4-digit PIN pass
      const pin = Math.floor(1000 + Math.random() * 9000).toString()
      setUnlockPin(pin)

      // Mark ride as started in backend
      await ridesService.startRide(state.activeRide.id)
      
      setStep('manual-pin')
      setIsStarting(false)
      setLoading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start ride'
      setError(message)
      setIsStarting(false)
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-screen h-[100dvh] relative flex items-center justify-center p-4">
      
      {/* Blurred Map Background */}
      <div className="absolute inset-0 bg-surface z-0">
        <div className="w-full h-full bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/3.37,6.52,14/1200x800?access_token=pk.ey')] bg-cover bg-center opacity-30"></div>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md"></div>
      </div>

      {/* Centered Modal */}
      <div className="w-full max-w-md bg-surfaceLight border border-white/10 shadow-2xl shadow-primary/5 rounded-3xl p-6 md:p-8 z-10 animate-in zoom-in-95 duration-300 relative overflow-hidden">
        
         {/* Close Button */}
        <Link href={`/bike/${params.bikeId}`} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors z-20">
          ✕
        </Link>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8 mt-2">
          <div className={`h-1.5 flex-1 rounded-full ${step === 'confirm' || step === 'method' || step === 'done' ? 'bg-primary shadow-glow-primary' : 'bg-white/10'}`}></div>
          <div className={`h-1.5 flex-1 rounded-full ${step === 'method' || step === 'done' ? 'bg-primary shadow-glow-primary' : 'bg-white/10'}`}></div>
          <div className={`h-1.5 flex-1 rounded-full ${step === 'done' ? 'bg-primary shadow-glow-primary' : 'bg-white/10'}`}></div>
        </div>

        {/* Step 1: Confirm */}
        {step === 'confirm' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-2xl font-bold mb-2">Ready to ride?</div>
            <p className="text-slate-400 mb-6">You are about to unlock bike <strong className="text-white">{params.bikeId}</strong>. A standard fare of ₦50/min applies.</p>
            
            <div className="bg-black/30 rounded-xl p-4 mb-8 border border-white/5">
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-slate-400">Current Balance</span>
                <span className="font-semibold text-primary">₦ 2,400.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Surge Pricing</span>
                <span className="font-semibold text-warning">1.2x (Active)</span>
              </div>
            </div>

            <button 
              onClick={() => setStep('method')}
              className="w-full h-14 bg-primary text-black font-bold text-lg rounded-xl shadow-glow-primary flex items-center justify-center transform hover:scale-[1.02] transition-transform">
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Method Picker */}
        {step === 'method' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-2xl font-bold mb-2">How to unlock</div>
            <p className="text-slate-400 mb-6">Choose an unlock method for BK-892.</p>
            
            <div className="flex flex-col gap-3 mb-8">
              <button 
                onClick={handleStartRide}
                disabled={isStarting}
                className="w-full p-4 rounded-xl border border-primary bg-primary/10 flex items-center justify-between group hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">📱</span>
                  <span className="font-medium text-white">{isStarting ? 'Unlocking...' : 'Unlock via App'}</span>
                </div>
                <span className="text-primary font-bold">➔</span>
              </button>
              
              <button className="w-full p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between hover:border-white/20 transition-colors opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-4">
                  <span className="text-2xl opacity-70">📷</span>
                  <span className="font-medium text-slate-300">Scan QR Code</span>
                </div>
              </button>

              <button 
                onClick={handleStartManualPin}
                disabled={isStarting}
                className="w-full p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between hover:border-white/20 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">🔢</span>
                  <span className="font-medium text-slate-300">{isStarting ? 'Generating Pass...' : 'Get Unlock Pass (PIN)'}</span>
                </div>
              </button>
            </div>
            
            <button onClick={() => setStep('confirm')} className="w-full text-center text-sm text-slate-500 hover:text-white font-medium transition-colors">
              Go Back
            </button>
          </div>
        )}

        {/* Step 3: Manual PIN Flow */}
        {step === 'manual-pin' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col items-center py-4">
            <div className="text-2xl font-bold mb-2 text-center">Your Unlock Pass</div>
            <p className="text-slate-400 text-center mb-6">Punch this code into the scooter's keypad to unlock.</p>
            
            <div className="w-full bg-[#00D4FF]/10 border-2 border-[#00D4FF]/30 rounded-2xl p-6 flex flex-col items-center justify-center mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#00D4FF]/5 to-transparent"></div>
                <span className="text-sm font-bold text-[#00D4FF] uppercase tracking-widest mb-2 relative z-10">One-Time PIN</span>
                <span className="text-6xl font-mono font-black text-white tracking-[0.2em] ml-4 relative z-10 drop-shadow-[0_0_15px_rgba(0,212,255,0.4)]">
                    {unlockPin}
                </span>
            </div>

            <button 
              onClick={() => router.push('/ride/active')}
              className="w-full h-14 bg-primary text-black font-bold text-lg rounded-xl shadow-glow-primary flex items-center justify-center transform hover:scale-[1.02] transition-transform">
              I've Unlocked It
            </button>
          </div>
        )}

        {/* Step 4: Done (Auto-Unlock) */}
        {step === 'done' && (
          <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center justify-center py-8">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary shadow-glow-primary mb-6 relative">
              <span className="text-4xl">🔓</span>
              <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20"></div>
            </div>
            <div className="text-2xl font-bold mb-2 text-center">Bike Unlocked!</div>
            <p className="text-slate-400 text-center mb-8">Helmet on. Ride safely.</p>
            
            <Link href="/ride/active" className="w-full h-14 bg-primary text-black font-bold text-lg rounded-xl shadow-glow-primary flex items-center justify-center transform hover:scale-[1.02] transition-transform">
              Start Riding
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
