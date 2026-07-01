import { useState, useEffect } from 'react';

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

// Google Polyline Decoder to GeoJSON LineString
function decodePolyline(encoded: string) {
  let index = 0, lat = 0, lng = 0, coordinates = [];
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }
  return { type: 'LineString', coordinates };
}

export function useNavigationEngine(
  startLocation: { lat: number; lng: number } | null,
  destination: { lat: number; lng: number } | null,
  profile: NavigationProfile = 'walking'
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
      setNavState(prev => ({ ...prev, isActive: false, routeGeoJSON: null }));
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      setError(null);
      try {
        // Map our profiles to Google's profiles
        // Note: Google Maps does NOT support 'bicycling' mode in Nigeria/Africa. 
        // We map our 'cycling' profile to 'driving' so the scooter can use the standard road network.
        let googleMode = 'walking';
        if (profile === 'cycling') googleMode = 'driving'; 
        if (profile === 'driving-traffic') googleMode = 'driving';

        const originStr = `${startLocation.lat},${startLocation.lng}`;
        const destStr = `${destination.lat},${destination.lng}`;
        const url = `/api/directions?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&mode=${googleMode}`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs[0];
          
          // Convert Google steps to our format
          const mappedSteps: RouteStep[] = leg.steps.map((s: any) => {
            const rawInstruction = s.html_instructions.replace(/<[^>]+>/g, ' '); // Strip HTML tags safely
            return {
              distance: s.distance.value,
              duration: s.duration.value,
              geometry: decodePolyline(s.polyline.points),
              name: rawInstruction,
              maneuver: {
                instruction: rawInstruction,
                type: s.maneuver || 'straight',
                modifier: s.maneuver ? s.maneuver.replace(/-/g, ' ') : 'straight',
                location: [s.start_location.lng, s.start_location.lat]
              }
            };
          });

          setNavState({
            isActive: true,
            routeGeoJSON: decodePolyline(route.overview_polyline.points),
            steps: mappedSteps,
            currentStepIndex: 0,
            totalDistance: leg.distance.value,
            totalDuration: leg.duration.value,
            etaText: leg.duration.text,
            distanceText: leg.distance.text,
          });
        } else {
          setError(data.error || 'No route found');
        }
      } catch (err) {
        console.error('Failed to fetch navigation route from Google API:', err);
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [startLocation?.lat, startLocation?.lng, destination?.lat, destination?.lng, profile]);

  return { ...navState, loading, error };
}
