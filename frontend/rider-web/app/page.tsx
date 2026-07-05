'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useLiveFleet } from '@/hooks/useLiveFleet'
import { useNearbyDocks } from '@/hooks/useNearbyDocks'
import { UnlockModal } from '@/components/UnlockModal'
import { DestinationSearch } from '@/components/Map/DestinationSearch'

export default function RiderHome() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bikeId = searchParams.get('bike');
  const dockId = searchParams.get('dock');
  const action = searchParams.get('action');
  
  // Extract the exact coordinates of the clicked item from the URL
  const selectedLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
  const selectedLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;
  const isDestinationPreview = searchParams.get('destination') === 'true';
  const destName = searchParams.get('name') || 'Selected Destination';
  
  // Track user's current location for smart trip validation
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {}, { enableHighAccuracy: true });
    }
  }, []);
  
  // If previewing destination, fetch bikes near USER and docks near DESTINATION
  const originLat = isDestinationPreview ? userLoc?.lat : selectedLat;
  const originLng = isDestinationPreview ? userLoc?.lng : selectedLng;
  
  const { bikes: liveBikes } = useLiveFleet(originLat, originLng, 2);
  const { docks } = useNearbyDocks(selectedLat, selectedLng);
  
  const displayBikes = liveBikes;
  
  const selectedBike = bikeId ? displayBikes.find(b => b.id === bikeId) : null;
  const selectedDock = dockId ? docks.find(d => d.id === dockId) : null;
  // Dynamic Trip Estimations
  let estDistanceKm = 0;
  let estRideTimeMins = 0;
  let estWalkTimeMins = 0;
  let estFareMin = 0;
  let estFareMax = 0;

  if (userLoc && selectedLat && selectedLng) {
    const R = 6371; 
    const dLat = (selectedLat - userLoc.lat) * Math.PI / 180;
    const dLon = (selectedLng - userLoc.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
              Math.cos(userLoc.lat * Math.PI / 180) * Math.cos(selectedLat * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const straightLine = R * c;
    
    estDistanceKm = straightLine * 1.3; // 30% routing factor
    estRideTimeMins = Math.max(1, Math.ceil(estDistanceKm * 4)); // ~15km/h scooter speed
    estWalkTimeMins = Math.max(1, Math.ceil(estDistanceKm * 12)); // ~5km/h walking speed
    
    estFareMin = estRideTimeMins * 50; // 50 NGN base rate per min
    estFareMax = Math.ceil(estFareMin * 1.2); // 20% variance
  }

  const shouldNavigate = searchParams.get('navigate') === 'true';
  // If no bike or dock is selected, show the destination search bar
  if (!selectedBike && !selectedDock && !isDestinationPreview && !shouldNavigate) {
    return (
      <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 w-full md:w-auto px-6 pointer-events-auto flex justify-center">
        <DestinationSearch />
      </div>
    );
  }

  return (
    <>
      {action === 'unlock' && bikeId && (
        <UnlockModal bikeId={bikeId} onClose={() => router.push(`/?bike=${bikeId}`)} />
      )}

      {selectedDock && !shouldNavigate && (
        <div className="absolute top-28 right-6 left-6 md:left-auto md:w-[420px] bg-surfaceLight/60 backdrop-blur-3xl border border-white/10 rounded-[36px] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] z-30 pointer-events-auto flex flex-col animate-in slide-in-from-right-8 duration-700 ease-out max-h-[calc(100vh-140px)] overflow-hidden">
          {/* 🅿️ Premium Dock Details Overlay */}
          
          {/* Header (Sticky) */}
          <div className="flex items-center justify-between shrink-0 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00B3FF]/20 flex items-center justify-center border border-[#00B3FF]/30">
                <svg className="w-5 h-5 text-[#00FFFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
              </div>
              <div>
                <div className="text-xl font-extrabold tracking-tight text-white">{selectedDock.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-[#00FFFF] animate-pulse shadow-[0_0_8px_#00FFFF]"></div>
                  <span className="text-xs font-semibold text-[#00FFFF] tracking-wide uppercase">
                    Docking Station
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => router.push('/')} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-white/5">
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide flex flex-col gap-6 -mx-2 px-2 pb-2">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[#00FFFF] font-extrabold text-3xl mb-1">{selectedDock.availableSlots}</span>
                <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Free Slots</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-white font-extrabold text-3xl mb-1">0</span>
                <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Bikes Available</span>
              </div>
            </div>

            {/* Navigation Action Button */}
            <div className="mt-2">
              <button 
                onClick={() => router.push(`/?dock=${selectedDock.id}&lat=${selectedDock.lat}&lng=${selectedDock.lng}&navigate=true`)}
                className="relative w-full h-14 bg-white/10 text-white font-extrabold text-lg rounded-2xl overflow-hidden group hover:bg-white/20 active:scale-[0.98] transition-all"
              >
                <div className="relative z-10 flex items-center justify-center gap-3 w-full h-full">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  <span>Start Navigation</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedBike && !selectedDock && !shouldNavigate && (
        (() => {
          const battery = selectedBike?.batteryPct || 100;
          const isLowBattery = battery < 20;
          const rangeKm = Math.floor(battery * 0.4);
          
          return (
            <div className="absolute top-28 right-6 left-6 md:left-auto md:w-[420px] bg-surfaceLight/60 backdrop-blur-3xl border border-white/10 rounded-[36px] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] z-30 pointer-events-auto flex flex-col animate-in slide-in-from-right-8 duration-700 ease-out max-h-[calc(100vh-140px)] overflow-hidden">
        
        {/* Header (Sticky) */}
        <div className="flex items-center justify-between shrink-0 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <div className="text-xl font-extrabold tracking-tight text-white">Scooter <span className="text-slate-400 font-medium">#{selectedBike.id.split('-')[1] || selectedBike.id}</span></div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${isLowBattery ? 'bg-red-500 shadow-[0_0_8px_#EF4444]' : 'bg-primary shadow-[0_0_8px_#00FF87]'} animate-pulse`}></div>
                <span className={`text-xs font-semibold ${isLowBattery ? 'text-red-400' : 'text-primary'} tracking-wide uppercase`}>
                  {isLowBattery ? 'Low Battery' : 'Ready to Ride'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => router.push('/')} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-white/5">
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide flex flex-col gap-6 -mx-2 px-2 pb-2">
          {/* Bike Hero SVG Illustration */}
          <div className="w-full h-[180px] shrink-0 relative mt-2 flex items-center justify-center group cursor-pointer">
            {/* Dynamic Background Glow */}
            <div className={`absolute inset-0 bg-gradient-radial ${isLowBattery ? 'from-red-500/20' : 'from-primary/20'} via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
            <div className={`absolute bottom-6 w-4/5 h-4 ${isLowBattery ? 'bg-red-500/30' : 'bg-primary/30'} blur-2xl rounded-full transform group-hover:scale-110 transition-transform duration-500`}></div>
            
            {/* Premium Vector Bike */}
            <svg className="w-[85%] h-full relative z-10 drop-shadow-2xl transform group-hover:-translate-y-2 group-hover:scale-105 transition-all duration-500 ease-out" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="90" cy="170" r="45" stroke="#334155" strokeWidth="8" className="animate-[spin_10s_linear_infinite]" strokeDasharray="10 10"/>
              <circle cx="90" cy="170" r="35" fill="#0F172A" stroke="#1E293B" strokeWidth="4"/>
              <circle cx="310" cy="170" r="45" stroke="#334155" strokeWidth="8" className="animate-[spin_10s_linear_infinite]" strokeDasharray="10 10"/>
              <circle cx="310" cy="170" r="35" fill="#0F172A" stroke="#1E293B" strokeWidth="4"/>
              
              <path d="M90 170 L140 100 L260 100 L310 170" stroke={isLowBattery ? "#EF4444" : "#00FF87"} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M140 100 L110 50" stroke={isLowBattery ? "#EF4444" : "#00FF87"} strokeWidth="10" strokeLinecap="round"/>
              <path d="M260 100 L280 40" stroke={isLowBattery ? "#EF4444" : "#00FF87"} strokeWidth="10" strokeLinecap="round"/>
              <path d="M140 100 L290 150" stroke={isLowBattery ? "#EF4444" : "#00FF87"} strokeWidth="12" strokeLinecap="round"/>
              
              <rect x="160" y="105" width="80" height="25" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="3"/>
              <rect x="165" y="112" width="20" height="11" rx="3" fill={isLowBattery ? "#EF4444" : "#00FF87"} className="animate-pulse"/>
              {!isLowBattery && <rect x="190" y="112" width="20" height="11" rx="3" fill="#00FF87" className="animate-pulse" style={{animationDelay: '200ms'}}/>}
              {battery > 50 && <rect x="215" y="112" width="20" height="11" rx="3" fill="#00FF87" className="animate-pulse" style={{animationDelay: '400ms'}}/>}
              
              <path d="M95 50 L135 50" stroke="#F8FAFC" strokeWidth="8" strokeLinecap="round"/>
              <path d="M260 40 L300 30" stroke="#F8FAFC" strokeWidth="8" strokeLinecap="round"/>
              
              <path d="M140 100 L260 100" stroke={isLowBattery ? "#EF4444" : "#00FF87"} strokeWidth="4" strokeLinecap="round" style={{filter: 'blur(4px)'}}/>
            </svg>
          </div>

          {/* Battery & Health */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md shrink-0">
            <div className="flex justify-between items-end mb-3">
               <div className="flex items-center gap-2">
                 <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 <span className="text-slate-300 font-semibold text-sm">Power Level</span>
               </div>
               <span className="text-white font-bold text-lg tracking-tight">{Math.round(battery)}% <span className={`${isLowBattery ? 'text-red-400' : 'text-primary'} text-sm font-medium ml-1`}>~{rangeKm}km range</span></span>
            </div>
            <div className="w-full h-3 bg-[#0A0F1E] rounded-full overflow-hidden border border-white/5 relative">
               <div className="absolute inset-0 bg-white/5"></div>
               <div className={`h-full ${isLowBattery ? 'bg-gradient-to-r from-red-500/60 to-red-500' : 'bg-gradient-to-r from-primary/60 to-primary'} rounded-full relative overflow-hidden`} style={{ width: `${battery}%` }}>
                 <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/30 skew-x-12 animate-[translateX_2s_infinite]"></div>
               </div>
            </div>
          </div>

          {/* Telemetry Stats */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
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
          <div className="w-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-white/20 transition-all shrink-0">
            <div className="absolute -inset-10 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <div>
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Standard Rate</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">₦ {(selectedBike as any).surge ? Math.round(50 * (selectedBike as any).surge) : 50}</span>
                  <span className="text-slate-400 font-medium">/min</span>
                </div>
                <div className="mt-2 text-sm text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  No unlock fee
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {(selectedBike as any).surge && (selectedBike as any).surge > 1 ? (
                  <div className="px-3 py-1 rounded-full bg-warning/20 border border-warning/30 text-warning text-xs font-semibold shadow-inner flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning"></span> High Demand
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-full bg-surface/80 border border-white/10 text-white text-xs font-semibold shadow-inner flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Optimal Fare
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Unlock Action Button */}
          <div className="mt-2 shrink-0">
            <button 
              onClick={() => router.push(`/?bike=${selectedBike!.id}&action=unlock`)}
              className="relative w-full h-16 bg-white text-black font-extrabold text-lg rounded-2xl overflow-hidden group active:scale-[0.98] transition-transform">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-[#00D1FF] to-primary opacity-90 group-hover:opacity-100 transition-opacity"></div>
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
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              <span 
                onClick={() => router.push(`/?bike=${selectedBike!.id}&lat=${selectedBike.lat}&lng=${selectedBike.lng}&navigate=true`)}
                className="flex items-center gap-1 hover:text-[#00FFA3] text-primary transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> Navigate
              </span>
            </div>
          </div>

        </div>
      </div>
          )
        })()
      )}

      {/* Destination Preview Panel */}
      {isDestinationPreview && !shouldNavigate && selectedLat && selectedLng && (
        <div className="absolute top-28 right-6 left-6 md:left-auto md:w-[420px] bg-surfaceLight/60 backdrop-blur-3xl border border-white/10 rounded-[36px] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] z-30 pointer-events-auto flex flex-col animate-in slide-in-from-right-8 duration-700 ease-out max-h-[calc(100vh-140px)] overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between shrink-0 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <div className="text-xl font-extrabold tracking-tight text-white">{destName}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold text-primary tracking-wide uppercase">
                    Destination
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => router.push('/')} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-white/5">
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide flex flex-col gap-6 -mx-2 px-2 pb-2">
            {/* Smart Trip Validation UI */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              
              {/* Validation Checklist */}
              <div className="flex flex-col gap-4 mb-5 pb-5 border-b border-white/10">
                {/* 1. Origin Bikes Check */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${liveBikes.length > 0 ? 'bg-primary/20 border border-primary/30 text-primary' : 'bg-red-500/20 border border-red-500/30 text-red-500'}`}>
                    {liveBikes.length > 0 ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">Nearby Scooters</div>
                    <div className="text-slate-400 text-xs">
                      {!userLoc ? 'Locating you...' : (liveBikes.length > 0 ? `${liveBikes.length} available at your location` : 'No scooters near your current location')}
                    </div>
                  </div>
                </div>

                {/* 2. Destination Docks Check */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${docks.some(d => d.availableSlots > 0) ? 'bg-[#00B3FF]/20 border border-[#00B3FF]/30 text-[#00B3FF]' : 'bg-warning/20 border border-warning/30 text-warning'}`}>
                    {docks.some(d => d.availableSlots > 0) ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    )}
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">Destination Parking</div>
                    <div className="text-slate-400 text-xs">
                      {docks.some(d => d.availableSlots > 0) 
                        ? 'Parking docks available near destination' 
                        : 'Free-parking permitted (Convenience fee applies)'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Estimated Walk Stats (Always shown for destination preview) */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#0A0D14] border border-white/5 rounded-xl p-3 flex flex-col justify-center">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Est. Distance</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-white font-extrabold text-xl">{estDistanceKm.toFixed(1)}</span>
                    <span className="text-slate-500 text-xs">km</span>
                  </div>
                </div>
                <div className="bg-[#0A0D14] border border-white/5 rounded-xl p-3 flex flex-col justify-center">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Walk Time</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-white font-extrabold text-xl">~{estWalkTimeMins}</span>
                    <span className="text-slate-500 text-xs">mins</span>
                  </div>
                </div>
              </div>

              {/* Upsell: Get there faster with a scooter */}
              {liveBikes.length > 0 && estWalkTimeMins > 3 && (
                <div 
                  onClick={() => router.push(`/?bike=${liveBikes[0].id}&lat=${selectedLat}&lng=${selectedLng}&name=${encodeURIComponent(destName)}`)}
                  className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-xl p-3 mb-4 flex items-center justify-between cursor-pointer hover:bg-primary/20 hover:border-primary/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                      <div className="text-white text-sm font-bold">Get there faster</div>
                      <div className="text-primary text-xs font-medium">Ride for ~₦{estFareMin} in {estRideTimeMins} mins</div>
                    </div>
                  </div>
                  <div className="text-primary text-[10px] uppercase font-extrabold px-3 py-1.5 bg-primary/20 rounded-full group-hover:bg-primary group-hover:text-black transition-colors">
                    Find Scooter
                  </div>
                </div>
              )}
              
              {/* Dynamic Action Button (Soft Warning Approach) */}
              <button 
                onClick={() => router.push(`/?navigate=true&lat=${selectedLat}&lng=${selectedLng}`)}
                className="relative w-full h-14 bg-white text-black font-extrabold text-lg rounded-2xl overflow-hidden group active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-[#00D1FF] to-primary opacity-90 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 flex items-center justify-center gap-3 w-full h-full">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  <span>Start Navigation</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
