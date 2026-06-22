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
      <div className="absolute top-28 right-6 left-6 md:left-auto md:w-[420px] bg-surfaceLight/60 backdrop-blur-3xl border border-white/10 rounded-[36px] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] z-30 pointer-events-auto flex flex-col gap-6 animate-in slide-in-from-right-8 duration-700 ease-out max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-hide">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-white">VoltRide <span className="text-slate-400 font-medium">#VR102</span></h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#00FF87]"></div>
                <span className="text-xs font-semibold text-primary tracking-wide uppercase">Ready to Ride</span>
              </div>
            </div>
          </div>
          <button onClick={() => setShowBikeDetails(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-white/5">
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Bike Hero SVG Illustration */}
        <div className="w-full h-[180px] relative mt-2 flex items-center justify-center group cursor-pointer">
          {/* Dynamic Background Glow */}
          <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute bottom-6 w-4/5 h-4 bg-primary/30 blur-2xl rounded-full transform group-hover:scale-110 transition-transform duration-500"></div>
          
          {/* Premium Vector Bike */}
          <svg className="w-[85%] h-full relative z-10 drop-shadow-2xl transform group-hover:-translate-y-2 group-hover:scale-105 transition-all duration-500 ease-out" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Wheels */}
            <circle cx="90" cy="170" r="45" stroke="#334155" strokeWidth="8" className="animate-[spin_10s_linear_infinite]" strokeDasharray="10 10"/>
            <circle cx="90" cy="170" r="35" fill="#0F172A" stroke="#1E293B" strokeWidth="4"/>
            <circle cx="310" cy="170" r="45" stroke="#334155" strokeWidth="8" className="animate-[spin_10s_linear_infinite]" strokeDasharray="10 10"/>
            <circle cx="310" cy="170" r="35" fill="#0F172A" stroke="#1E293B" strokeWidth="4"/>
            
            {/* Frame Body (Neon Green) */}
            <path d="M90 170 L140 100 L260 100 L310 170" stroke="#00FF87" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M140 100 L110 50" stroke="#00FF87" strokeWidth="10" strokeLinecap="round"/>
            <path d="M260 100 L280 40" stroke="#00FF87" strokeWidth="10" strokeLinecap="round"/>
            <path d="M140 100 L290 150" stroke="#00FF87" strokeWidth="12" strokeLinecap="round"/>
            
            {/* Battery Pack */}
            <rect x="160" y="105" width="80" height="25" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="3"/>
            <rect x="165" y="112" width="20" height="11" rx="3" fill="#00FF87" className="animate-pulse"/>
            <rect x="190" y="112" width="20" height="11" rx="3" fill="#00FF87" className="animate-pulse" style={{animationDelay: '200ms'}}/>
            <rect x="215" y="112" width="20" height="11" rx="3" fill="#00FF87" className="animate-pulse" style={{animationDelay: '400ms'}}/>
            
            {/* Seat & Handlebars */}
            <path d="M95 50 L135 50" stroke="#F8FAFC" strokeWidth="8" strokeLinecap="round"/>
            <path d="M260 40 L300 30" stroke="#F8FAFC" strokeWidth="8" strokeLinecap="round"/>
            
            {/* Glow effects on frame */}
            <path d="M140 100 L260 100" stroke="#00FF87" strokeWidth="4" strokeLinecap="round" style={{filter: 'blur(4px)'}}/>
          </svg>
        </div>

        {/* Battery & Health */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex justify-between items-end mb-3">
             <div className="flex items-center gap-2">
               <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               <span className="text-slate-300 font-semibold text-sm">Power Level</span>
             </div>
             <span className="text-white font-bold text-lg tracking-tight">94% <span className="text-primary text-sm font-medium ml-1">~35km range</span></span>
          </div>
          <div className="w-full h-3 bg-[#0A0F1E] rounded-full overflow-hidden border border-white/5 relative">
             <div className="absolute inset-0 bg-white/5"></div>
             <div className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full relative overflow-hidden" style={{ width: '94%' }}>
               <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/30 skew-x-12 animate-[translateX_2s_infinite]"></div>
             </div>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center hover:bg-white/10 transition-colors cursor-default">
            <svg className="w-5 h-5 text-secondary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-white font-extrabold text-lg">120m</span>
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Distance</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center hover:bg-white/10 transition-colors cursor-default">
            <svg className="w-5 h-5 text-warning mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-white font-extrabold text-lg">2 min</span>
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Walk Time</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center hover:bg-white/10 transition-colors cursor-default">
            <svg className="w-5 h-5 text-primary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-white font-bold text-sm leading-tight mt-1">Lagos<br/>Island</span>
          </div>
        </div>

        {/* Fare Estimate */}
        <div className="w-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-white/20 transition-all">
          {/* Subtle animated background gradient */}
          <div className="absolute -inset-10 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000"></div>
          
          <div className="flex justify-between items-start relative z-10">
            <div>
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Standard Rate</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">₦ 50</span>
                <span className="text-slate-400 font-medium">/min</span>
              </div>
              <div className="mt-2 text-sm text-slate-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                No unlock fee
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="px-3 py-1 rounded-full bg-surface/80 border border-white/10 text-white text-xs font-semibold shadow-inner flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Optimal Fare
              </div>
            </div>
          </div>
        </div>

        {/* Unlock Action Button */}
        <div className="mt-2">
          <button className="relative w-full h-16 bg-white text-black font-extrabold text-lg rounded-2xl overflow-hidden group active:scale-[0.98] transition-transform">
            {/* Green glowing gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-[#00D1FF] to-primary opacity-90 group-hover:opacity-100 transition-opacity"></div>
            
            {/* Animated shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 translate-x-[-150%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
            
            <div className="relative z-10 flex items-center justify-center gap-3 w-full h-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
              <span>Tap to Unlock</span>
            </div>
          </button>
          
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400 font-medium tracking-wide">
            <span className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Scan QR</span>
            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
            <span className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> Enter PIN</span>
          </div>
        </div>

      </div>
      )}
    </div>
  )
}
