"use client";

import { useState } from 'react';
import { useBikeCommand } from '@/hooks/useBikeCommand';
import { FaLock, FaUnlock, FaBell, FaXmark } from 'react-icons/fa6';

interface BikeCardProps {
  bike: {
    id: string;
    battery_pct: number;
    status: string;
    lat: number;
    lng: number;
    speed_kmh: number;
  };
  onSelect?: () => void;
}

export function BikeCard({ bike, onSelect }: BikeCardProps) {
  const { lock, unlock, alarm, disable, loading, error } = useBikeCommand();
  const [showDetails, setShowDetails] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);

  const handleCommand = async (action: () => Promise<any>) => {
    setCommandError(null);
    const result = await action();
    if (!result.success && result.error) {
      setCommandError(result.error);
    }
  };

  const statusColor = {
    'available': 'text-green-400',
    'in_use': 'text-red-400',
    'charging': 'text-blue-400',
    'maintenance': 'text-yellow-400',
  }[bike.status] || 'text-slate-400';

  const batteryColor = bike.battery_pct > 50 ? 'text-green-400' : bike.battery_pct > 20 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-all cursor-pointer" onClick={() => setShowDetails(!showDetails)}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-bold text-white">{bike.id}</div>
          <p className={`text-sm font-medium ${statusColor}`}>{bike.status}</p>
        </div>
        <div className={`text-right ${batteryColor}`}>
          <p className="text-sm text-slate-400">Battery</p>
          <p className="text-lg font-bold">{bike.battery_pct}%</p>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="space-y-3 mb-4 pb-4 border-b border-slate-700">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-slate-400">Location</p>
              <p className="text-white">{bike.lat.toFixed(4)}, {bike.lng.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-slate-400">Speed</p>
              <p className="text-white">{bike.speed_kmh} km/h</p>
            </div>
          </div>

          {/* Commands */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCommand(() => unlock(bike.id));
              }}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded text-sm transition-colors"
              title="Unlock bike"
            >
              <FaUnlock size={12} />
              Unlock
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCommand(() => lock(bike.id));
              }}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-600 text-white rounded text-sm transition-colors"
              title="Lock bike"
            >
              <FaLock size={12} />
              Lock
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCommand(() => alarm(bike.id));
              }}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 text-white rounded text-sm transition-colors"
              title="Trigger alarm"
            >
              <FaBell size={12} />
              Alarm
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCommand(() => disable(bike.id));
              }}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded text-sm transition-colors"
              title="Disable motor"
            >
              <FaXmark size={12} />
              Disable
            </button>
          </div>

          {commandError && (
            <p className="text-xs text-red-400">{commandError}</p>
          )}
        </div>
      )}

      {/* Quick stats */}
      <div className="flex justify-between text-xs text-slate-400">
        <span>Click for details</span>
        <span className={loading ? 'text-yellow-400' : ''}>{loading ? 'Sending...' : 'Ready'}</span>
      </div>
    </div>
  );
}
