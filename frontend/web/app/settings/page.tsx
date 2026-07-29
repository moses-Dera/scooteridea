'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import {
  FiUsers,
  FiDollarSign,
  FiMap,
  FiPercent,
  FiSave,
  FiTrash2,
  FiPlus,
  FiX,
  FiEdit2,
  FiSearch,
  FiMapPin,
  FiMessageSquare,
} from 'react-icons/fi';
import { MdElectricBike, MdWarning } from 'react-icons/md';
import { BiMoney } from 'react-icons/bi';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import ConfirmModal from '@/components/ConfirmModal';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import Map, { Source, Layer, Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import PricingTab from '@/components/settings/PricingTab';
import UsersTab from '@/components/settings/UsersTab';
import FinanceTab from '@/components/settings/FinanceTab';
import GeofencingTab from '@/components/settings/GeofencingTab';
import SupportTab from '@/components/settings/SupportTab';

// Helper to generate a circle Polygon GeoJSON
function createGeoJSONCircle(
  centerLng: number,
  centerLat: number,
  radiusInKm: number,
  points = 64,
) {
  const distanceX = radiusInKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = radiusInKm / 110.574;

  const ret = [];
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([centerLng + x, centerLat + y]);
  }
  ret.push(ret[0]);

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [ret] },
  };
}

export default function AdminSettings() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<
    'users' | 'finance' | 'geofencing' | 'pricing' | 'support'
  >('geofencing');

  // Pricing State
  const [config, setConfig] = useState({
    unlockFeeCents: 10000,
    perMinuteCents: 2000,
    maxSurgeMult: 2.5,
    outOfDockFeeCents: 50000,
    allowFleetTeleport: false,
  });

  // Data States
  const [users, setUsers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [transitions, setTransitions] = useState<any[]>([]);
  const [drawInstance, setDrawInstance] = useState<MapboxDraw | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Deletion state for ConfirmModal
  const [itemToDelete, setItemToDelete] = useState<{type: 'user'|'zone', id: string} | null>(null);

  // Map Editor State
  const [newZoneData, setNewZoneData] = useState({
    name: '',
    type: 'operational',
    speed_limit_kmh: '',
  });
  const [drawnGeometry, setDrawnGeometry] = useState<any>(null);

  // Zone Assignment State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [tempAssignedZones, setTempAssignedZones] = useState<string[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Toast Notification State
  const [toastMsg, setToastMsg] = useState<{ title: string; message: string } | null>(null);

  // Fetch all admin data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [configRes, usersRes, walletsRes, zonesRes, ticketsRes, transitionsRes] =
        await Promise.all([
          fetch(`/api/proxy/fleet/config`),
          fetch(`/api/proxy/auth/admin/users`),
          fetch(`/api/proxy/auth/admin/finance/wallets?limit=50`),
          fetch(`/api/proxy/fleet/zones`),
          fetch(`/api/proxy/auth/admin/support`),
          fetch(`/api/proxy/fleet/zones/transitions`),
        ]);

      if (configRes.ok) {
        const json = await configRes.json();
        if (json.success && json.data) setConfig(json.data);
      }
      if (usersRes.ok) {
        const json = await usersRes.json();
        if (json.success && json.data) setUsers(json.data);
      }
      if (walletsRes.ok) {
        const json = await walletsRes.json();
        if (json.success && json.data) setWallets(json.data);
      }
      if (zonesRes.ok) {
        const json = await zonesRes.json();
        if (json.success && json.data) setZones(json.data);
      }
      if (ticketsRes.ok) {
        const json = await ticketsRes.json();
        if (json.success && json.data) setTickets(json.data);
      }
      if (transitionsRes.ok) {
        const json = await transitionsRes.json();
        if (json.success && json.data) setTransitions(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // WebSocket connection for real-time support tickets
  useEffect(() => {
    if (loading) return; // Wait until initial load is complete

    const token = (session as any)?.accessToken as string | undefined;
    if (!token) return;

    const getTokenExpiryMs = (jwt: string): number | null => {
      try {
        const payloadBase64 = jwt.split('.')[1];
        if (!payloadBase64) return null;
        const payload = JSON.parse(atob(payloadBase64));
        if (typeof payload.exp !== 'number') return null;
        return payload.exp * 1000;
      } catch {
        return null;
      }
    };

    const canConnect = () => {
      const exp = getTokenExpiryMs(token);
      return exp === null || Date.now() < exp - 15 * 1000;
    };

    if (!canConnect()) return;

    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      if (!canConnect()) return;

      try {
        let wsUrl = process.env.NEXT_PUBLIC_WS_URL || '';
        if (!wsUrl) {
          let apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
          if (!apiUrl) {
            const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
            wsUrl = `${proto}://${window.location.host}/live`;
          } else {
            const proto = apiUrl.startsWith('https') ? 'wss' : 'ws';
            const host = apiUrl.replace(/^https?:\/\//, '');
            wsUrl = `${proto}://${host}/live`;
          }
        } else if (wsUrl.startsWith('ss://')) {
          wsUrl = wsUrl.replace('ss://', 'wss://');
        } else if (wsUrl.startsWith('http://')) {
          wsUrl = wsUrl.replace('http://', 'ws://');
        } else if (wsUrl.startsWith('https://')) {
          wsUrl = wsUrl.replace('https://', 'wss://');
        }
        ws = new WebSocket(`${wsUrl}?token=${token}`);

        ws.onopen = () => {
          ws.send(JSON.stringify({ subscribe: ['support:all'] }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'support_ticket_created') {
              setToastMsg({
                title: 'New Support Ticket',
                message: `Ticket "${msg.subject}" was just submitted.`,
              });
              setTimeout(() => setToastMsg(null), 6000);
              fetch(`/api/proxy/auth/admin/support`).then((res) => {
                if (res.ok) {
                  res.json().then((json) => {
                    if (json.success && json.data) setTickets(json.data);
                  });
                }
              });
            }
          } catch (e) {}
        };

        ws.onclose = (event) => {
          if (event.code === 4001 || event.code === 4003) {
            return;
          }
          if (!canConnect()) return;
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {}
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [loading, session]);

  // PRICING
  const handleSavePricing = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/proxy/fleet/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) toast.success('Pricing Configuration Saved Successfully!');
      else toast.error('Failed to save config.');
    } catch (err) {
      console.error(err);
      toast.error('Error saving config.');
    } finally {
      setSaving(false);
    }
  };

  // USERS
  const handleAddOperator = async () => {
    const email = prompt('Enter new operator email:');
    const name = prompt('Enter new operator name:');
    const password = prompt('Enter initial password:');
    if (!email || !name || !password) return;

    try {
      const res = await fetch(`/api/proxy/auth/admin/operators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, role: 'OPERATOR' }),
      });
      if (res.ok) {
        toast.success('Operator created!');
        fetchAllData();
      } else {
        const err = await res.json();
        toast.error(`Failed: ${err.error}`);
      }
    } catch (e) {
      toast.error('Error creating operator');
    }
  };

  const executeDeleteUser = async () => {
    if (!itemToDelete || itemToDelete.type !== 'user') return;
    try {
      const res = await fetch(`/api/proxy/auth/admin/users/${itemToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(users.filter((u) => u.id !== itemToDelete.id));
        toast.success('User deleted');
      } else {
        toast.error('Failed to delete user');
      }
    } catch (e) {
      toast.error('Error deleting user');
    } finally {
      setItemToDelete(null);
    }
  };

  const handleSaveUserZones = async (userId: string) => {
    try {
      const res = await fetch(`/api/proxy/auth/admin/users/${userId}/zones`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneIds: tempAssignedZones }),
      });
      if (res.ok) {
        const json = await res.json();
        setUsers(
          users.map((u) =>
            u.id === userId ? { ...u, assignedZones: json.data.assignedZones } : u,
          ),
        );
        setEditingUser(null);
        toast.success('Zones updated successfully!');
      } else {
        toast.error('Failed to update zones');
      }
    } catch (e) {
      toast.error('Error updating zones');
    }
  };

  // FINANCE
  const handleAdjustWallet = async (id: string, name: string) => {
    const amountStr = prompt(
      `Enter amount in Naira (₦) to ADD to ${name}'s wallet (use negative to deduct):`,
    );
    if (!amountStr) return;
    const amountCents = parseInt(amountStr) * 100;
    if (isNaN(amountCents)) return toast.error('Invalid amount');

    try {
      const res = await fetch(`/api/proxy/auth/admin/finance/wallets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents, reason: 'Admin Manual Adjustment' }),
      });
      if (res.ok) {
        const json = await res.json();
        setWallets(
          wallets.map((w) => (w.id === id ? { ...w, walletCents: json.data.walletCents } : w)),
        );
        toast.success('Wallet adjusted successfully');
      } else {
        toast.error('Failed to adjust wallet');
      }
    } catch (e) {
      toast.error('Error adjusting wallet');
    }
  };

  // SUPPORT
  const handleToggleTicketStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'RESOLVED' ? 'OPEN' : 'RESOLVED';
    try {
      const res = await fetch(`/api/proxy/auth/admin/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTickets(tickets.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
        toast.success('Ticket status updated');
      } else {
        toast.error('Failed to update ticket');
      }
    } catch (e) {
      toast.error('Error updating ticket');
    }
  };

  // GEOFENCING MAP EDITOR
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const handleCreateZone = async () => {
    if (!drawnGeometry || !newZoneData.name) return toast.error('Name and geometry are required');

    try {
      const payload = {
        name: newZoneData.name,
        type: newZoneData.type,
        speed_limit_kmh: newZoneData.speed_limit_kmh,
        geometry: drawnGeometry,
      };

      const res = await fetch(`/api/proxy/fleet/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        setZones([json.data, ...zones]);
        setDrawnGeometry(null);
        setNewZoneData({ name: '', type: 'operational', speed_limit_kmh: '' });
        toast.success('Zone created successfully');
      } else {
        toast.error('Failed to create zone');
      }
    } catch (e) {
      toast.error('Error creating zone');
    }
  };

  const executeDeleteZone = async () => {
    if (!itemToDelete || itemToDelete.type !== 'zone') return;
    try {
      const res = await fetch(`/api/proxy/fleet/zones/${itemToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setZones(zones.filter((z) => z.id !== itemToDelete.id));
        toast.success('Zone deleted');
      } else {
        toast.error('Failed to delete zone');
      }
    } catch (e) {
      toast.error('Failed to delete zone');
    } finally {
      setItemToDelete(null);
    }
  };

  const activeZoneSource = useMemo(() => {
    if (!drawnGeometry) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: drawnGeometry,
          properties: {},
        },
      ],
    };
  }, [drawnGeometry]);

  const heatmapGeoJson = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: transitions.map((t) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [t.lng, t.lat] },
        properties: { type: t.type },
      })),
    };
  }, [transitions]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 h-full flex flex-col">
      <ConfirmModal
        isOpen={!!itemToDelete}
        title={itemToDelete?.type === 'user' ? 'Delete User' : 'Delete Zone'}
        message={itemToDelete?.type === 'user' ? 'Are you sure you want to delete this user? This action cannot be undone.' : 'Are you sure you want to delete this zone? This action cannot be undone.'}
        onConfirm={() => {
          if (itemToDelete?.type === 'user') executeDeleteUser();
          else if (itemToDelete?.type === 'zone') executeDeleteZone();
        }}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-slate-400 mt-1">Configure global operational parameters (Admin Only)</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 gap-2 border-b border-white/10 hide-scrollbar shrink-0">
        {[
          { id: 'pricing', label: 'Pricing Engine', icon: FiPercent },
          { id: 'geofencing', label: 'Geofencing Zones', icon: FiMap },
          { id: 'users', label: 'User Management', icon: FiUsers },
          { id: 'finance', label: 'Financial Ledgers', icon: FiDollarSign },
          { id: 'support', label: 'Customer Support', icon: FiMessageSquare },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex-1">
        {loading ? (
          <div className="text-slate-400 text-center py-20">Loading Settings...</div>
        ) : (
          <>
            {/* PRICING TAB */}
            {activeTab === 'pricing' && (
              <PricingTab
                config={config}
                setConfig={setConfig}
                saving={saving}
                handleSavePricing={handleSavePricing}
              />
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
              <UsersTab
                users={users}
                setUsers={setUsers}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                editingUser={editingUser}
                setEditingUser={setEditingUser}
                tempAssignedZones={tempAssignedZones}
                setTempAssignedZones={setTempAssignedZones}
                zones={zones}
                handleAddOperator={handleAddOperator}
                handleDeleteUser={(id: string) => setItemToDelete({type: 'user', id})}
                handleSaveUserZones={handleSaveUserZones}
              />
            )}

            {/* FINANCE TAB */}
            {activeTab === 'finance' && (
              <FinanceTab wallets={wallets} handleAdjustWallet={handleAdjustWallet} />
            )}

            {/* GEOFENCING TAB (MAP EDITOR) */}
            {activeTab === 'geofencing' && (
              <GeofencingTab
                mapboxToken={mapboxToken}
                zones={zones}
                heatmapGeoJson={heatmapGeoJson}
                showHeatmap={showHeatmap}
                setShowHeatmap={setShowHeatmap}
                drawnGeometry={drawnGeometry}
                setDrawnGeometry={setDrawnGeometry}
                newZoneData={newZoneData}
                setNewZoneData={setNewZoneData}
                handleCreateZone={handleCreateZone}
                handleDeleteZone={(id: string) => setItemToDelete({type: 'zone', id})}
              />
            )}

            {/* SUPPORT TAB */}
            {activeTab === 'support' && (
              <SupportTab tickets={tickets} handleToggleTicketStatus={handleToggleTicketStatus} />
            )}
          </>
        )}
      </div>

      {/* Custom Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-800 border border-primary text-white p-4 rounded-xl shadow-2xl z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-full text-primary">
              <FiMessageSquare size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm">{toastMsg.title}</h4>
              <p className="text-xs text-slate-300">{toastMsg.message}</p>
            </div>
            <button
              onClick={() => setToastMsg(null)}
              className="ml-4 text-slate-500 hover:text-white transition-colors"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
