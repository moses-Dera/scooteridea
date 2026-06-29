import { useEffect, useState } from 'react';

export interface LiveBike {
  id: string;
  lat: number;
  lng: number;
  batteryPct: number;
  status: string;
}

export function useLiveFleet(lat?: number, lng?: number, radius: number = 2) {
  const [bikes, setBikes] = useState<LiveBike[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;

    const fetchNearbyBikes = async () => {
      try {
        const res = await fetch(`/api/proxy/fleet/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            // DEMO MODE AUTOMATION:
            // If the map is empty, ask the backend to dynamically spawn a fleet around the user!
            if (json.data.length === 0 && !window.sessionStorage.getItem(`demo_spawned_${lat.toFixed(2)}_${lng.toFixed(2)}`)) {
              window.sessionStorage.setItem(`demo_spawned_${lat.toFixed(2)}_${lng.toFixed(2)}`, 'true');
              console.log('🌍 Activating Dynamic Demo Mode: Requesting Fleet Spawn...');
              fetch('/api/proxy/fleet/demo/spawn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lng, count: 12, radius: radius * 0.8 })
              });
              // The backend will start streaming telemetry in ~1 second, the next poll will pick them up!
            }

            setBikes(json.data.map((b: any) => ({
              id: b.bikeId,
              lat: b.lat,
              lng: b.lng,
              batteryPct: b.battery_pct,
              status: b.status || 'available' // Nearby only returns available bikes anyway
            })));
            setIsConnected(true);
          }
        } else {
          setIsConnected(false);
        }
      } catch (err) {
        console.error('Failed to fetch nearby bikes:', err);
        setIsConnected(false);
      }
    };

    // Initial fetch
    fetchNearbyBikes();

    // Poll every 5 seconds for pseudo-live updates
    const interval = setInterval(fetchNearbyBikes, 5000);
    
    return () => clearInterval(interval);
  }, [lat, lng, radius]);

  return {
    bikes,
    isConnected,
  };
}
