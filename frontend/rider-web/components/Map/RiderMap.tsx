'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl, Source, Layer, MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useLiveFleet } from '@/hooks/useLiveFleet';
import { useRouter, useSearchParams } from 'next/navigation';
import { LocateFixed } from 'lucide-react';

import { useNearbyDocks } from '@/hooks/useNearbyDocks';
import { useNavigationEngine, NavigationProfile } from '@/hooks/useNavigationEngine';

// Using a public demo token if env is missing, but env should be configured for production
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.dummy_token';

export default function RiderMap() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldNavigate = searchParams.get('navigate') === 'true';
  const isDestinationPreview = searchParams.get('destination') === 'true';
  const destLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
  const destLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;
  
  const destination = destLat && destLng ? { lat: destLat, lng: destLng } : null;

  const mapRef = useRef<MapRef>(null);
  const hasInitialLock = useRef(false);

  const [viewState, setViewState] = useState({
    latitude: 6.4541,
    longitude: 3.3792,
    zoom: 13.5, // slightly zoomed out to see more bikes
    pitch: 45,
  });

  const [navProfile, setNavProfile] = useState<NavigationProfile>('cycling');

  // Real user geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Use the Smart Navigation Engine
  const { 
    isActive: isNavigating, 
    routeGeoJSON, 
    steps, 
    currentStepIndex, 
    distanceText, 
    etaText,
    loading: isRoutingLoading,
    error: routingError
  } = useNavigationEngine(
    shouldNavigate ? userLocation : null,
    shouldNavigate ? destination : null,
    navProfile
  );

  // Utility to calculate heading/bearing from Point A to Point B
  const getBearing = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const l1 = lat1 * Math.PI / 180;
    const l2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(l2);
    const x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dLon);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  // Utility to calculate distance between two coordinates in meters
  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  // Navigation Lifecycle: Drone-like Continuous Camera Tracking
  const geoControlRef = useRef<mapboxgl.GeolocateControl>(null);

  useEffect(() => {
    if (isNavigating) {
      // Programmatically trigger the native geolocation tracking
      geoControlRef.current?.trigger();
    }

    if (isNavigating && userLocation && destination && mapRef.current) {
      const targetBearing = getBearing(userLocation.lat, userLocation.lng, destination.lat, destination.lng);
      
      // We use easeTo instead of flyTo for continuous smooth gliding
      mapRef.current.easeTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 18.5,
        pitch: 65,
        bearing: targetBearing,
        duration: 1000, // 1 second glide per tick to smooth out GPS jumps
        easing: (t) => t * (2 - t) // Smooth cubic easing
      });
    }
  }, [isNavigating, userLocation, destination?.lat, destination?.lng]);

  const handleFocusLocation = () => {
    if (!userLocation) return;
    
    if (isNavigating) {
      mapRef.current?.easeTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 18.5,
        pitch: 65,
        duration: 1000
      });
    } else {
      mapRef.current?.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 15,
        pitch: 45,
        duration: 1000
      });
    }
  };

  // Handle Destination Preview Camera
  useEffect(() => {
    if (isDestinationPreview && destination && mapRef.current) {
      mapRef.current.flyTo({
        center: [destination.lng, destination.lat],
        zoom: 16,
        pitch: 30,
        duration: 2000,
        easing: (t) => t * (2 - t)
      });
    }
  }, [isDestinationPreview, destination?.lat, destination?.lng]);

  // Search center tracks where we fetch bikes/docks from.
  // Starts null so we don't spam Lagos requests before we know the user's location.
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const searchLat = searchCenter?.lat ?? 6.4541;
  const searchLng = searchCenter?.lng ?? 3.3792;

  const { bikes: liveBikes } = useLiveFleet(searchLat, searchLng, 10);
  
  // Use live socket bikes ONLY for production (No hardcoding)
  const displayBikes = liveBikes;

  // Fetch real docks from Postgres based on view center!
  const { docks } = useNearbyDocks(searchLat, searchLng);

  // Prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // GeolocateControl is auto-triggered in onMapLoad — no duplicate trigger here



  // Convert bikes to GeoJSON
  const bikesGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: displayBikes.map(bike => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [bike.lng, bike.lat] },
      properties: { id: bike.id }
    }))
  }), [displayBikes]);

  // Convert docks to GeoJSON
  const docksGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: docks.map(dock => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [dock.lng, dock.lat] },
      properties: { id: dock.id, name: dock.name }
    }))
  }), [docks]);

  // Handle WebGL Layer Clicks
  const onMapClick = useCallback((e: any) => {
    const feature = e.features && e.features[0];
    if (!feature) return;

    if (feature.layer.id === 'bikes-symbol-layer') {
      const bikeId = feature.properties.id;
      const [lng, lat] = feature.geometry.coordinates;
      router.push(`/?bike=${bikeId}&lat=${lat}&lng=${lng}`);
    } else if (feature.layer.id === 'docks-symbol-layer') {
      const dockId = feature.properties.id;
      const [lng, lat] = feature.geometry.coordinates;
      router.push(`/?dock=${dockId}&lat=${lat}&lng=${lng}`);
    }
  }, [router]);

  // Load custom SVG icons into the WebGL renderer on map load
  const onMapLoad = useCallback((e: any) => {
    const map = e.target;
    
    // Bike WebGL Icon (Glowing green with dark core)
    const bikeImg = new Image(48, 48);
    bikeImg.onload = () => { if (!map.hasImage('bike-icon')) map.addImage('bike-icon', bikeImg); };
    bikeImg.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="18" fill="#00FFA3" fill-opacity="0.25"/>
        <circle cx="24" cy="24" r="10" fill="#00FFA3" stroke="#0A0D14" stroke-width="3"/>
        <path d="M19 24l3 3 7-7" fill="none" stroke="#0A0D14" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `)}`;

    // Dock WebGL Icon (Glowing blue with 'P')
    const dockImg = new Image(48, 48);
    dockImg.onload = () => { if (!map.hasImage('dock-icon')) map.addImage('dock-icon', dockImg); };
    dockImg.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="36" height="36" rx="10" fill="#00B3FF" fill-opacity="0.25"/>
        <rect x="12" y="12" width="24" height="24" rx="6" fill="#00B3FF" stroke="#0A0D14" stroke-width="3"/>
        <text x="24" y="28" font-family="sans-serif" font-weight="900" font-size="14" fill="#0A0D14" text-anchor="middle">P</text>
      </svg>
    `)}`;

    // Automatically trigger the GPS puck once the map is fully loaded
    setTimeout(() => {
      geoControlRef.current?.trigger();
    }, 500);
  }, []);

  if (!mounted) return <div className="w-full h-full bg-surface animate-pulse" />;

  return (
    <div className="w-full h-full relative">
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: 6.4541,
          longitude: 3.3792,
          zoom: 15,
          pitch: 45,
          bearing: 0
        }}
        onMoveEnd={(evt: any) => {
          // Debounce: only update search center after the camera settles
          if ((window as any).__searchDebounce) clearTimeout((window as any).__searchDebounce);
          (window as any).__searchDebounce = setTimeout(() => {
            setSearchCenter({ lat: evt.viewState.latitude, lng: evt.viewState.longitude });
          }, 500);
        }}
        onClick={onMapClick}
        onLoad={onMapLoad}
        interactiveLayerIds={['bikes-symbol-layer', 'docks-symbol-layer']}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        {/* Service Unavailable Overlay (Shows when no bikes in area) */}
        {!shouldNavigate && !isDestinationPreview && userLocation && displayBikes.length === 0 && (
          <div className="absolute bottom-24 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[380px] z-20 pointer-events-none">
            <div className="bg-[#111622]/90 backdrop-blur-2xl border border-white/10 rounded-[28px] p-5 shadow-2xl flex flex-col items-center text-center animate-in slide-in-from-bottom duration-500 pointer-events-auto">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-white font-extrabold text-lg mb-1">No Scooters Nearby</h3>
              <p className="text-slate-400 text-sm font-medium mb-5">
                We couldn't find any available scooters in your current location right now.
              </p>
              <button className="w-full h-12 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors text-sm">
                Notify me when available
              </button>
            </div>
          </div>
        )}

        {/* Navigation Overlays (Compact) */}
        {isNavigating && steps.length > 0 && (
          <>
            {/* Top Left: Next Turn Instruction */}
            <div className="absolute top-24 left-4 z-20 max-w-[320px]">
              <div className="bg-[#111622]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-left duration-500">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                  {(() => {
                    const modifier = steps[currentStepIndex]?.maneuver?.modifier || '';
                    if (modifier.includes('left')) {
                      return (
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                      );
                    } else if (modifier.includes('right')) {
                      return (
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      );
                    } else if (modifier.includes('uturn')) {
                      return (
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      );
                    } else {
                      // Straight / Default
                      return (
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      );
                    }
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-sm leading-tight truncate">
                    {steps[currentStepIndex]?.maneuver?.instruction || "Proceed to destination"}
                  </div>
                  <div className="text-primary font-extrabold text-xs mt-0.5 tracking-wide">
                    {steps[currentStepIndex]?.distance ? `${Math.round(steps[currentStepIndex].distance)}m` : 'Arriving'}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Left: Trip Stats & Exit & Profile Selector */}
            <div className="absolute bottom-6 left-4 z-20">
              <div className="bg-[#111622]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-500 flex flex-col gap-3 min-w-[200px]">
                
                {/* Profile Selector Toggle */}
                <div className="flex bg-[#0A0D14] rounded-lg p-1 border border-white/5">
                  {(['walking', 'cycling', 'driving-traffic'] as NavigationProfile[]).map((profile) => (
                    <button
                      key={profile}
                      onClick={() => setNavProfile(profile)}
                      className={`flex-1 py-1.5 text-xs font-bold capitalize rounded-md transition-all ${
                        navProfile === profile 
                        ? 'bg-primary text-[#0A0D14] shadow-md' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {profile.split('-')[0]}
                    </button>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Arrival</div>
                    <div className="text-xl font-extrabold text-white">{etaText}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Distance</div>
                    <div className="text-lg font-bold text-slate-300">{distanceText}</div>
                  </div>
                </div>
                <button 
                  onClick={() => router.push('/')}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs rounded-xl transition-colors border border-red-500/20 active:scale-[0.98]"
                >
                  Exit Navigation
                </button>
              </div>
            </div>
          </>
        )}

        {/* Navigation Loading / GPS Waiting States */}
        {shouldNavigate && (!userLocation || isRoutingLoading) && !isNavigating && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-[#111622]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-500">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
              <div className="text-white font-bold text-sm">
                {!userLocation ? 'Waiting for GPS Lock...' : 'Calculating Route...'}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Error State */}
        {shouldNavigate && routingError && !isNavigating && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-red-500/90 backdrop-blur-xl border border-red-400 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-500">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div className="text-white font-bold text-sm">
                {routingError}
              </div>
              <button onClick={() => router.push('/')} className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        <NavigationControl position="bottom-right" showCompass={false} style={{ marginBottom: '60px', marginRight: '20px', backgroundColor: '#111622', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', pointerEvents: 'auto' }} />
        
        {/* Custom Controls Container removed to prevent duplicate buttons */}

        {/* Immersive 3D Buildings Layer (Appears when pitched and zoomed) */}
        <Layer 
          id="3d-buildings"
          source="composite"
          source-layer="building"
          filter={['==', 'extrude', 'true']}
          type="fill-extrusion"
          minzoom={15}
          paint={{
            'fill-extrusion-color': '#0A0D14', // Match the dark theme
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.8 // Slightly translucent for cyberpunk feel
          }}
        />

        {/* Render Navigation Route (With Casing for Highway Look) */}
        {routeGeoJSON && (
          <Source id="route-source" type="geojson" data={routeGeoJSON}>
            {/* Dark casing/border underneath */}
            <Layer 
              id="route-layer-casing" 
              type="line" 
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#05445E', // Dark blue border
                'line-width': 12,
                'line-opacity': 0.8
              }}
            />
            {/* Bright inner path */}
            <Layer 
              id="route-layer-inner" 
              type="line" 
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#00B3FF', // Neon blue core
                'line-width': 6,
                'line-opacity': 1.0
              }}
            />
          </Source>
        )}
        
        {/* 100% Native WebGL Bikes */}
        {bikesGeoJSON && (
          <Source id="bikes-source" type="geojson" data={bikesGeoJSON as any}>
            <Layer 
              id="bikes-symbol-layer" 
              type="symbol" 
              layout={{
                'icon-image': 'bike-icon',
                'icon-size': 1,
                'icon-allow-overlap': true,
                'text-field': ['get', 'id'],
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 10,
                'text-offset': [0, -1.8],
                'text-anchor': 'bottom'
              }}
              paint={{
                'text-color': '#ffffff',
                'text-halo-color': '#111622',
                'text-halo-width': 2
              }}
            />
          </Source>
        )}

        {/* 100% Native WebGL Docks */}
        {docksGeoJSON && (
          <Source id="docks-source" type="geojson" data={docksGeoJSON as any}>
            <Layer 
              id="docks-symbol-layer" 
              type="symbol" 
              layout={{
                'icon-image': 'dock-icon',
                'icon-size': 1,
                'icon-allow-overlap': true,
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 11,
                'text-offset': [0, -1.8],
                'text-anchor': 'bottom'
              }}
              paint={{
                'text-color': '#00FFFF',
                'text-halo-color': '#111622',
                'text-halo-width': 2
              }}
            />
          </Source>
        )}

        {/* Destination Preview Marker */}
        {isDestinationPreview && destination && (
          <Marker latitude={destination.lat} longitude={destination.lng} anchor="bottom">
            <div className="relative group cursor-pointer animate-bounce">
              <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
              <div className="w-12 h-12 rounded-full bg-surface border-4 border-primary flex items-center justify-center shadow-2xl relative z-10">
                <LocateFixed className="w-6 h-6 text-primary" />
              </div>
              <div className="w-1 h-8 bg-primary mx-auto -mt-2 shadow-2xl"></div>
            </div>
          </Marker>
        )}

        {/* Custom Smoothed User Location Marker (Anti-Shake) */}
        {userLocation && (
          <Marker latitude={userLocation.lat} longitude={userLocation.lng} anchor="center" style={{ transition: 'all 1s cubic-bezier(0.2, 0, 0, 1)' }}>
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 bg-primary/20 rounded-full animate-ping"></div>
              <div className="w-5 h-5 bg-primary border-2 border-white rounded-full shadow-[0_0_15px_rgba(0,255,163,0.8)] z-10"></div>
            </div>
          </Marker>
        )}

        {/* High-Performance Native Navigation Puck */}
        <GeolocateControl
          ref={geoControlRef}
          position="bottom-right"
          trackUserLocation={true}
          showUserLocation={false} // Hidden so we can draw our own smooth marker above
          showUserHeading={true}
          showAccuracyCircle={false}
          onGeolocate={(e: any) => {
            if (e && e.coords) {
              // PREVENT MASSIVE TELEPORTS: 
              // If the accuracy radius is worse than 1000 meters, this is a fake IP-based location (like an ISP in Lagos).
              // We completely ignore it and wait for the true GPS hardware lock.
              if (e.coords.accuracy > 1000) {
                console.warn(`Ignoring inaccurate location ping (Accuracy: ${e.coords.accuracy}m)`);
                return;
              }

              const loc = { lat: e.coords.latitude, lng: e.coords.longitude };
              
              setUserLocation(prev => {
                if (!prev) return loc;
                // Anti-Shake Filter: Ignore movements smaller than 8 meters
                const dist = getDistanceMeters(prev.lat, prev.lng, loc.lat, loc.lng);
                if (dist < 8) return prev;
                return loc;
              });
              
              if (!hasInitialLock.current) {
                setSearchCenter(loc);
                hasInitialLock.current = true;
                
                // Forcefully fly to the exact coordinate on first lock instead of letting the browser's 
                // massive IP-based accuracy radius zoom the map out to the whole country.
                if (!isNavigating) {
                  mapRef.current?.flyTo({
                    center: [loc.lng, loc.lat],
                    zoom: 15,
                    pitch: 45,
                    duration: 1500
                  });
                }
              }
            }
          }}
          positionOptions={{ enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }}
          style={{ marginBottom: '100px', marginRight: '20px', backgroundColor: '#111622', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
        />
      </Map>
    </div>
  );
}
