import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface LiveBike {
  id: string;
  lat: number;
  lng: number;
  battery: number;
  surge: number;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3008';

export function useLiveFleet() {
  const [bikes, setBikes] = useState<Record<string, LiveBike>>({});
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Connect to WebSocket Hub (Nginx API Gateway automatically routes this to websocket-hub)
    const newSocket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: true,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to Live Fleet WebSocket');
      // Subscribe to all fleet updates in the local geohash area
      newSocket.emit('subscribe:fleet', { lat: 6.5244, lng: 3.3792, radius: 10 });
    });

    // Handle high-frequency GPS telemetry streams
    newSocket.on('LocationUpdated', (data: { bikeId: string, lat: number, lng: number }) => {
      setBikes(prev => ({
        ...prev,
        [data.bikeId]: {
          // Preserve existing battery/surge if available, otherwise set defaults
          ...(prev[data.bikeId] || { id: data.bikeId, battery: 100, surge: 1.0 }),
          lat: data.lat,
          lng: data.lng
        }
      }));
    });

    // Handle low-frequency status changes (battery drops, dynamic surge pricing)
    newSocket.on('BikeStatusChanged', (data: { bikeId: string, battery: number, surge: number }) => {
      setBikes(prev => {
        const existing = prev[data.bikeId];
        if (!existing) return prev; // Wait for location ping before tracking
        return {
          ...prev,
          [data.bikeId]: {
            ...existing,
            battery: data.battery,
            surge: data.surge
          }
        };
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Live Fleet WebSocket');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return {
    // Convert dictionary back to array for Mapbox rendering
    bikes: Object.values(bikes),
    isConnected: socket?.connected || false,
  };
}
