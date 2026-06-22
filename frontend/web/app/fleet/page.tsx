"use client";

import { useState } from 'react';
import { FleetMapComponent } from '@/components/map/FleetMap';
import { BikeCard } from '@/components/bikes/BikeCard';
import { useFleetSocket } from '@/hooks/useFleetSocket';

export default function FleetMapPage() {
  const [mapView, setMapView] = useState(true);
  const { bikes, connected } = useFleetSocket({});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Live Fleet</h1>
          <p className="text-slate-400">Real-time bike tracking and management</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm text-slate-400">{connected ? 'Live' : 'Offline'}</span>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-1 flex">
            <button
              onClick={() => setMapView(true)}
              className={`px-4 py-2 rounded transition-colors ${mapView ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Map
            </button>
            <button
              onClick={() => setMapView(false)}
              className={`px-4 py-2 rounded transition-colors ${!mapView ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              List ({bikes.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {mapView ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden" style={{ height: '600px' }}>
          <FleetMapComponent />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bikes.map((bike) => (
            <BikeCard key={bike.id} bike={bike} />
          ))}
          {bikes.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">
              <p>No bikes available. Check your connection.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
