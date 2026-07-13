import { useState, useEffect } from 'react';

// Using a public demo token if env is missing, but env should be configured for production
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.dummy_token';

export type NavigationProfile = 'walking' | 'cycling' | 'driving-traffic';

export interface RouteManeuver {
  instruction: string;
  type: string;
  modifier?: string;
  location: [number, number];
}

export interface RouteStep {
  distance: number;
  duration: number;
  geometry: any;
  name: string;
  maneuver: RouteManeuver;
}

export interface NavigationState {
  isActive: boolean;
  routeGeoJSON: any | null;
  steps: RouteStep[];
  currentStepIndex: number;
  totalDistance: number; // in meters
  totalDuration: number; // in seconds
  etaText: string;
  distanceText: string;
}

export function useNavigationEngine(
  startLocation: { lat: number; lng: number } | null,
  destination: { lat: number; lng: number } | null,
  profile: NavigationProfile = 'walking',
) {
  const [navState, setNavState] = useState<NavigationState>({
    isActive: false,
    routeGeoJSON: null,
    steps: [],
    currentStepIndex: 0,
    totalDistance: 0,
    totalDuration: 0,
    etaText: '',
    distanceText: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!startLocation || !destination) {
      setNavState((prev) => ({ ...prev, isActive: false, routeGeoJSON: null }));
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      setError(null);
      try {
        // We request steps=true to get turn-by-turn instructions
        // We request overview=full to get a smooth polyline
        // We allow ferries because crossing the Lagos harbour via bridge is a 17km detour!
        const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${startLocation.lng},${startLocation.lat};${destination.lng},${destination.lat}?geometries=geojson&steps=true&overview=full&access_token=${MAPBOX_TOKEN}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs[0]; // assuming single destination

          setNavState({
            isActive: true,
            routeGeoJSON: route.geometry,
            steps: leg.steps,
            currentStepIndex: 0, // Start at the first step
            totalDistance: route.distance,
            totalDuration: route.duration,
            etaText: Math.ceil(route.duration / 60) + ' min',
            distanceText: (route.distance / 1000).toFixed(1) + ' km',
          });
        } else {
          setError('No route found');
        }
      } catch (err) {
        console.error('Failed to fetch navigation route:', err);
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [startLocation?.lat, startLocation?.lng, destination?.lat, destination?.lng, profile]);

  return { ...navState, loading, error };
}
