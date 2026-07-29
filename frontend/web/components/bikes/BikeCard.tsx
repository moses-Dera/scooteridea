'use client';

import { useState, useEffect } from 'react';
import { useBikeCommand } from '@/hooks/useBikeCommand';
import { FaLock, FaUnlock, FaBell, FaXmark, FaDownload } from 'react-icons/fa6';
import QRCode from 'react-qr-code';
import ConfirmModal from '../ConfirmModal';
import toast from 'react-hot-toast';

interface BikeCardProps {
  bike: {
    id: string;
    battery_pct: number;
    status: string;
    lat: number;
    lng: number;
    speed_kmh: number;
    lock_status?: string;
  };
  onSelect?: () => void;
}

export function BikeCard({ bike, onSelect }: BikeCardProps) {
  const { lock, unlock, alarm, disable, loading, error } = useBikeCommand();
  const [showDetails, setShowDetails] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localLockStatus, setLocalLockStatus] = useState<string | null>(null);

  // Clear optimistic state when the actual state from socket catches up
  useEffect(() => {
    setLocalLockStatus(null);
  }, [bike.lock_status]);

  const currentLockStatus = localLockStatus || bike.lock_status;

  const handleCommand = async (action: () => Promise<any>, optimisticState?: string) => {
    if (optimisticState) {
      setLocalLockStatus(optimisticState);
    }
    setCommandError(null);
    const result = await action();
    if (!result.success && result.error) {
      setCommandError(result.error);
    }
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    setCommandError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/proxy/fleet/bikes/${bike.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Failed to delete bike');
      toast.success('Bike deleted successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete bike';
      setCommandError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDownloadQR = (e: React.MouseEvent) => {
    e.stopPropagation();
    const svg = document.getElementById(`qr-${bike.id}`);
    if (!svg) return;

    // Serialize the SVG to string
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    // Add xml namespaces
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    // Add a white background rectangle
    source = source.replace('>', '><rect width="100%" height="100%" fill="white"/>');

    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);

    const a = document.createElement('a');
    a.href = url;
    a.download = `QR_${bike.id}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const statusColor =
    {
      available: 'text-green-400',
      in_use: 'text-red-400',
      charging: 'text-blue-400',
      maintenance: 'text-yellow-400',
    }[bike.status] || 'text-slate-400';

  const batteryColor =
    bike.battery_pct > 50
      ? 'text-green-400'
      : bike.battery_pct > 20
        ? 'text-yellow-400'
        : 'text-red-400';

  return (
    <div
      className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-all cursor-pointer"
      onClick={() => setShowDetails(!showDetails)}
    >
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Bike"
        message={`Are you sure you want to delete ${bike.id}? This action cannot be undone.`}
        onConfirm={executeDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
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
              <p className="text-white">
                {bike.lat.toFixed(4)}, {bike.lng.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Speed</p>
              <p className="text-white">{bike.speed_kmh} km/h</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg my-2 relative group">
            <QRCode id={`qr-${bike.id}`} value={bike.id} size={120} />
            <p className="text-xs text-slate-500 mt-2 font-mono">{bike.id}</p>
            <button
              onClick={handleDownloadQR}
              className="absolute top-2 right-2 bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              title="Download QR Code"
            >
              <FaDownload size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              disabled={isDeleting || loading}
              className="col-span-2 flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 py-2 rounded-lg font-medium transition-colors"
            >
              <FaXmark />
              {isDeleting ? 'Deleting...' : 'Delete Bike'}
            </button>
          </div>

          {/* Commands */}
          <div className="flex gap-2 flex-wrap mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCommand(() => unlock(bike.id), 'UNLOCKED');
              }}
              disabled={loading || currentLockStatus === 'UNLOCKED'}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                currentLockStatus === 'UNLOCKED'
                  ? 'bg-blue-500 text-white ring-2 ring-blue-300 font-bold shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                  : 'bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white'
              }`}
              title="Unlock bike"
            >
              <FaUnlock size={12} />
              {currentLockStatus === 'UNLOCKED' ? 'Unlocked' : 'Unlock'}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCommand(() => lock(bike.id), 'LOCKED');
              }}
              disabled={loading || currentLockStatus === 'LOCKED'}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                currentLockStatus === 'LOCKED'
                  ? 'bg-amber-500 text-white ring-2 ring-amber-300 font-bold shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                  : 'bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white'
              }`}
              title="Lock bike"
            >
              <FaLock size={12} />
              {currentLockStatus === 'LOCKED' ? 'Locked' : 'Lock'}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCommand(() => alarm(bike.id));
              }}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-800 text-white rounded text-sm transition-colors"
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
              disabled={isDeleting}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-800 rounded-lg transition-colors"
              title="Delete Bike"
            >
              <FaXmark className="w-5 h-5" />
              Disable
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onSelect) onSelect();
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-white text-slate-900 font-bold rounded text-sm transition-colors ml-auto w-full justify-center mt-2"
              title="Locate on map"
            >
              Locate on Map
            </button>
          </div>

          {commandError && <p className="text-xs text-red-400">{commandError}</p>}
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
