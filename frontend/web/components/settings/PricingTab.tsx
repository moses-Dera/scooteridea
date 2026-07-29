import { FiSave } from 'react-icons/fi';

interface PricingTabProps {
  config: any;
  setConfig: (config: any) => void;
  saving: boolean;
  handleSavePricing: () => void;
}

export default function PricingTab({
  config,
  setConfig,
  saving,
  handleSavePricing,
}: PricingTabProps) {
  return (
    <div className="space-y-6">
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
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Per-Minute Rate (₦)</label>
            <input
              type="number"
              value={config.perMinuteCents / 100}
              onChange={(e) =>
                setConfig({ ...config, perMinuteCents: Number(e.target.value) * 100 })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-xl border border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">Surge & Penalties</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Max Surge Multiplier</label>
            <input
              type="number"
              step="0.1"
              value={config.maxSurgeMult}
              onChange={(e) => setConfig({ ...config, maxSurgeMult: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Out-of-Dock Penalty (₦)</label>
            <input
              type="number"
              value={config.outOfDockFeeCents / 100}
              onChange={(e) =>
                setConfig({ ...config, outOfDockFeeCents: Number(e.target.value) * 100 })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-xl border border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">Developer Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg px-4 py-3">
            <div>
              <p className="text-white font-medium">Allow Fleet Teleport</p>
              <p className="text-xs text-slate-400 mt-1">
                Allows riders to summon all available bikes to their location (for testing).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.allowFleetTeleport}
                onChange={(e) => setConfig({ ...config, allowFleetTeleport: e.target.checked })}
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSavePricing}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-black font-bold px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <FiSave /> {saving ? 'Saving...' : 'Save Pricing Config'}
        </button>
      </div>
    </div>
  );
}
