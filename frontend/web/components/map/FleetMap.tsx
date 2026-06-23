"use client";

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useFleetSocket } from '@/hooks/useFleetSocket';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjazAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwIn0.xxxxx';

interface Bike {
  id: string;
  lat: number;
  lng: number;
  battery_pct: number;
  status: string;
}

interface Dock {
  id: string;
  lat: number;
  lng: number;
  name: string;
  available_slots: number;
  total_slots: number;
}

export interface FleetMapProps {
  bikes?: Bike[];
  connected?: boolean;
  error?: string | null;
  selectedBikeId?: string | null;
  onSelectBikeId?: (id: string | null) => void;
  historicalRoute?: {lat: number, lng: number}[];
}

export function FleetMapComponent({ 
  bikes: externalBikes, 
  connected: externalConnected, 
  error: externalError, 
  selectedBikeId, 
  onSelectBikeId,
  historicalRoute
}: FleetMapProps = {}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const dockMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [internalSelectedBike, setInternalSelectedBike] = useState<Bike | null>(null);
  const [docks, setDocks] = useState<Dock[]>([]);

  // Only use socket if bikes aren't provided by parent
  const socketData = useFleetSocket({});
  const bikes = externalBikes ?? socketData.bikes;
  const connected = externalConnected ?? socketData.connected;
  const error = externalError ?? socketData.error;

  const selectedBike = selectedBikeId !== undefined 
    ? bikes.find(b => b.id === selectedBikeId) || null 
    : internalSelectedBike;

  const handleSelectBike = (bike: Bike | null) => {
    if (onSelectBikeId) onSelectBikeId(bike?.id || null);
    else setInternalSelectedBike(bike);
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [0, 0], // Start at 0,0 temporarily
        zoom: 2,
      });

      map.current.addControl(new mapboxgl.NavigationControl());

      // Fetch docks
      const fetchDocks = async () => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
          const token = localStorage.getItem('token') || '';
          const res = await fetch(`${baseUrl}/api/proxy/fleet/docks`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
          });
          if (res.ok) {
            const data = await res.json();
            const fetchedDocks = data.success && data.data ? data.data : Array.isArray(data) ? data : [];
            setDocks(fetchedDocks);
            
            // Auto-center map on operator's primary dock
            if (fetchedDocks.length > 0 && map.current) {
              map.current.flyTo({
                center: [fetchedDocks[0].lng, fetchedDocks[0].lat],
                zoom: 14,
                duration: 2000
              });
            } else if (map.current) {
              // If NO docks, use the operator's real-world browser location
              if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    map.current?.flyTo({
                      center: [position.coords.longitude, position.coords.latitude],
                      zoom: 14,
                      duration: 2000
                    });
                  },
                  (error) => console.warn('Geolocation blocked/failed:', error),
                  { enableHighAccuracy: true }
                );
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch docks:', err);
        }
      };

      fetchDocks();
    } catch (err) {
      console.error('Failed to initialize map:', err);
    }

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update bike markers
  useEffect(() => {
    if (!map.current) return;

    bikes.forEach((bike) => {
      let marker = markersRef.current.get(bike.id);

      if (!marker) {
        // Create new marker
        const el = document.createElement('div');
        el.className = 'w-8 h-8 cursor-pointer';
        
        const color = bike.status === 'in_use' ? '#ef4444' : bike.battery_pct < 20 ? '#f97316' : '#22c55e';
        el.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
            <path d="M16 8L19 14H13L16 8Z" fill="white"/>
          </svg>
        `;

        el.onclick = () => handleSelectBike(bike);

        marker = new mapboxgl.Marker({ element: el })
          .setLngLat([bike.lng, bike.lat])
          .addTo(map.current!);

        markersRef.current.set(bike.id, marker);
      } else {
        // Update existing marker position
        marker.setLngLat([bike.lng, bike.lat]);
      }
    });
  }, [bikes]);

  // Update dock markers
  useEffect(() => {
    if (!map.current) return;

    docks.forEach((dock) => {
      let marker = dockMarkersRef.current.get(dock.id);

      if (!marker) {
        const el = document.createElement('div');
        el.className = 'w-8 h-8 cursor-pointer';
        
        const available_pct = (dock.available_slots / dock.total_slots) * 100;
        const color = available_pct > 50 ? '#3b82f6' : available_pct > 20 ? '#eab308' : '#ef4444';
        
        el.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="8" width="20" height="16" rx="2" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${dock.available_slots}</text>
          </svg>
        `;

        marker = new mapboxgl.Marker({ element: el })
          .setLngLat([dock.lng, dock.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`
            <div class="text-sm">
              <p class="font-bold">${dock.name}</p>
              <p>${dock.available_slots}/${dock.total_slots} slots available</p>
            </div>
          `))
          .addTo(map.current!);

        dockMarkersRef.current.set(dock.id, marker);
      }
    });
  }, [docks]);

  const [bikeTrail, setBikeTrail] = useState<{lat: number, lng: number, ts: number}[]>([]);

  // Fetch trail when a bike is selected
  useEffect(() => {
    if (!selectedBike) {
      setBikeTrail([]);
      if (map.current && map.current.getSource('bike-trail')) {
        (map.current.getSource('bike-trail') as mapboxgl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: []
        });
      }
      // Return to global view
      if (map.current) {
        if (docks.length > 0) {
          map.current.flyTo({
            center: [docks[0].lng, docks[0].lat],
            zoom: 13,
            duration: 1500,
            essential: true
          });
        } else {
          const currentCenter = map.current.getCenter();
          map.current.flyTo({
            center: currentCenter,
            zoom: 12,
            duration: 1500,
            essential: true
          });
        }
      }
      return;
    }

    const fetchTrail = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const token = localStorage.getItem('token') || '';
        const res = await fetch(`${baseUrl}/api/proxy/fleet/bikes/${selectedBike.id}/trail`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setBikeTrail(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch trail:', err);
      }
    };
    
    fetchTrail();
    const interval = setInterval(fetchTrail, 5000);

    // Focus camera on the bike
    if (map.current) {
      map.current.flyTo({
        center: [selectedBike.lng, selectedBike.lat],
        zoom: 16,
        duration: 1500, // 1.5 second smooth flight
        essential: true
      });
    }

    return () => clearInterval(interval);
  }, [selectedBike, docks]);

  // Focus camera on historical route when it changes
  useEffect(() => {
    if (!map.current) return;
    if (historicalRoute && historicalRoute.length > 0) {
      map.current.flyTo({
        center: [historicalRoute[0].lng, historicalRoute[0].lat],
        zoom: 14,
        duration: 1500,
        essential: true
      });
    } else if (!selectedBikeId) {
      // Return to global view if both are cleared
      if (docks.length > 0 && map.current) {
        map.current.flyTo({
          center: [docks[0].lng, docks[0].lat],
          zoom: 14,
          duration: 1500,
          essential: true
        });
      } else if (map.current) {
        // Fall back to zooming out slightly from current center
        const currentCenter = map.current.getCenter();
        map.current.flyTo({
          center: currentCenter,
          zoom: 12,
          duration: 1500,
          essential: true
        });
      }
    }
  }, [historicalRoute, selectedBikeId, docks]);

  // Draw trail on map
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const routeToDraw = historicalRoute && historicalRoute.length > 0 
      ? historicalRoute 
      : bikeTrail;

    const geojson: any = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: routeToDraw.map(p => [p.lng, p.lat])
      },
      properties: {}
    };

    if (map.current.getSource('bike-trail')) {
      (map.current.getSource('bike-trail') as mapboxgl.GeoJSONSource).setData(geojson);
    } else {
      map.current.addSource('bike-trail', { type: 'geojson', data: geojson });
      map.current.addLayer({
        id: 'bike-trail-line',
        type: 'line',
        source: 'bike-trail',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#0ea5e9', // Sky blue
          'line-width': 4,
          'line-opacity': 0.8,
          'line-dasharray': [1, 2]
        }
      });
    }
  }, [bikeTrail]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Connection status */}
      <div className="flex items-center gap-2 px-4">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm text-slate-400">
          {connected ? 'Live updates' : 'Disconnected'}
          {error && ` - ${error}`}
        </span>
      </div>

      {/* Map container */}
      <div ref={mapContainer} className="flex-1 rounded-lg overflow-hidden border border-slate-700" />

      {/* Selected bike details */}
      {selectedBike && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-bold text-white">{selectedBike.id}</div>
              <p className="text-sm text-slate-400">
                Lat: {selectedBike.lat.toFixed(4)}, Lng: {selectedBike.lng.toFixed(4)}
              </p>
            </div>
            <button onClick={() => handleSelectBike(null)} className="text-slate-400 hover:text-white">×</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-slate-400">Location</p>
              <p className="text-white">{selectedBike.lat.toFixed(4)}, {selectedBike.lng.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-slate-400">Status</p>
              <p className="text-white capitalize">{selectedBike.status}</p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-400">
        <p className="font-bold text-white mb-2">Legend</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>In Use</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Low Battery</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Dock</span>
          </div>
        </div>
      </div>
    </div>
  );
}
