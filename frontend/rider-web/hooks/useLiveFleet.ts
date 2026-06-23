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
            setBikes(json.data.map((b: any) => ({
              id: b.id,
              lat: b.location.lat,
              lng: b.location.lng,
              batteryPct: b.batteryPct,
              status: b.status
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
