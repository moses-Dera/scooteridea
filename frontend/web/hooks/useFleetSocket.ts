'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

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
  const { data: session } = useSession();
  const [bikes, setBikes] = useState<Map<string, Bike>>(new Map());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bikesMap = useRef<Map<string, Bike>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);

  const getTokenExpiryMs = (token: string): number | null => {
    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) return null;
      const payload = JSON.parse(atob(payloadBase64));
      if (typeof payload.exp !== 'number') return null;
      return payload.exp * 1000;
    } catch {
      return null;
    }
  };

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
        const token = (session as any)?.accessToken || '';
        const res = await fetch(`/api/proxy/fleet/bikes`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
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
    if (session) {
      fetchInitialFleet();
    }
    return () => {
      isMounted = false;
    };
  }, [handleBikesUpdate, session]);

  // 2. Real-time WebSocket connection
  useEffect(() => {
    const token = (session as any)?.accessToken;
    if (!token) return;

    const tokenExpiryMs = getTokenExpiryMs(token);
    const isExpiredOrNearExpiry =
      tokenExpiryMs !== null && Date.now() >= tokenExpiryMs - 15 * 1000;
    if (isExpiredOrNearExpiry) {
      setConnected(false);
      setError('Session expired. Re-authenticating...');
      return;
    }

    let reconnectTimeout: NodeJS.Timeout;

    const canConnect = () => {
      const exp = getTokenExpiryMs(token);
      return exp === null || Date.now() < exp - 15 * 1000;
    };

    const connect = () => {
      if (!canConnect()) {
        setConnected(false);
        setError('Session expired. Re-authenticating...');
        return;
      }

      try {
        let wsUrl = process.env.NEXT_PUBLIC_WS_URL || '';
        if (!wsUrl) {
          let apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
          if (!apiUrl) {
             const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
             wsUrl = `${proto}://${window.location.host}/live`;
          } else {
             const proto = apiUrl.startsWith('https') ? 'wss' : 'ws';
             const host = apiUrl.replace(/^https?:\/\//, '');
             wsUrl = `${proto}://${host}/live`;
          }
        } else if (wsUrl.startsWith('ss://')) {
          wsUrl = wsUrl.replace('ss://', 'wss://');
        } else if (wsUrl.startsWith('http://')) {
          wsUrl = wsUrl.replace('http://', 'ws://');
        } else if (wsUrl.startsWith('https://')) {
          wsUrl = wsUrl.replace('https://', 'wss://');
        }
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
                lock_status: msg.lockStatus ?? current?.lock_status ?? 'LOCKED',
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

        ws.onclose = (event) => {
          setConnected(false);

          // 4001/4003 from WS hub are auth-related; wait for token refresh instead of retry storm.
          if (event.code === 4001 || event.code === 4003) {
            setError('Authentication expired. Reconnecting after refresh...');
            return;
          }

          if (!canConnect()) {
            setError('Session expired. Re-authenticating...');
            return;
          }

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
  }, [onBikeUpdate, session]);

  return {
    bikes: Array.from(bikes.values()),
    bikesMap: bikes,
    connected,
    error,
  };
}
