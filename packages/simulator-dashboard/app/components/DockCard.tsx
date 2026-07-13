'use client';

import { DockData } from '@/app/lib/mqtt-client';

interface DockCardProps {
  dock: DockData;
}

export function DockCard({ dock }: DockCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{dock.name}</h3>
          <p className="text-sm text-gray-600">{dock.dock_id}</p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            dock.available_slots > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {dock.available_slots}/{dock.total_slots} slots
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm text-gray-700">
        <div>
          📍 {dock.lat.toFixed(4)}, {dock.lng.toFixed(4)}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700 mb-2">Slots:</p>
        <div className="grid grid-cols-4 gap-2">
          {dock.slots.map((slot) => (
            <div
              key={slot.slot}
              className={`p-2 rounded text-center text-xs font-medium ${
                slot.bike_id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="font-semibold">#{slot.slot}</div>
              {slot.bike_id ? (
                <>
                  <div className="text-xs">{slot.bike_id}</div>
                  {slot.charging && <div className="text-xs">⚡</div>}
                  {slot.battery_pct !== null && (
                    <div className="text-xs mt-1">{slot.battery_pct}%</div>
                  )}
                </>
              ) : (
                <div className="text-xs">Empty</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3">{dock.timestamp}</p>
    </div>
  );
}
