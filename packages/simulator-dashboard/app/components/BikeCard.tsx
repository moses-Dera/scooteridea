'use client';

import { useState } from 'react';
import { BikeData } from '@/app/lib/mqtt-client';

interface BikeCardProps {
  bike: BikeData;
  onCommand: (bikeId: string, command: string) => void;
}

export function BikeCard({ bike, onCommand }: BikeCardProps) {
  const [loading, setLoading] = useState(false);

  const handleCommand = async (command: string) => {
    setLoading(true);
    onCommand(bike.bike_id, command);
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{bike.bike_id}</h3>
          <p className="text-sm text-gray-500">{bike.timestamp}</p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            bike.lock_status === 'UNLOCKED'
              ? 'bg-red-100 text-red-800'
              : 'bg-green-100 text-green-800'
          }`}
        >
          {bike.lock_status}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="text-gray-700">
          📍 {bike.lat.toFixed(4)}, {bike.lng.toFixed(4)}
        </div>
        <div className="text-gray-700">⚡ {bike.speed_kmh} km/h</div>
        <div className="text-gray-700">🔋 {bike.battery_pct.toFixed(1)}%</div>
        <div className="text-gray-700">
          {bike.docked_at ? `📌 ${bike.docked_at}` : 'Free roaming'}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleCommand('UNLOCK')}
          disabled={loading || bike.lock_status === 'UNLOCKED'}
          className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? '⏳' : '🔓'} Unlock
        </button>
        <button
          onClick={() => handleCommand('LOCK')}
          disabled={loading || bike.lock_status === 'LOCKED'}
          className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? '⏳' : '🔒'} Lock
        </button>
        <button
          onClick={() => handleCommand('ALARM')}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? '⏳' : '🔔'} Alarm
        </button>
        <button
          onClick={() => handleCommand('DISABLE')}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? '⏳' : '❌'} Disable
        </button>
      </div>
    </div>
  );
}
