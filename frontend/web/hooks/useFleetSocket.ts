"use client";

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

  const handleBikeUpdate = useCallback((bike: Bike) => {
    setBikes(prev => new Map(prev).set(bike.id, bike));
    if (onBikeUpdate) onBikeUpdate(bike);
  }, [onBikeUpdate]);

  const handleBikesUpdate = useCallback((updatedBikes: Bike[]) => {
    const newMap = new Map(bikes);
    updatedBikes.forEach(bike => newMap.set(bike.id, bike));
    setBikes(newMap);
    if (onBikesUpdate) onBikesUpdate(updatedBikes);
  }, [bikes, onBikesUpdate]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        const token = localStorage.getItem('token') || 'demo-token';
        ws = new WebSocket(`ws://localhost:3008/live?token=${token}`);

        ws.onopen = () => {
          setConnected(true);
          setError(null);
          
          const subscriptions = ['dock:all'];
          if (zones && zones.length > 0) {
            zones.forEach(z => subscriptions.push(`zone:${z}`));
          } else {
            subscriptions.push('fleet:all');
          }
          
          ws?.send(JSON.stringify({ subscribe: subscriptions }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.event === 'bike_location_update' && message.bike) {
              handleBikeUpdate(message.bike);
            } else if (message.event === 'fleet_update' && Array.isArray(message.bikes)) {
              handleBikesUpdate(message.bikes);
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        ws.onerror = () => {
          setError('WebSocket connection error');
          setConnected(false);
        };

        ws.onclose = () => {
          setConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        setError(`Connection failed: ${err}`);
      }
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [handleBikeUpdate, handleBikesUpdate]);

  return {
    bikes: Array.from(bikes.values()),
    bikesMap: bikes,
    connected,
    error,
  };
}
