'use client';

import { useEffect, useState } from 'react';

interface DockSlot {
  id: string;
  bike_id: string | null;
  charging: boolean;
  available: boolean;
}

interface Dock {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  total_slots: number;
  available_slots: number;
  slots: DockSlot[];
}

export function DockGridComponent() {
  const [docks, setDocks] = useState<Dock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDock, setSelectedDock] = useState<Dock | null>(null);

  useEffect(() => {
    const fetchDocks = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const token = localStorage.getItem('token') || '';
        const res = await fetch(`${baseUrl}/api/proxy/fleet/docks`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) throw new Error(`Failed to fetch docks: ${res.statusText}`);

        const data = await res.json();
        setDocks(data.success && data.data ? data.data : Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch docks');
      } finally {
        setLoading(false);
      }
    };

    fetchDocks();
    const interval = setInterval(fetchDocks, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-slate-400">Loading docks...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;
  if (!docks.length) return <div className="text-slate-400">No docks found</div>;

  return (
    <div className="space-y-6">
      {/* Dock cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docks.map((dock) => {
          const capacityPct = (dock.available_slots / dock.total_slots) * 100;
          const capacityColor =
            capacityPct > 50 ? 'bg-green-600' : capacityPct > 20 ? 'bg-yellow-600' : 'bg-red-600';

          return (
            <div
              key={dock.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4 cursor-pointer hover:border-slate-600 transition-all"
              onClick={() => setSelectedDock(dock)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold text-white">{dock.name}</div>
                  <p className="text-xs text-slate-400">{dock.location}</p>
                </div>
                <div className={`${capacityColor} px-3 py-1 rounded text-white text-sm font-bold`}>
                  {dock.available_slots}/{dock.total_slots}
                </div>
              </div>

              {/* Capacity bar */}
              <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
                <div
                  className={`${capacityColor} h-2 rounded-full transition-all`}
                  style={{ width: `${capacityPct}%` }}
                ></div>
              </div>

              {/* Slot grid preview */}
              <div className="grid grid-cols-6 gap-1">
                {dock.slots?.slice(0, 12).map((slot) => (
                  <div
                    key={slot.id}
                    className={`aspect-square rounded text-xs flex items-center justify-center font-bold cursor-pointer transition-colors ${
                      slot.available
                        ? 'bg-green-600 text-white'
                        : slot.charging
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-400'
                    }`}
                    title={`Slot ${slot.id}: ${slot.available ? 'Empty' : slot.charging ? 'Charging' : 'Occupied'}`}
                  >
                    {slot.bike_id ? '✓' : slot.charging ? '⚡' : ''}
                  </div>
                ))}
              </div>

              {dock.slots && dock.slots.length > 12 && (
                <p className="text-xs text-slate-400 mt-2">+{dock.slots.length - 12} more slots</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected dock details */}
      {selectedDock && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-2xl font-bold text-white">{selectedDock.name}</div>
              <p className="text-slate-400">{selectedDock.location}</p>
            </div>
            <button
              onClick={() => setSelectedDock(null)}
              className="text-slate-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-700 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-sm">Total Slots</p>
              <p className="text-2xl font-bold text-white">{selectedDock.total_slots}</p>
            </div>
            <div className="bg-green-900 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-sm">Available</p>
              <p className="text-2xl font-bold text-green-400">{selectedDock.available_slots}</p>
            </div>
            <div className="bg-blue-900 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-sm">Charging</p>
              <p className="text-2xl font-bold text-blue-400">
                {selectedDock.slots?.filter((s) => s.charging).length || 0}
              </p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3 text-center">
              <p className="text-slate-400 text-sm">In Use</p>
              <p className="text-2xl font-bold text-slate-300">
                {selectedDock.slots?.filter((s) => s.bike_id && !s.charging).length || 0}
              </p>
            </div>
          </div>

          {/* Full slot grid */}
          <div>
            <div className="font-bold text-white mb-3">All Slots</div>
            <div className="grid grid-cols-10 gap-2">
              {selectedDock.slots?.map((slot) => (
                <div
                  key={slot.id}
                  className={`aspect-square rounded-lg flex items-center justify-center font-bold text-sm cursor-pointer transition-all hover:scale-110 ${
                    slot.available
                      ? 'bg-green-600 text-white'
                      : slot.charging
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-400'
                  }`}
                  title={`${slot.id}: ${slot.available ? 'Empty' : slot.charging ? 'Charging' : 'Occupied'}`}
                >
                  {slot.available ? '○' : slot.charging ? '⚡' : '●'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
