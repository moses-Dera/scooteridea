'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

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

  const bikesMap = useRef<Map<string, Bike>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);

  const handleBikesUpdate = useCallback(
    (updatedBikes: Bike[]) => {
      setBikes((prevBikes) => {
        const newMap = new Map(prevBikes);
        updatedBikes.forEach((bike) => {
          newMap.set(bike.id, bike);
          bikesMap.current.set(bike.id, bike);
        });
        return newMap;
      });
      if (onBikesUpdate) onBikesUpdate(updatedBikes);
    },
    [onBikesUpdate],
  );

  // 1. Initial HTTP fetch to instantly populate map
  useEffect(() => {
    let isMounted = true;
    const fetchInitialFleet = async () => {
      try {
        const res = await fetch(`/api/proxy/fleet/bikes`);
        if (!isMounted) return;
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            handleBikesUpdate(json.data);
          }
        }
      } catch (err) {
        console.error('Initial fleet fetch failed', err);
      }
    };
    fetchInitialFleet();
    return () => {
      isMounted = false;
    };
  }, [handleBikesUpdate]);

  // 2. Real-time WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3008';
        const ws = new WebSocket(`${wsUrl}?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          setError(null);
          // Subscribe to ALL fleet updates since operators need the God-view
          ws.send(JSON.stringify({ subscribe: ['fleet:all'] }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'bike_location_update') {
              const current = bikesMap.current.get(msg.bikeId);
              const updatedBike: Bike = {
                id: msg.bikeId,
                lat: msg.lat,
                lng: msg.lng,
                battery_pct: msg.battery ?? current?.battery_pct ?? 100,
                status: msg.status ?? current?.status ?? 'available',
                speed_kmh: current?.speed_kmh ?? 0,
                lock_status: current?.lock_status ?? 'LOCKED',
              };

              bikesMap.current.set(msg.bikeId, updatedBike);

              // Batch updates using requestAnimationFrame
              requestAnimationFrame(() => {
                setBikes(new Map(bikesMap.current));
                if (onBikeUpdate) onBikeUpdate(updatedBike);
              });
            }
          } catch (err) {
            console.error('Failed to parse WS message:', err);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        setConnected(false);
        setError('Failed to connect to real-time socket');
      }
    };

    connect();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [onBikeUpdate]);

  return {
    bikes: Array.from(bikes.values()),
    bikesMap: bikes,
    connected,
    error,
  };
}
