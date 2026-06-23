import { useState, useEffect } from 'react';

export interface Dock {
  id: string;
  name: string;
  lat: number;
  lng: number;
  availableSlots: number;
  distanceKm: number;
}

export function useNearbyDocks(lat?: number, lng?: number) {
  const [docks, setDocks] = useState<Dock[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;

    const fetchDocks = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/proxy/fleet/docks/nearby?lat=${lat}&lng=${lng}&radius=10`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setDocks(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch nearby docks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocks();
    
    // Poll every 30 seconds since dock availability changes
    const interval = setInterval(fetchDocks, 30000);
    return () => clearInterval(interval);
  }, [lat, lng]);

  return { docks, loading };
}
