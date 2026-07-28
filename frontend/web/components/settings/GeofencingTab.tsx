import React, { useMemo } from 'react';
import { FiX, FiMapPin, FiTrash2, FiEdit2 } from 'react-icons/fi';
import Map, { Source, Layer, Marker } from 'react-map-gl';
import DrawControl from '../map/DrawControl';

interface GeofencingTabProps {
  mapboxToken?: string;
  zones: any[];
  heatmapGeoJson: any;
  showHeatmap: boolean;
  setShowHeatmap: (v: boolean) => void;
  newZoneData: { name: string; type: string; speed_limit_kmh: string };
  setNewZoneData: (v: any) => void;
  drawnGeometry: any;
  setDrawnGeometry: (v: any) => void;
  handleCreateZone: () => void;
  handleDeleteZone: (id: string) => void;
}

export default function GeofencingTab({
  mapboxToken,
  zones,
  heatmapGeoJson,
  showHeatmap,
  setShowHeatmap,
  newZoneData,
  setNewZoneData,
  drawnGeometry,
  setDrawnGeometry,
  handleCreateZone,
  handleDeleteZone,
}: GeofencingTabProps) {
  const geoJsonZones = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: zones.map((z) => ({
        type: 'Feature',
        geometry: z.boundary, // The backend now stores raw Polygon GeoJSON here
        properties: { id: z.id, type: z.type, name: z.name },
      })),
    };
  }, [zones]);
  const onDrawUpdate = (e: any) => {
    if (e.features && e.features.length > 0) {
      setDrawnGeometry(e.features[0].geometry);
    }
  };

  const onDrawDelete = () => {
    setDrawnGeometry(null);
  };

  return (
    <div className="min-h-[600px] md:h-[600px] flex flex-col md:flex-row gap-4">
      {/* Map Area */}
      <div className="flex-1 rounded-xl overflow-hidden border border-white/10 relative min-h-[400px] md:min-h-0">
        {!mapboxToken ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
            Missing NEXT_PUBLIC_MAPBOX_TOKEN
          </div>
        ) : (
          <Map
            mapboxAccessToken={mapboxToken}
            initialViewState={{ longitude: 3.3792, latitude: 6.5244, zoom: 11 }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            cursor={drawnGeometry ? 'default' : 'crosshair'}
          >
            <DrawControl
              position="top-right"
              onCreate={onDrawUpdate}
              onUpdate={onDrawUpdate}
              onDelete={onDrawDelete}
              displayControlsDefault={false}
              controls={{
                polygon: true,
                trash: true,
              }}
            />
            {/* Existing Zones */}
            <Source id="zones" type="geojson" data={geoJsonZones as any}>
              <Layer
                id="zones-fill"
                type="fill"
                paint={{
                  'fill-color': [
                    'match',
                    ['get', 'type'],
                    'operational',
                    '#22c55e',
                    'slow',
                    '#eab308',
                    'no_ride',
                    '#ef4444',
                    'dock',
                    '#3b82f6',
                    '#ffffff',
                  ],
                  'fill-opacity': 0.2,
                }}
              />
              <Layer
                id="zones-line"
                type="line"
                paint={{
                  'line-color': [
                    'match',
                    ['get', 'type'],
                    'operational',
                    '#22c55e',
                    'slow',
                    '#eab308',
                    'no_ride',
                    '#ef4444',
                    'dock',
                    '#3b82f6',
                    '#ffffff',
                  ],
                  'line-width': 2,
                }}
              />
            </Source>

            {/* Preview New Zone (handled by DrawControl natively) */}

            {/* Heatmap Layer */}
            {showHeatmap && heatmapGeoJson && (
              <Source id="heatmap-source" type="geojson" data={heatmapGeoJson as any}>
                <Layer
                  id="heatmap-layer"
                  type="heatmap"
                  paint={{
                    'heatmap-weight': 1,
                    'heatmap-intensity': 1,
                    'heatmap-color': [
                      'interpolate',
                      ['linear'],
                      ['heatmap-density'],
                      0,
                      'rgba(33,102,172,0)',
                      0.2,
                      'rgb(103,169,207)',
                      0.4,
                      'rgb(209,229,240)',
                      0.6,
                      'rgb(253,219,199)',
                      0.8,
                      'rgb(239,138,98)',
                      1,
                      'rgb(178,24,43)',
                    ],
                    'heatmap-radius': 15,
                    'heatmap-opacity': 0.7,
                  }}
                />
              </Source>
            )}

            {/* User Location could go here */}
          </Map>
        )}

        {/* Instructions Overlay */}
        {!drawnGeometry && (
          <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur text-white px-4 py-2 rounded-lg border border-white/10 shadow-xl pointer-events-none text-sm">
            Draw a custom polygon to create a new zone.
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        {!drawnGeometry && (
          <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white">Heatmap Data</h3>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Show Zone Transitions</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={(e) => setShowHeatmap(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        )}
        {drawnGeometry ? (
          <div className="glass-panel p-4 rounded-xl border border-primary/50 bg-primary/5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white">Create New Zone</h3>
              <button
                onClick={() => {
                  setDrawnGeometry(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <FiX />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <input
                type="text"
                value={newZoneData.name}
                onChange={(e) => setNewZoneData({ ...newZoneData, name: e.target.value })}
                className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white w-full outline-none focus:border-primary"
                placeholder="Zone Name"
              />
              <div>
                <label className="text-slate-400 block mb-1">Type</label>
                <select
                  value={newZoneData.type}
                  onChange={(e) => setNewZoneData({ ...newZoneData, type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-primary"
                >
                  <option value="operational">Operational (Green)</option>
                  <option value="slow">Slow Zone (Yellow)</option>
                  <option value="no_ride">No Ride Zone (Red)</option>
                  <option value="dock">Parking Dock (Blue)</option>
                </select>
              </div>
              {newZoneData.type === 'slow' && (
                <div>
                  <label className="text-xs text-slate-400">Speed Limit (km/h)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-2 text-white"
                    placeholder="e.g. 15 (Optional)"
                    value={newZoneData.speed_limit_kmh}
                    onChange={(e) => setNewZoneData({ ...newZoneData, speed_limit_kmh: e.target.value })}
                  />
                </div>
              )}
              <button
                onClick={handleCreateZone}
                disabled={!drawnGeometry || !newZoneData.name}
                className="w-full mt-4 bg-primary text-black font-bold py-2 rounded-lg hover:bg-primary-hover disabled:opacity-50"
              >
                Create Zone
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-4 rounded-xl border border-white/10 flex-1 overflow-y-auto">
            <h3 className="font-bold text-white mb-4">Active Zones ({zones.length})</h3>
            <div className="space-y-3">
              {zones.map((z) => (
                <div
                  key={z.id}
                  className="bg-slate-900/50 p-3 rounded border border-white/5 flex justify-between items-start"
                >
                  <div>
                    <div className="font-medium text-white text-sm">{z.name}</div>
                    <div
                      className={`text-xs mt-1 uppercase ${z.type === 'operational' ? 'text-green-400' : z.type === 'no_ride' ? 'text-red-400' : z.type === 'dock' ? 'text-blue-400' : 'text-yellow-400'}`}
                    >
                      {z.type}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteZone(z.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
              {zones.length === 0 && (
                <div className="text-slate-500 text-sm text-center py-4">No zones exist.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
