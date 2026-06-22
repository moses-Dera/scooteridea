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
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Hardware Simulation Console</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage virtual fleet and telemetry injection</p>
            </div>
            <div className="flex items-center gap-3">
              {connected ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-sm font-medium whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm font-medium whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Disconnected
                </div>
              )}
            </div>
          </div>

          {!connected && (
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end w-full max-w-md">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-slate-700 mb-1">Target Endpoint</label>
                <input
                  type="text"
                  value={brokerUrl}
                  onChange={(e) => setBrokerUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 text-slate-900 rounded-md border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="ws://localhost:8884"
                />
              </div>
              <button
                onClick={connectToDashboard}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors whitespace-nowrap"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm break-words">
              {error}
            </div>
          )}
        </div>
      </header>

      {connected && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          
          {/* Controls Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
              <h2 className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 sm:mb-4 uppercase tracking-wider">Provision Virtual Bike</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newBikeId}
                  onChange={(e) => setNewBikeId(e.target.value)}
                  placeholder="e.g., BK-00011"
                  className="w-full sm:flex-1 px-3 py-2 bg-slate-50 text-slate-900 rounded-md border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"
                />
                <button
                  onClick={addBike}
                  disabled={!newBikeId.trim()}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Provision
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
              <h2 className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 sm:mb-4 uppercase tracking-wider">Provision Virtual Dock</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2 w-full sm:w-auto sm:flex-1">
                  <input
                    type="text"
                    value={newDockId}
                    onChange={(e) => setNewDockId(e.target.value)}
                    placeholder="ID (DOCK-008)"
                    className="w-1/2 sm:w-1/3 px-3 py-2 bg-slate-50 text-slate-900 rounded-md border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={newDockName}
                    onChange={(e) => setNewDockName(e.target.value)}
                    placeholder="Name"
                    className="w-1/2 sm:flex-1 px-3 py-2 bg-slate-50 text-slate-900 rounded-md border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                </div>
                <button
                  onClick={addDock}
                  disabled={!newDockId.trim() || !newDockName.trim()}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Provision
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 sm:pt-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Active Fleet Simulator</h2>
              <span className="self-start sm:self-auto px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium border border-slate-200">
                {Object.keys(bikes).length} Instances Running
              </span>
            </div>
            
            {Object.keys(bikes).length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-12 text-center text-slate-500 border border-slate-200 border-dashed">
                <p>No active bike instances. Provision a new bike to begin simulation.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Object.values(bikes).map((bike) => (
                  <div key={bike.bike_id} className="relative bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5">
                    <BikeCard bike={bike} onCommand={sendCommand} />
                    <button
                      onClick={() => removeBike(bike.bike_id)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-red-600 text-sm font-medium transition-colors"
                    >
                      Terminate
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-6 sm:pt-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Infrastructure Simulator</h2>
              <span className="self-start sm:self-auto px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium border border-slate-200">
                {Object.keys(docks).length} Docks Running
              </span>
            </div>

            {Object.keys(docks).length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-12 text-center text-slate-500 border border-slate-200 border-dashed">
                <p>No active dock instances. Provision a dock to test charging logic.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Object.values(docks).map((dock) => (
                  <DockCard key={dock.dock_id} dock={dock} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!connected && (
        <div className="max-w-7xl mx-auto px-6 py-24 text-center text-slate-500">
          <p className="text-lg">Connect to the simulator endpoint to initialize the environment.</p>
        </div>
      )}
    </div>
  );
}
