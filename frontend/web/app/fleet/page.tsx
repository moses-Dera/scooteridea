'use client';

import { useState, useEffect } from 'react';
import { FleetMapComponent } from '@/components/map/FleetMap';
import { BikeCard } from '@/components/bikes/BikeCard';
import { useFleetSocket } from '@/hooks/useFleetSocket';

export default function FleetMapPage() {
  const [showList, setShowList] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [historicalRoute, setHistoricalRoute] = useState<{ lat: number; lng: number }[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  const { bikes, connected, error } = useFleetSocket({});

  const handleSelectBike = (bikeId: string | null) => {
    setSelectedBikeId(bikeId);
    setHistoricalRoute([]);
    if (bikeId) setShowList(false); // Auto-hide list when a bike is picked to see the map
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/proxy/rides/all-history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (data.success && data.data) {
        setHistoryItems(data.data.items || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectHistory = (ride: any) => {
    setSelectedBikeId(null);
    if (ride.routeGeometry && ride.routeGeometry.length > 0) {
      setHistoricalRoute(ride.routeGeometry);
      setShowList(false);
    } else {
      alert('No GPS route data available for this ride.');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] -m-4 md:-m-8 relative">
      {/* Header overlaid on top */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="bg-slate-900/80 backdrop-blur p-3 md:p-4 rounded-xl border border-slate-700 shadow-xl">
            <div className="text-lg md:text-2xl font-bold text-white">Live Fleet</div>
          </div>

          <div className="flex flex-col items-end gap-2 ml-auto">
            <div className="bg-slate-900/80 backdrop-blur px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-slate-700 flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
              ></div>
              <span className="text-xs md:text-sm font-medium text-slate-300">
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>

            <button
              onClick={() => setShowList(!showList)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-sm md:text-base font-medium shadow-lg transition-all"
            >
              {showList ? 'Hide Dashboard' : `Open Dashboard`}
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Area (Always Rendered) */}
      <div className="relative flex-1 bg-slate-900 overflow-hidden">
        <FleetMapComponent
          bikes={bikes}
          connected={connected}
          error={error}
          selectedBikeId={selectedBikeId}
          onSelectBikeId={handleSelectBike}
          historicalRoute={historicalRoute}
        />

        {/* Slide-over List Drawer */}
        <div
          className={`absolute top-0 right-0 bottom-0 w-full md:w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 shadow-2xl transition-transform duration-300 ease-in-out z-20 flex flex-col ${
            showList ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-slate-700 bg-slate-800">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-white">Dashboard</h2>
              <button
                onClick={() => setShowList(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex bg-slate-900 rounded-lg p-1">
              <button
                className={`flex-1 py-1.5 text-sm font-medium rounded-md ${activeTab === 'live' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                onClick={() => {
                  setActiveTab('live');
                  setHistoricalRoute([]);
                }}
              >
                Live Fleet ({bikes.length})
              </button>
              <button
                className={`flex-1 py-1.5 text-sm font-medium rounded-md ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                onClick={() => {
                  setActiveTab('history');
                  setSelectedBikeId(null);
                  fetchHistory();
                }}
              >
                Ride History
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'live' ? (
              <>
                {bikes.map((bike) => (
                  <BikeCard key={bike.id} bike={bike} onSelect={() => handleSelectBike(bike.id)} />
                ))}
                {bikes.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <p>No bikes available.</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {historyItems.map((ride) => (
                  <div
                    key={ride.id}
                    onClick={() => handleSelectHistory(ride)}
                    className="cursor-pointer transition-transform hover:scale-[1.02] bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">
                        RIDE • {ride.id.substring(0, 8)}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${ride.status === 'COMPLETED' ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300'}`}
                      >
                        {ride.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-lg font-bold text-white">
                          ₦{((ride.fareCents || 0) / 100).toFixed(0)}
                        </p>
                        <p className="text-sm text-slate-400">
                          {ride.distanceKm ? ride.distanceKm.toFixed(2) : 0} km
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">
                          {new Date(ride.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(ride.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {historyItems.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <p>No history available.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
