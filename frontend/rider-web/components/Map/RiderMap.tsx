'use client';

import { useState, useEffect } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useLiveFleet } from '@/hooks/useLiveFleet';
import { useRouter } from 'next/navigation';
import { LocateFixed } from 'lucide-react';

import { useNearbyDocks } from '@/hooks/useNearbyDocks';

// Using a public demo token if env is missing, but env should be configured for production
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.dummy_token';

export default function RiderMap() {
  const router = useRouter();

  const [viewState, setViewState] = useState({
    latitude: 6.4541,
    longitude: 3.3792,
    zoom: 13.5, // slightly zoomed out to see more bikes
    pitch: 45,
  });

  // Real user geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const searchLat = userLocation?.lat || viewState.latitude;
  const searchLng = userLocation?.lng || viewState.longitude;

  const { bikes: liveBikes } = useLiveFleet(searchLat, searchLng, 10);
  
  // Use live socket bikes ONLY
  const displayBikes = liveBikes;

  // Fetch real docks from Postgres based on view center!
  const { docks } = useNearbyDocks(userLocation?.lat || viewState.latitude, userLocation?.lng || viewState.longitude);

  // Prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Get real browser geolocation
  useEffect(() => {
    if (!mounted || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        // Center map on user's real location
        setViewState((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));
      },
      (error) => {
        console.warn('Geolocation denied or unavailable:', error.message);
        // Keep Lagos fallback for map center, no user dot shown
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Watch position for live updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      () => {},
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [mounted]);

  const handleFocusLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    // Explicitly request location when button is clicked
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setViewState({
          latitude,
          longitude,
          zoom: 16,
          pitch: 45,
        });
      },
      (error) => {
        alert(`Could not get location: ${error.message}. Ensure location permissions are enabled.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!mounted) return <div className="w-full h-full bg-surface animate-pulse" />;

  return (
    <div className="w-full h-full relative">
      <Map
        {...viewState}
        onMove={(evt: any) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" showCompass={false} style={{ marginBottom: '90px', marginRight: '20px', backgroundColor: '#111622', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', pointerEvents: 'auto' }} />
        
        {/* Custom Geolocate Button (Fixes the buggy native control) */}
        <div className="absolute bottom-[20px] right-[20px] z-10 pointer-events-auto">
          <button 
            onClick={handleFocusLocation}
            className="w-[29px] h-[29px] bg-[#111622] border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors shadow-lg group"
            title="Focus my location"
          >
            <LocateFixed className="w-4 h-4 text-slate-300 group-hover:text-[#00FFA3] transition-colors" />
          </button>
        </div>

        {/* Render Bikes */}
        {displayBikes.map(bike => (
          <Marker key={bike.id} longitude={bike.lng} latitude={bike.lat} anchor="bottom" style={{ pointerEvents: 'auto' }}>
            <div 
              className="flex flex-col items-center group cursor-pointer transform hover:scale-110 transition-transform relative"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/?bike=${bike.id}`);
              }}
            >
              {/* Tooltip */}
              <div className="absolute -top-10 px-3 py-1 bg-[#111622]/90 backdrop-blur-md border border-white/10 rounded-full text-xs font-bold text-white mb-2 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {bike.id}
              </div>
              {/* Glowing Pin */}
              <div className="relative flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#00FFA3] to-[#00CC82] flex items-center justify-center shadow-[0_0_20px_rgba(0,255,163,0.6)] z-10">
                  <svg className="w-5 h-5 text-[#0A0D14]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><circle cx="5" cy="18" r="3" /><circle cx="19" cy="18" r="3" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" /></svg>
                </div>
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#00CC82] -mt-1 z-0"></div>
                {/* Glow on the floor */}
                <div className="w-6 h-2 bg-[#00FFA3]/40 blur-[4px] rounded-full mt-1"></div>
              </div>
            </div>
          </Marker>
        ))}

        {/* Render Docks */}
        {docks.map(dock => (
          <Marker key={dock.id} longitude={dock.lng} latitude={dock.lat} anchor="bottom" style={{ pointerEvents: 'auto' }}>
            <div 
              className="flex flex-col items-center group cursor-pointer relative"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/?dock=${dock.id}`);
              }}
            >
              <div className="absolute -top-10 px-3 py-1 bg-[#111622]/90 backdrop-blur-md border border-[#00FFFF]/30 rounded-full text-xs font-bold text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {dock.name}
              </div>
              <div className="relative flex flex-col items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#00FFFF] to-[#00B3FF] flex items-center justify-center shadow-[0_0_15px_rgba(0,255,255,0.5)] z-10">
                  <span className="text-[#0A0D14] font-bold text-sm">P</span>
                </div>
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-[#00B3FF] -mt-0.5 z-0"></div>
                <div className="w-5 h-2 bg-[#00FFFF]/30 blur-[3px] rounded-full mt-1"></div>
              </div>
            </div>
          </Marker>
        ))}

        {/* Real User Location (from browser geolocation) */}
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center" style={{ pointerEvents: 'none' }}>
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 bg-[#00B3FF]/20 rounded-full animate-ping absolute"></div>
              <div className="w-6 h-6 bg-white rounded-full shadow-[0_0_20px_rgba(0,179,255,0.8)] border-4 border-[#0A0D14] flex items-center justify-center relative z-10">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00B3FF]"></div>
              </div>
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}
