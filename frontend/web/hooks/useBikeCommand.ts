"use client";

import { useState } from 'react';

export type BikeCommand = 'LOCK' | 'UNLOCK' | 'ALARM' | 'DISABLE' | 'SPEED_LIMIT';

interface CommandResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export function useBikeCommand() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCommand = async (bikeId: string, command: BikeCommand, params?: Record<string, any>): Promise<CommandResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3002/fleet/bikes/${bikeId}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`,
        },
        body: JSON.stringify({
          command,
          ...params,
          ts: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Command failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const lock = (bikeId: string) => sendCommand(bikeId, 'LOCK');
  const unlock = (bikeId: string) => sendCommand(bikeId, 'UNLOCK');
  const alarm = (bikeId: string) => sendCommand(bikeId, 'ALARM');
  const disable = (bikeId: string) => sendCommand(bikeId, 'DISABLE');

  return { sendCommand, lock, unlock, alarm, disable, loading, error };
}
