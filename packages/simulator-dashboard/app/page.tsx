'use client';

import { useState, useEffect } from 'react';
import { BikeData, DockData } from '@/app/lib/mqtt-client';
import { BikeCard } from '@/app/components/BikeCard';
import { DockCard } from '@/app/components/DockCard';

export default function Dashboard() {
  const [bikes, setBikes] = useState<Record<string, BikeData>>({});
  const [docks, setDocks] = useState<Record<string, DockData>>({});
  const [connected, setConnected] = useState(false);
  const [brokerUrl, setBrokerUrl] = useState('ws://localhost:8884');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [newBikeId, setNewBikeId] = useState('');
  const [newDockName, setNewDockName] = useState('');
  const [newDockId, setNewDockId] = useState('');

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  const connectToDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const websocket = new WebSocket('ws://localhost:8885');

      websocket.onopen = () => {
        console.log('Connected to simulator API');
        setConnected(true);
        websocket.send(JSON.stringify({ action: 'get-status' }));
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.bikes) {
          setBikes(data.bikes);
        }
        if (data.docks) {
          setDocks(data.docks);
        }
        if (data.error) {
          setError(data.error);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error. Make sure the simulator API is running.');
        setConnected(false);
      };

      websocket.onclose = () => {
        setConnected(false);
      };

      setWs(websocket);
    } catch (err) {
      setError(String(err));
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const addBike = () => {
    if (!newBikeId.trim() || !ws) return;
    ws.send(JSON.stringify({ action: 'add-bike', bikeId: newBikeId }));
    setNewBikeId('');
  };

  const removeBike = (bikeId: string) => {
    if (!ws) return;
    ws.send(JSON.stringify({ action: 'remove-bike', bikeId }));
  };

  const addDock = () => {
    if (!newDockName.trim() || !newDockId.trim() || !ws) return;
    ws.send(JSON.stringify({ action: 'add-dock', dockId: newDockId, name: newDockName }));
    setNewDockName('');
    setNewDockId('');
  };

  const sendCommand = (bikeId: string, command: string) => {
    if (!ws) return;
    ws.send(JSON.stringify({ action: 'command', bikeId, command }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <header className="bg-gray-900 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              🚲
              <h1 className="text-3xl font-bold text-white">Simulator Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              {connected ? (
                <div className="flex items-center gap-2 text-green-400">
                  📡
                  <span>Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  ❌
                  <span>Disconnected</span>
                </div>
              )}
            </div>
          </div>

          {!connected && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-2">Broker URL</label>
                <input
                  type="text"
                  value={brokerUrl}
                  onChange={(e) => setBrokerUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="ws://localhost:8884"
                />
              </div>
              <button
                onClick={connectToDashboard}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 bg-red-500/20 border border-red-500/50 rounded px-3 py-2 text-red-200">
              ❌
              <p>{error}</p>
            </div>
          )}
        </div>
      </header>

      {connected && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Add New Bike */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              ➕
              Add New Bike
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newBikeId}
                onChange={(e) => setNewBikeId(e.target.value)}
                placeholder="e.g., BK-00011"
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={addBike}
                disabled={!newBikeId.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Add Bike
              </button>
            </div>
          </div>

          {/* Add New Dock */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              ➕
              Add New Dock
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDockId}
                onChange={(e) => setNewDockId(e.target.value)}
                placeholder="e.g., DOCK-008"
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={newDockName}
                onChange={(e) => setNewDockName(e.target.value)}
                placeholder="e.g., Central Park Station"
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={addDock}
                disabled={!newDockId.trim() || !newDockName.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Add Dock
              </button>
            </div>
          </div>

          {/* Bikes Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              🚲
              Fleet ({Object.keys(bikes).length} bikes)
            </h2>
            {Object.keys(bikes).length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400 border border-gray-700">
                <div className="text-6xl mx-auto mb-2">🚲</div>
                <p>No bikes connected yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(bikes).map((bike) => (
                  <div key={bike.bike_id} className="relative">
                    <BikeCard bike={bike} onCommand={sendCommand} />
                    <button
                      onClick={() => removeBike(bike.bike_id)}
                      className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Docks Section */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              📍
              Docking Stations ({Object.keys(docks).length} docks)
            </h2>
            {Object.keys(docks).length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400 border border-gray-700">
                <div className="text-6xl mx-auto mb-2">📍</div>
                <p>No docks connected yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(docks).map((dock) => (
                  <DockCard key={dock.dock_id} dock={dock} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {!connected && (
        <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-400">
          <div className="text-8xl mx-auto mb-4">🚲</div>
          <p className="text-lg">Connect to simulator to view bikes and docks</p>
        </div>
      )}
    </div>
  );
}
