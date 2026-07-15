'use client';

import { useState, useEffect } from 'react';
import { FiUsers, FiDollarSign, FiMap, FiPercent, FiSave } from 'react-icons/fi';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<'users' | 'finance' | 'geofencing' | 'pricing'>(
    'pricing',
  );

  const [config, setConfig] = useState({
    unlockFeeCents: 10000,
    perMinuteCents: 2000,
    maxSurgeMult: 2.5,
    outOfDockFeeCents: 50000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/proxy/fleet/config`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setConfig(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch config', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSavePricing = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/proxy/fleet/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        alert('Pricing Configuration Saved Successfully!');
      } else {
        alert('Failed to save config.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving config.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-slate-400 mt-1">Configure global operational parameters (Admin Only)</p>
      </div>

      {/* Mobile/Desktop Tabs */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 gap-2 border-b border-white/10 hide-scrollbar">
        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex items-center gap-2 px-4 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
            activeTab === 'pricing'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FiPercent />
          Pricing Engine
        </button>
        <button
          onClick={() => setActiveTab('geofencing')}
          className={`flex items-center gap-2 px-4 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
            activeTab === 'geofencing'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FiMap />
          Geofencing Zones
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FiUsers />
          User Management
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`flex items-center gap-2 px-4 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
            activeTab === 'finance'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FiDollarSign />
          Financial Ledgers
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-6">
        {/* Pricing Engine Config */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            {loading ? (
              <div className="text-slate-400">Loading Configuration...</div>
            ) : (
              <>
                <div className="glass-panel p-6 rounded-xl border border-white/10">
                  <h2 className="text-xl font-bold text-white mb-4">Base Fares</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Unlock Fee (₦)</label>
                      <input
                        type="number"
                        value={config.unlockFeeCents / 100}
                        onChange={(e) =>
                          setConfig({ ...config, unlockFeeCents: Number(e.target.value) * 100 })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      />
                      <p className="text-xs text-slate-500">
                        Charged immediately upon unlocking a bike.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">
                        Per-Minute Rate (₦)
                      </label>
                      <input
                        type="number"
                        value={config.perMinuteCents / 100}
                        onChange={(e) =>
                          setConfig({ ...config, perMinuteCents: Number(e.target.value) * 100 })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      />
                      <p className="text-xs text-slate-500">
                        Charged for every minute the ride is active.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-xl border border-white/10">
                  <h2 className="text-xl font-bold text-white mb-4">Surge & Penalties</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">
                        Max Surge Multiplier
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={config.maxSurgeMult}
                        onChange={(e) =>
                          setConfig({ ...config, maxSurgeMult: Number(e.target.value) })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      />
                      <p className="text-xs text-slate-500">
                        Maximum fare multiplier during high-demand.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">
                        Out-of-Dock Penalty (₦)
                      </label>
                      <input
                        type="number"
                        value={config.outOfDockFeeCents / 100}
                        onChange={(e) =>
                          setConfig({ ...config, outOfDockFeeCents: Number(e.target.value) * 100 })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      />
                      <p className="text-xs text-slate-500">
                        Fee for ending a ride outside an approved dock.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSavePricing}
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary text-black font-bold px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors w-full md:w-auto justify-center disabled:opacity-50"
                  >
                    <FiSave />
                    {saving ? 'Saving...' : 'Save Pricing Config'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Geofencing Config */}
        {activeTab === 'geofencing' && (
          <div className="glass-panel p-6 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center py-20">
            <FiMap className="w-16 h-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Operational Boundary Maps</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Configure allowed riding zones, speed-limited areas, and restricted zones using the
              interactive map editor.
            </p>
            <button className="mt-6 px-6 py-3 border border-slate-600 rounded-lg text-white font-medium hover:bg-slate-800 transition-colors">
              Launch Map Editor
            </button>
          </div>
        )}

        {/* User Management */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <p className="text-slate-400">
                Manage dashboard access and operator zone assignments.
              </p>
              <button className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-lg transition-colors border border-slate-600">
                + Add Operator
              </button>
            </div>

            <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/50 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4 font-medium text-slate-300">User</th>
                      <th className="px-6 py-4 font-medium text-slate-300">Role</th>
                      <th className="px-6 py-4 font-medium text-slate-300">Assigned Zone</th>
                      <th className="px-6 py-4 font-medium text-slate-300 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    <tr className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">Admin Default</div>
                        <div className="text-slate-500 text-xs">admin@scooter.com</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">
                          ADMIN
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">Global</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-blue-400 hover:underline text-xs font-medium">
                          Edit
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">Lagos Operator</div>
                        <div className="text-slate-500 text-xs">ops-lagos@scooter.com</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs font-bold">
                          OPERATOR
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">Lagos Mainland, Island</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-blue-400 hover:underline text-xs font-medium">
                          Edit
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Financial Ledgers */}
        {activeTab === 'finance' && (
          <div className="glass-panel p-6 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center py-20">
            <FiDollarSign className="w-16 h-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Ledger & Dispute Resolution</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Manually override rider wallet balances, issue refunds, and investigate ledger
              anomalies.
            </p>
            <button className="mt-6 px-6 py-3 border border-slate-600 rounded-lg text-white font-medium hover:bg-slate-800 transition-colors">
              Access Ledger Logs
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
