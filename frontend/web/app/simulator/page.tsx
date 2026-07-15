'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useFleetSocket } from '@/hooks/useFleetSocket';
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  Cpu,
  Navigation,
  MapPin,
  Zap,
  Lock,
  Unlock,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

// Set mapbox token (use environment variable in production)
const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjazAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwIn0.xxxxx';

export default function SimulatorPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const { bikes } = useFleetSocket({});

  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [battery, setBattery] = useState<number>(100);
  const [hardwareState, setHardwareState] = useState<'LOCKED' | 'UNLOCKED'>('LOCKED');

  // Auto-Navigation State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navInterval, setNavInterval] = useState<NodeJS.Timeout | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [3.37, 6.52], // Lagos (Default fallback)
        zoom: 13,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Request actual user location to make spawning realistic
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            map.current?.flyTo({
              center: [position.coords.longitude, position.coords.latitude],
              zoom: 16,
              essential: true,
            });
          },
          (err) => console.log('Geolocation denied, sticking to default.', err),
        );
      }

      // Add click handler to map to create new bikes
      map.current.on('dblclick', async (e) => {
        e.preventDefault();
        const newId = `BK-${Math.floor(Math.random() * 9000) + 1000}`;
        await updateBikeTelemetry(newId, e.lngLat.lat, e.lngLat.lng, 100, 'LOCKED');
      });
    } catch (err) {
      console.error('Failed to initialize map:', err);
    }

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!map.current) return;

    bikes.forEach((bike) => {
      let marker = markersRef.current.get(bike.id);

      if (!marker) {
        // Create new draggable marker
        const el = document.createElement('div');
        el.className =
          'w-10 h-10 cursor-pointer flex items-center justify-center transition-transform hover:scale-110';

        el.innerHTML = `
          <div class="relative flex flex-col items-center">
            <div class="w-8 h-8 rounded-full bg-surface border-[3px] ${bike.status === 'in_use' ? 'border-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.6)]' : 'border-primary shadow-[0_0_15px_rgba(30, 215, 96,0.6)]'} flex items-center justify-center z-10 transition-colors">
              <svg class="w-4 h-4 ${bike.status === 'in_use' ? 'text-[#00D4FF]' : 'text-primary'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedBikeId(bike.id);
          setBattery(bike.battery_pct);
          setHardwareState(bike.lock_status as 'LOCKED' | 'UNLOCKED');
        });

        marker = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat([bike.lng, bike.lat])
          .addTo(map.current!);

        // On drag end, update telemetry
        marker.on('dragend', async () => {
          const lngLat = marker!.getLngLat();
          await updateBikeTelemetry(
            bike.id,
            lngLat.lat,
            lngLat.lng,
            bike.battery_pct,
            bike.lock_status,
          );
        });

        markersRef.current.set(bike.id, marker);
      } else {
        // If not dragging, update position from WS
        // Mapbox GL JS Marker doesn't expose isDragging in its public TS types
        if (!(marker as any)._isDragging) {
          marker.setLngLat([bike.lng, bike.lat]);

          // Update icon color based on status dynamically
          const isUnlocked = bike.lock_status === 'UNLOCKED';
          const innerDiv = marker.getElement().querySelector('.rounded-full');
          const svgIcon = marker.getElement().querySelector('svg');

          if (innerDiv && svgIcon) {
            if (isUnlocked) {
              innerDiv.className =
                'w-8 h-8 rounded-full bg-surface border-[3px] border-[#00D4FF] flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.6)] z-10 transition-all';
              svgIcon.setAttribute('class', 'w-4 h-4 text-[#00D4FF] transition-colors');
            } else {
              innerDiv.className =
                'w-8 h-8 rounded-full bg-surface border-[3px] border-primary flex items-center justify-center shadow-[0_0_15px_rgba(30, 215, 96,0.6)] z-10 transition-all';
              svgIcon.setAttribute('class', 'w-4 h-4 text-primary transition-colors');
            }
          }
        }
      }
    });
  }, [bikes]);

  // Update selected bike state if it changes externally
  useEffect(() => {
    if (selectedBikeId) {
      const bike = bikes.find((b) => b.id === selectedBikeId);
      if (bike) {
        if (Math.abs(bike.battery_pct - battery) > 5) {
          setBattery(bike.battery_pct); // Only update slider if diverged significantly from server to avoid slider jumping while dragging
        }
        setHardwareState(bike.lock_status as 'LOCKED' | 'UNLOCKED');
      }
    }
  }, [bikes, selectedBikeId]);

  const updateBikeTelemetry = async (
    id: string,
    lat: number,
    lng: number,
    batt: number,
    lockStatus: string,
  ) => {
    try {
      await fetch(
        `/api/proxy/fleet/simulator/telemetry`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bikeId: id,
            lat,
            lng,
            battery_pct: batt,
            speed_kmh: 0,
            lock_status: lockStatus,
          }),
        },
      );
    } catch (err) {
      console.error('Failed to update telemetry', err);
    }
  };

  const handleBatteryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setBattery(val);

    if (selectedBikeId) {
      const bike = bikes.find((b) => b.id === selectedBikeId);
      if (bike) {
        await updateBikeTelemetry(bike.id, bike.lat, bike.lng, val, hardwareState);
      }
    }
  };

  const toggleLock = async () => {
    if (!selectedBikeId) return;
    const bike = bikes.find((b) => b.id === selectedBikeId);
    if (!bike) return;

    const newState = hardwareState === 'LOCKED' ? 'UNLOCKED' : 'LOCKED';
    setHardwareState(newState);
    await updateBikeTelemetry(bike.id, bike.lat, bike.lng, battery, newState);
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2) {
      const bike = bikes.find((b) => b.id === selectedBikeId);
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&proximity=${bike?.lng || 0},${bike?.lat || 0}`,
      );
      const data = await res.json();
      setSearchResults(data.features || []);
    } else {
      setSearchResults([]);
    }
  };

  const startSimulation = async (destLng: number, destLat: number) => {
    const bike = bikes.find((b) => b.id === selectedBikeId);
    if (!bike) return;
    setSearchResults([]);
    setSearchQuery('');

    try {
      const res = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${bike.lng},${bike.lat};${destLng},${destLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`,
      );
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) return;
      const coords = data.routes[0].geometry.coordinates;

      // Draw route on map
      if (map.current?.getSource('route')) {
        (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        });
      } else {
        map.current?.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: coords },
          },
        });
        map.current?.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#00D4FF', 'line-width': 4, 'line-opacity': 0.6 },
        });
      }

      setIsNavigating(true);
      setHardwareState('UNLOCKED'); // Auto unlock for driving
      let step = 0;
      let currentBatt = battery;

      const interval = setInterval(async () => {
        if (step >= coords.length) {
          stopSimulation();
          return;
        }
        const [lng, lat] = coords[step];
        currentBatt = Math.max(0, currentBatt - 0.2); // battery drain
        setBattery(Math.round(currentBatt));

        await updateBikeTelemetry(bike.id, lat, lng, Math.round(currentBatt), 'UNLOCKED');
        step++;
      }, 1500); // move to next coord every 1.5s

      setNavInterval(interval);
    } catch (err) {
      console.error('Simulation failed', err);
    }
  };

  const stopSimulation = () => {
    if (navInterval) clearInterval(navInterval);
    setNavInterval(null);
    setIsNavigating(false);
    if (map.current?.getLayer('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }
  };

  const selectedBike = bikes.find((b) => b.id === selectedBikeId);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden -m-4 md:-m-8">
      {/* Map Area */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />

        {/* Top Info Bar */}
        <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
          <div className="glass-panel p-4 rounded-xl shadow-2xl pointer-events-auto flex items-center gap-4 max-w-sm">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white font-bold text-base leading-tight">
                Digital Twin Simulator
              </div>
              <p className="text-xs text-slate-400">Spawn, move, and hack physical hardware</p>
            </div>
          </div>

          <div className="glass-panel p-3 rounded-xl shadow-2xl pointer-events-auto flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-xs font-semibold text-slate-300">MQTT Live</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Zap className="w-4 h-4 text-primary" />
              {bikes.length} Vehicles Online
            </div>
          </div>
        </div>

        {/* Map Instructions */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-panel px-6 py-3 rounded-full text-sm font-medium text-slate-300 flex items-center gap-3 shadow-2xl pointer-events-auto backdrop-blur-xl border-white/5">
          <MapPin className="w-4 h-4 text-primary" />
          Double-click map to spawn a new bike
        </div>
      </div>

      {/* Hardware Control Panel Sidebar */}
      <div className="w-[400px] bg-background border-l border-white/10 flex flex-col overflow-y-auto relative z-10 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/5 bg-surface/30 sticky top-0 backdrop-blur-md z-20">
          <div className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Hardware Interface
          </div>
          <p className="text-sm text-slate-400 mt-1">Select a vehicle on the map to interact</p>
        </div>

        {selectedBikeId && selectedBike ? (
          <div className="p-6 flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
            {/* The Digital Display (Hardware Screen) */}
            <div className="bg-[#0A100D] border-2 border-[#1E2D24] rounded-xl p-5 shadow-[inset_0_0_20px_rgba(30, 215, 96,0.05)] relative overflow-hidden group flex flex-col gap-4">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                      IoT Core Active
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-white tracking-tight font-mono">
                    {selectedBikeId}
                  </div>
                </div>

                {/* Simulated Physical QR Code Sticker */}
                <div className="bg-white p-1.5 rounded-lg border-2 border-slate-300 shadow-md transform rotate-2 hover:rotate-0 transition-transform">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${selectedBikeId}`}
                    alt={`QR Code for ${selectedBikeId}`}
                    className="w-16 h-16"
                  />
                  <div className="text-center mt-1">
                    <span className="text-[9px] font-bold text-black uppercase">Scan to Ride</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center bg-surface/50 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    {hardwareState === 'LOCKED' ? (
                      <Lock className="w-4 h-4 text-warning" />
                    ) : (
                      <Unlock className="w-4 h-4 text-[#00D4FF]" />
                    )}
                    <span className="text-sm font-medium text-slate-300">Relay Status</span>
                  </div>
                  <span
                    className={`text-sm font-bold ${hardwareState === 'LOCKED' ? 'text-warning' : 'text-[#00D4FF]'}`}
                  >
                    {hardwareState}
                  </span>
                </div>

                {/* Screenless Hardware Indicators (LED & Audio) */}
                <div className="flex justify-between items-center bg-surface/30 p-4 rounded-lg border border-white/5 mt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">Status LED</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${hardwareState === 'LOCKED' ? 'bg-warning text-warning' : 'bg-[#1ED760] text-[#1ED760] animate-pulse'}`}
                      ></div>
                      <span className="text-sm font-medium text-white">
                        {hardwareState === 'LOCKED' ? 'Solid Amber' : 'Pulsing Green'}
                      </span>
                    </div>
                  </div>

                  <div className="w-px h-10 bg-white/10"></div>

                  <div className="flex flex-col gap-1 items-end">
                    <span className="text-xs font-bold text-slate-500 uppercase">Audio</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium text-white">
                        {hardwareState === 'LOCKED' ? 'Silent' : 'Unlock Chime'}
                      </span>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${hardwareState === 'UNLOCKED' ? 'bg-[#00D4FF]/20 text-[#00D4FF] animate-pulse' : 'bg-surface text-slate-500'}`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.898a9 9 0 010 12.728M5 10v4a2 2 0 002 2h2l5 5V3l-5 5H7a2 2 0 00-2 2z"
                          ></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hardware Controls */}
            <div className="flex flex-col gap-5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Hardware Overrides
              </div>

              {/* Battery Slider */}
              <div className="bg-surface/40 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    {battery > 20 ? (
                      <BatteryCharging className="w-4 h-4 text-primary" />
                    ) : (
                      <BatteryWarning className="w-4 h-4 text-danger animate-pulse" />
                    )}
                    <label className="text-sm font-medium text-slate-300">Battery Cell Level</label>
                  </div>
                  <span
                    className={`text-sm font-bold ${battery <= 20 ? 'text-danger' : 'text-primary'}`}
                  >
                    {battery}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={battery}
                  onChange={handleBatteryChange}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Manual Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={toggleLock}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-colors ${hardwareState === 'LOCKED' ? 'bg-surface/50 border-white/10 hover:bg-white/5 text-slate-300' : 'bg-[#00D4FF]/10 border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/20'}`}
                >
                  {hardwareState === 'LOCKED' ? (
                    <Unlock className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  <span className="text-xs font-bold">
                    {hardwareState === 'LOCKED' ? 'Force Unlock' : 'Force Lock'}
                  </span>
                </button>

                <button className="p-3 rounded-xl bg-surface/50 border border-white/10 hover:bg-white/5 text-slate-300 flex flex-col items-center justify-center gap-2 transition-colors">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <span className="text-xs font-bold">Trigger Alarm</span>
                </button>
              </div>

              {/* Auto-Navigation Module */}
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl relative overflow-hidden mt-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="flex items-start gap-3 relative z-10">
                  <Navigation className="w-5 h-5 text-primary mt-0.5" />
                  <div className="w-full">
                    <div className="text-sm font-bold text-white mb-1">Auto-Navigation</div>

                    {!isNavigating ? (
                      <>
                        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                          Search a destination to simulate a ride and broadcast live telemetry.
                        </p>
                        <div className="relative">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearch}
                            placeholder="Enter destination..."
                            className="w-full bg-surface/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary placeholder:text-slate-500"
                          />
                          {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-white/10 rounded-lg overflow-hidden z-50 shadow-2xl max-h-48 overflow-y-auto">
                              {searchResults.map((result) => (
                                <button
                                  key={result.id}
                                  onClick={() =>
                                    startSimulation(result.center[0], result.center[1])
                                  }
                                  className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors border-b border-white/5 last:border-0 truncate"
                                >
                                  {result.place_name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-3 mt-1">
                          <div className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse shadow-[0_0_8px_#00D4FF]"></div>
                          <span className="text-xs font-bold text-[#00D4FF]">
                            Simulating Ride in Progress...
                          </span>
                        </div>
                        <button
                          onClick={stopSimulation}
                          className="w-full py-2 bg-danger/10 text-danger border border-danger/30 text-xs font-bold rounded-lg hover:bg-danger/20 transition-colors"
                        >
                          Stop Simulation
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
            <div className="w-16 h-16 rounded-full bg-surface border border-white/10 flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-slate-500" />
            </div>
            <div className="text-lg font-bold text-white mb-2">No Target Selected</div>
            <p className="text-sm text-slate-400 max-w-[200px]">
              Click any vehicle on the map to access its hardware interface.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
