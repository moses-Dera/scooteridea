'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Map, { GeolocateControl, Source, Layer, MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useFleetSocket } from '@/hooks/useFleetSocket';
import { useNavigationEngine, NavigationProfile } from '@/hooks/useNavigationEngine';
import { useSession } from 'next-auth/react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.dummy_token';

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
  historicalRoute?: { lat: number; lng: number }[];
}

export function FleetMapComponent({
  bikes: externalBikes,
  connected: externalConnected,
  error: externalError,
  selectedBikeId,
  onSelectBikeId,
  historicalRoute,
}: FleetMapProps = {}) {
  const { data: session } = useSession();
  const mapRef = useRef<MapRef>(null);

  const [internalSelectedBike, setInternalSelectedBike] = useState<Bike | null>(null);
  const [docks, setDocks] = useState<Dock[]>([]);

  // Only use socket if bikes aren't provided by parent
  const socketData = useFleetSocket({});
  const bikes = externalBikes ?? socketData.bikes;
  const connected = externalConnected ?? socketData.connected;
  const error = externalError ?? socketData.error;

  const selectedBike =
    selectedBikeId !== undefined
      ? bikes.find((b) => b.id === selectedBikeId) || null
      : internalSelectedBike;

  const handleSelectBike = (bike: Bike | null) => {
    if (onSelectBikeId) onSelectBikeId(bike?.id || null);
    else setInternalSelectedBike(bike);
  };

  const [viewState, setViewState] = useState({
    latitude: 0,
    longitude: 0,
    zoom: 2,
    pitch: 0,
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setViewState((prev) => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            zoom: 14,
          }));
        },
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true },
      );
    }
  }, []);

  // Fetch docks
  useEffect(() => {
    const fetchDocks = async () => {
      try {
        const token = (session as any)?.accessToken || '';
        const res = await fetch(`/api/proxy/fleet/docks`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) {
          const data = await res.json();
          const fetchedDocks =
            data.success && data.data ? data.data : Array.isArray(data) ? data : [];
          setDocks(fetchedDocks);
        }
      } catch (err) {
        console.error('Failed to fetch docks:', err);
      }
    };
    if (session) fetchDocks();
  }, [session]);

  const [zones, setZones] = useState<any[]>([]);

  // Fetch geofences (polygon zones)
  useEffect(() => {
    let isMounted = true;
    const fetchZones = async () => {
      try {
        const token = (session as any)?.accessToken || '';
        const res = await fetch(`/api/proxy/fleet/geofences`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!isMounted) return;
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setZones(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load geofences:', err);
      }
    };
    if (session) fetchZones();
    return () => {
      isMounted = false;
    };
  }, [session]);

  const [bikeTrail, setBikeTrail] = useState<{ lat: number; lng: number; ts: number }[]>([]);

  // Fetch trail when a bike is selected
  useEffect(() => {
    if (!selectedBike) {
      setBikeTrail([]);
      if (docks.length > 0 && mapRef.current) {
        mapRef.current.flyTo({ center: [docks[0].lng, docks[0].lat], zoom: 13, duration: 1500 });
      }
      return;
    }

    const fetchTrail = async () => {
      try {
        const token = (session as any)?.accessToken || '';
        const res = await fetch(`/api/proxy/fleet/bikes/${selectedBike.id}/trail`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedBike.lng, selectedBike.lat],
        zoom: 16,
        duration: 1500,
      });
    }

    return () => clearInterval(interval);
  }, [selectedBike?.id, docks.length, session]);

  // Historical Route focus
  useEffect(() => {
    if (historicalRoute && historicalRoute.length > 0 && mapRef.current) {
      mapRef.current.flyTo({
        center: [historicalRoute[0].lng, historicalRoute[0].lat],
        zoom: 14,
        duration: 1500,
      });
    }
  }, [historicalRoute]);

  // Convert Bikes to GeoJSON
  const bikesGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: bikes.map((bike) => {
        const color =
          bike.status === 'in_use' ? '#ef4444' : bike.battery_pct < 20 ? '#f97316' : '#22c55e';
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [bike.lng, bike.lat] },
          properties: { id: bike.id, color, battery: bike.battery_pct, status: bike.status },
        };
      }),
    }),
    [bikes],
  );

  // Convert Docks to GeoJSON
  const docksGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: docks.map((dock) => {
        const available_pct = (dock.available_slots / dock.total_slots) * 100;
        const color = available_pct > 50 ? '#3b82f6' : available_pct > 20 ? '#eab308' : '#ef4444';
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [dock.lng, dock.lat] },
          properties: {
            id: dock.id,
            name: dock.name,
            slots: dock.available_slots.toString(),
            color,
          },
        };
      }),
    }),
    [docks],
  );

  // Convert zones to GeoJSON
  const zonesGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: zones.map((zone) => ({
        type: 'Feature',
        geometry: zone.boundary,
        properties: { id: zone.id, name: zone.name, type: zone.type },
      })),
    }),
    [zones],
  );

  const routeToDraw = historicalRoute && historicalRoute.length > 0 ? historicalRoute : bikeTrail;
  const trailGeoJSON = useMemo(() => {
    if (routeToDraw.length === 0) return null;
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: routeToDraw.map((p) => [p.lng, p.lat]),
      },
    };
  }, [routeToDraw]);

  const onMapClick = useCallback(
    (e: mapboxgl.MapLayerMouseEvent) => {
      const feature = e.features && e.features[0];
      if (!feature) {
        handleSelectBike(null);
        return;
      }

      if (feature.layer?.id === 'bikes-circle-layer' || feature.layer?.id === 'bikes-core-layer') {
        const bikeId = feature.properties?.id;
        const bike = bikes.find((b) => b.id === bikeId);
        if (bike) handleSelectBike(bike);
      } else {
        handleSelectBike(null);
      }
    },
    [bikes, handleSelectBike],
  );

  // User Location & Navigation for Stakeholder Van
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    heading?: number;
  } | null>(null);
  const geoControlRef = useRef<mapboxgl.GeolocateControl>(null);
  const [navProfile, setNavProfile] = useState<NavigationProfile>('driving-traffic');

  const {
    isActive: isNavigating,
    routeGeoJSON,
    steps,
    currentStepIndex,
    distanceText,
    etaText,
  } = useNavigationEngine(
    userLocation,
    selectedBike ? { lat: selectedBike.lat, lng: selectedBike.lng } : null,
    navProfile,
  );

  useEffect(() => {
    if (isNavigating && geoControlRef.current) geoControlRef.current.trigger();
    if (isNavigating && userLocation && selectedBike && mapRef.current) {
      mapRef.current.easeTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 17,
        pitch: 60,
        duration: 1000,
      });
    }
  }, [isNavigating, userLocation, selectedBike?.lat, selectedBike?.lng]);

  const startNavigation = () => {
    if (!navigator.geolocation) return;

    // Fallback if they click navigate without a real device GPS
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading ?? undefined,
        }),
      (err) => console.warn(err),
      { enableHighAccuracy: true },
    );
    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading ?? undefined,
        }),
      () => {},
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  };

  if (!mounted)
    return <div className="flex-1 bg-slate-900 animate-pulse rounded-lg border border-slate-700" />;

  return (
    <div className="flex flex-col h-full gap-4 relative">
      {/* Connection status */}
      <div className="flex items-center gap-2 px-4 shrink-0">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm text-slate-400">
          {connected ? 'Live updates' : 'Disconnected'}
          {error && ` - ${error}`}
        </span>
      </div>

      {/* Map container */}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-slate-700">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt: any) => setViewState(evt.viewState)}
          onClick={onMapClick}
          interactiveLayerIds={['bikes-circle-layer', 'bikes-core-layer']}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Navigation HUD */}
          {isNavigating && steps.length > 0 && (
            <div className="absolute top-4 left-4 z-20 max-w-[320px]">
              <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-sm leading-tight truncate">
                    {steps[currentStepIndex]?.maneuver?.instruction || 'Proceed'}
                  </div>
                  <div className="text-blue-400 font-extrabold text-xs mt-0.5 tracking-wide">
                    {steps[currentStepIndex]?.distance
                      ? `${Math.round(steps[currentStepIndex].distance)}m`
                      : 'Arriving'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Docks */}
          {docksGeoJSON && (
            <Source id="docks-source" type="geojson" data={docksGeoJSON as any}>
              <Layer
                id="docks-rect-layer"
                type="circle"
                paint={{
                  'circle-radius': 14,
                  'circle-color': ['get', 'color'],
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#ffffff',
                }}
              />
              <Layer
                id="docks-text-layer"
                type="symbol"
                layout={{
                  'text-field': ['get', 'slots'],
                  'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                  'text-size': 12,
                }}
                paint={{ 'text-color': '#ffffff' }}
              />
              <Layer
                id="docks-name-layer"
                type="symbol"
                layout={{
                  'text-field': ['get', 'name'],
                  'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                  'text-size': 10,
                  'text-offset': [0, 2],
                }}
                paint={{ 'text-color': '#ffffff' }}
              />
            </Source>
          )}

          {/* Zones */}
          {zonesGeoJSON && (
            <Source id="zones-source" type="geojson" data={zonesGeoJSON as any}>
              <Layer
                id="zones-fill-layer"
                type="fill"
                paint={{
                  'fill-color': [
                    'match',
                    ['get', 'type'],
                    'no_ride',
                    '#ef4444',
                    'slow',
                    '#eab308',
                    'dock',
                    '#00B3FF',
                    '#1ED760',
                  ],
                  'fill-opacity': 0.15,
                }}
              />
              <Layer
                id="zones-outline-layer"
                type="line"
                paint={{
                  'line-color': [
                    'match',
                    ['get', 'type'],
                    'no_ride',
                    '#ef4444',
                    'slow',
                    '#eab308',
                    'dock',
                    '#00B3FF',
                    '#1ED760',
                  ],
                  'line-width': 1.5,
                  'line-dasharray': [1, 2],
                  'line-opacity': 0.4,
                }}
              />
            </Source>
          )}

          {/* Bikes */}
          {bikesGeoJSON && (
            <Source id="bikes-source" type="geojson" data={bikesGeoJSON as any}>
              <Layer
                id="bikes-circle-layer"
                type="circle"
                paint={{
                  'circle-radius': 16,
                  'circle-color': ['get', 'color'],
                  'circle-opacity': 0.3,
                  'circle-blur': 0.5,
                }}
              />
              <Layer
                id="bikes-core-layer"
                type="circle"
                paint={{
                  'circle-radius': 6,
                  'circle-color': ['get', 'color'],
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#ffffff',
                }}
              />
            </Source>
          )}

          {/* Bike Trail */}
          {trailGeoJSON && (
            <Source id="bike-trail-source" type="geojson" data={trailGeoJSON as any}>
              <Layer
                id="bike-trail-line"
                type="line"
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                paint={{
                  'line-color': '#0ea5e9',
                  'line-width': 4,
                  'line-opacity': 0.8,
                  'line-dasharray': [1, 2],
                }}
              />
            </Source>
          )}

          {/* Navigation Route */}
          {routeGeoJSON && (
            <Source id="route-source" type="geojson" data={routeGeoJSON}>
              <Layer
                id="route-layer"
                type="line"
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                paint={{ 'line-color': '#3b82f6', 'line-width': 6, 'line-opacity': 0.8 }}
              />
            </Source>
          )}

          {/* 3D Buildings */}
          <Layer
            id="3d-buildings"
            source="composite"
            source-layer="building"
            filter={['==', 'extrude', 'true']}
            type="fill-extrusion"
            minzoom={15}
            paint={{
              'fill-extrusion-color': '#1e293b',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.6,
            }}
          />

          <GeolocateControl
            ref={geoControlRef}
            position="bottom-right"
            trackUserLocation={true}
            showUserHeading={true}
            showAccuracyCircle={false}
          />
        </Map>
      </div>

      {/* Selected bike details overlay */}
      {selectedBike && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shrink-0">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                {selectedBike.id}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    selectedBike.battery_pct < 20
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {selectedBike.battery_pct}% Battery
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Lat: {selectedBike.lat.toFixed(4)}, Lng: {selectedBike.lng.toFixed(4)}
              </p>
            </div>
            <div className="flex gap-2">
              {!isNavigating ? (
                <button
                  onClick={startNavigation}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Navigate Van
                </button>
              ) : (
                <div className="text-blue-400 font-bold text-sm bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                  ETA: {etaText} | {distanceText}
                </div>
              )}
              <button
                onClick={() => {
                  handleSelectBike(null);
                  setUserLocation(null); // Stops navigation
                }}
                className="text-slate-400 hover:text-white bg-slate-700 w-8 rounded-lg flex items-center justify-center"
              >
                ×
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-slate-400">Location</p>
              <p className="text-white">
                {selectedBike.lat.toFixed(4)}, {selectedBike.lng.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Status</p>
              <p className="text-white capitalize">{selectedBike.status.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-400 shrink-0">
        <p className="font-bold text-white mb-2">Legend</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>In Use / Broken</span>
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
