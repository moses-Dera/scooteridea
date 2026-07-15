'use client';

import { useEffect, useState, useCallback } from 'react';

interface Bike {
  id: string;
  lat: number;
  lng: number;
  battery_pct: number;
  status: string;
  speed_kmh: number;
  lock_status: string;
}

interface UseFleetSocketProps {
  onBikeUpdate?: (bike: Bike) => void;
  onBikesUpdate?: (bikes: Bike[]) => void;
  zones?: string[];
}

export function useFleetSocket({ onBikeUpdate, onBikesUpdate, zones }: UseFleetSocketProps) {
  const [bikes, setBikes] = useState<Map<string, Bike>>(new Map());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBikesUpdate = useCallback(
    (updatedBikes: Bike[]) => {
      setBikes((prevBikes) => {
        const newMap = new Map(prevBikes);
        updatedBikes.forEach((bike) => newMap.set(bike.id, bike));
        return newMap;
      });
      if (onBikesUpdate) onBikesUpdate(updatedBikes);
    },
    [onBikesUpdate],
  );

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let isMounted = true;

    const pollFleet = async () => {
      if (!isMounted) return;
      try {
        const res = await fetch(`/api/proxy/fleet/bikes`);
        if (!isMounted) return;
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            handleBikesUpdate(json.data);
            setConnected(true);
            setError(null);
          }
        } else {
          setConnected(false);
          setError(`HTTP Error: ${res.status}`);
        }
      } catch (err) {
        if (!isMounted) return;
        setConnected(false);
        setError('Network Error fetching fleet data');
      }
    };

    // Fetch immediately on mount
    pollFleet();

    // Then poll every 3 seconds
    interval = setInterval(pollFleet, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [handleBikesUpdate]);

  return {
    bikes: Array.from(bikes.values()),
    bikesMap: bikes,
    connected,
    error,
  };
}
