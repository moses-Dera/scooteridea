'use client'

import { useState } from 'react'
import RiderMap from '@/components/Map/RiderMap'

export default function RiderHome() {
  const [showBikeDetails, setShowBikeDetails] = useState(true)

  return (
    <div className="w-full h-full relative">
      
      {/* 🗺️ Map Background (100% width/height) */}
      <div className="absolute inset-0 bg-[#0A0D14] w-full h-full">
        <RiderMap />
      </div>

      {/* 🚲 Premium Bike Details Overlay (Right Side) */}
      {showBikeDetails && (
      <div className="absolute top-24 right-6 left-6 md:left-auto md:w-[400px] bg-gradient-to-b from-[#111622]/90 to-[#0A0D14]/90 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 shadow-2xl z-30 pointer-events-auto flex flex-col gap-6 animate-in slide-in-from-right-8 duration-500 max-h-[calc(100vh-120px)] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => setShowBikeDetails(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer active:scale-95">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-xl font-bold">Bike #VR102</h2>
          <div className="px-3 py-1 rounded-full border border-[#00FFA3]/50 bg-[#00FFA3]/10 text-[#00FFA3] text-sm font-semibold shadow-[0_0_10px_rgba(0,255,163,0.2)]">
            Available
          </div>
        </div>

        {/* Bike Hero Image (Placeholder) */}
        <div className="w-full h-[200px] relative mt-2 flex items-center justify-center">
          {/* Glowing pedestal effect */}
          <div className="absolute bottom-4 w-3/4 h-8 bg-[#00FFA3]/20 blur-xl rounded-full"></div>
          {/* Replace with actual image */}
          <img src="/placeholder-bike.png" alt="VoltRide Bike" className="w-[85%] object-contain relative z-10 drop-shadow-2xl" />
        </div>

        {/* Battery Status */}
        <div>
          <div className="flex justify-between items-end mb-2">
             <span className="text-slate-300 font-medium text-lg">Battery</span>
             <span className="text-[#00FFA3] font-semibold">94% Charged</span>
          </div>
          <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
             <div className="h-full bg-gradient-to-r from-[#00FFA3]/80 to-[#00FFA3] rounded-full shadow-[0_0_10px_rgba(0,255,163,0.5)]" style={{ width: '94%' }}></div>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="grid grid-cols-3 gap-4 border-y border-white/10 py-4">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-white font-bold text-xl text-[#00FFA3]">120m</span>
            <span className="text-slate-400 text-xs mt-1">away</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center border-x border-white/10">
            <span className="text-white font-bold text-xl">Est. 2 min</span>
            <span className="text-slate-400 text-xs mt-1">walk</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <svg className="w-5 h-5 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-slate-300 text-xs whitespace-nowrap">Lagos Island</span>
          </div>
        </div>

        {/* Fare Estimate */}
        <div>
           <h3 className="text-lg font-medium mb-3 text-white">Fare Estimate</h3>
           <div className="w-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-2xl p-4 relative overflow-hidden">
             {/* Amber glow for surge */}
             <div className="absolute right-0 top-0 w-32 h-32 bg-[#FFB020]/20 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
             
             <div className="flex justify-between items-start relative z-10">
               <div>
                 <div className="flex items-baseline gap-1">
                   <span className="text-2xl font-bold">₦ 50</span>
                   <span className="text-slate-400">/min</span>
                 </div>
                 <div className="mt-2 text-sm text-slate-300">
                   Est. 15 min ride <span className="font-bold text-white">₦ 750</span> (with surge)
                 </div>
               </div>
               <div className="flex flex-col items-end gap-1">
                 <div className="px-2 py-0.5 rounded-full border border-[#FFB020]/50 bg-[#FFB020]/10 text-[#FFB020] text-xs font-semibold shadow-[0_0_10px_rgba(255,176,32,0.2)] flex items-center gap-1">
                   1.2x <span className="text-white/80 font-medium">Amber Rider</span>
                 </div>
                 <span className="text-[#FFB020] text-xs">Surge Pricing</span>
               </div>
             </div>
           </div>
        </div>

        {/* Nearest Docks */}
        <div>
           <h3 className="text-lg font-medium mb-3 text-white">Nearest Docks</h3>
           <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
             
             {/* Dock A */}
             <div className="min-w-[160px] bg-white/5 border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-3 flex flex-col gap-2 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-16 h-16 bg-[#00FFFF]/10 blur-xl rounded-full"></div>
               <h4 className="font-semibold text-sm leading-tight text-white relative z-10">Dock A:<br/>Adeola Odeku</h4>
               <p className="text-xs text-[#00FFA3] relative z-10"><span className="font-bold">8</span>/12 slots available</p>
               <div className="text-xs text-slate-400 relative z-10 mt-1">150m walk</div>
               <button className="text-xs text-[#00FFFF] hover:text-white transition-colors flex items-center gap-1 mt-auto relative z-10">
                 Map link <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
               </button>
             </div>

             {/* Dock B */}
             <div className="min-w-[160px] bg-white/5 border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-3 flex flex-col gap-2 relative overflow-hidden">
               <h4 className="font-semibold text-sm leading-tight text-white relative z-10">Dock B:<br/>Ozumba Mbadiwe</h4>
               <p className="text-xs text-[#00FFA3] relative z-10"><span className="font-bold">5</span>/15 slots available</p>
               <div className="text-xs text-slate-400 relative z-10 mt-1">210m walk</div>
               <button className="text-xs text-[#00FFFF] hover:text-white transition-colors flex items-center gap-1 mt-auto relative z-10">
                 Map link <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
               </button>
             </div>

           </div>
        </div>

        {/* Unlock Action Button */}
        <div className="mt-2 text-center">
          <button className="w-full h-14 bg-gradient-to-r from-[#00FFA3] to-[#00D1FF] text-black font-extrabold text-lg rounded-full shadow-[0_0_20px_rgba(0,255,163,0.4)] hover:shadow-[0_0_30px_rgba(0,255,163,0.6)] transform hover:scale-[1.02] transition-all">
            Unlock This Bike
          </button>
          <div className="mt-4 text-xs text-slate-400 font-medium tracking-wide">
            Scan QR • NFC • Enter PIN
          </div>
        </div>

      </div>
      )}
    </div>
  )
}
