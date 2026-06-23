"use client";

import { useState } from 'react';
import { FleetMapComponent } from '@/components/map/FleetMap';
import { BikeCard } from '@/components/bikes/BikeCard';
import { useFleetSocket } from '@/hooks/useFleetSocket';

export default function FleetMapPage() {
  const [showList, setShowList] = useState(false);
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const { bikes, connected, error } = useFleetSocket({});

  const handleSelectBike = (bikeId: string | null) => {
    setSelectedBikeId(bikeId);
    if (bikeId) setShowList(false); // Auto-hide list when a bike is picked to see the map
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -m-4 md:-m-8">
      {/* Header overlaid on top */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="bg-slate-900/80 backdrop-blur p-4 rounded-xl border border-slate-700 shadow-xl">
            <div className="text-2xl font-bold text-white">Live Fleet</div>
            <p className="text-sm text-slate-400">Real-time tracking & zones</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="bg-slate-900/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-slate-300">{connected ? 'Live' : 'Offline'}</span>
            </div>
            
            <button
              onClick={() => setShowList(!showList)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg transition-all"
            >
              {showList ? 'Hide List' : `Fleet List (${bikes.length})`}
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
        />

        {/* Slide-over List Drawer */}
        <div 
          className={`absolute top-0 right-0 bottom-0 w-full md:w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 shadow-2xl transition-transform duration-300 ease-in-out z-20 flex flex-col ${
            showList ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
            <h2 className="text-lg font-bold text-white">Fleet Directory</h2>
            <button onClick={() => setShowList(false)} className="text-slate-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {bikes.map((bike) => (
              <div key={bike.id} onClick={() => handleSelectBike(bike.id)} className="cursor-pointer transition-transform hover:scale-[1.02]">
                <BikeCard bike={bike} />
              </div>
            ))}
            {bikes.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p>No bikes available.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
