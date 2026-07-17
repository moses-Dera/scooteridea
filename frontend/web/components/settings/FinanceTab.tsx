interface FinanceTabProps {
  wallets: any[];
  handleAdjustWallet: (id: string, name: string) => void;
}

export default function FinanceTab({ wallets, handleAdjustWallet }: FinanceTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-slate-400">View rider balances and issue manual refunds.</p>
      </div>

      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 font-medium text-slate-300">Rider</th>
              <th className="px-6 py-4 font-medium text-slate-300">Balance</th>
              <th className="px-6 py-4 font-medium text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {wallets.map((w) => (
              <tr key={w.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-white">{w.name}</div>
                  <div className="text-slate-500 text-xs">{w.email}</div>
                </td>
                <td className="px-6 py-4 font-mono font-medium text-green-400">
                  ₦{(w.walletCents / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleAdjustWallet(w.id, w.name)}
                    className="text-primary hover:underline font-medium text-xs"
                  >
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
            {wallets.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                  No wallets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
