import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface LiveBike {
  id: string;
  lat: number;
  lng: number;
  batteryPct: number;
  status: string;
}

export function useLiveFleet(lat?: number, lng?: number, radius: number = 2) {
  const { data: session } = useSession();
  const [bikes, setBikes] = useState<LiveBike[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const bikesMap = useRef<Map<string, LiveBike>>(new Map());
  const subscribedBikes = useRef<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);

  // 1. WebSocket Connection Lifecycle
  useEffect(() => {
    const token = (session as any)?.accessToken;
    if (!token) return;

    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3008';
        const ws = new WebSocket(`${wsUrl}?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          // Re-subscribe to everything we know about if we disconnected
          const toSubscribe = Array.from(subscribedBikes.current).map(id => `bike:${id}`);
          if (toSubscribe.length > 0) {
            ws.send(JSON.stringify({ subscribe: toSubscribe }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'bike_location_update') {
              const current = bikesMap.current.get(msg.bikeId);
              const updated = {
                id: msg.bikeId,
                lat: msg.lat,
                lng: msg.lng,
                batteryPct: msg.battery ?? current?.batteryPct ?? 100,
                status: msg.status ?? current?.status ?? 'available'
              };
              bikesMap.current.set(msg.bikeId, updated);
              
              // Trigger React render so the bikes physically glide on the Map!
              setBikes(Array.from(bikesMap.current.values()));
            }
          } catch (err) {
            console.error('Failed to parse WS message:', err);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        console.error('WS Connection Error:', err);
      }
    };

    connect();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [session]);

  // 2. HTTP Fetch for new areas when map moves
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;

    const fetchNearbyBikes = async () => {
      try {
        const res = await fetch(`/api/proxy/fleet/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            
            // Demo mode logic
            if (json.data.length === 0 && !window.sessionStorage.getItem(`demo_spawned_${lat.toFixed(2)}_${lng.toFixed(2)}`)) {
              window.sessionStorage.setItem(`demo_spawned_${lat.toFixed(2)}_${lng.toFixed(2)}`, 'true');
              fetch('/api/proxy/fleet/demo/spawn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lng, count: 12, radius: radius * 0.8 })
              });
            }

            const newSubscriptions: string[] = [];

            json.data.forEach((b: any) => {
              const bike = {
                id: b.bikeId,
                lat: b.lat,
                lng: b.lng,
                batteryPct: b.battery_pct,
                status: b.status || 'available'
              };
              
              // Only add if not already in our Map to prevent jumpy overwrites of live WS data
              if (!bikesMap.current.has(bike.id)) {
                bikesMap.current.set(bike.id, bike);
              }

              // Queue up WS subscription if we haven't subbed yet
              if (!subscribedBikes.current.has(bike.id)) {
                subscribedBikes.current.add(bike.id);
                newSubscriptions.push(`bike:${bike.id}`);
              }
            });

            // If we found new bikes, subscribe to them on the active WebSocket!
            if (newSubscriptions.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ subscribe: newSubscriptions }));
            }

            setBikes(Array.from(bikesMap.current.values()));
          }
        }
      } catch (err) {
        console.error('Failed to fetch nearby bikes:', err);
      }
    };

    // We only fetch once per location change now! WS handles the rest.
    fetchNearbyBikes();
  }, [lat, lng, radius]);

  return { bikes, isConnected };
}
