'use client';

import { useWallet } from '@/hooks';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CreditCard, Plus, History, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WalletPanelProps {
  onClose: () => void;
}

export default function WalletPanel({ onClose }: WalletPanelProps) {
  const { data: session, status } = useSession();
  const { balance, loading, error } = useWallet();
  const router = useRouter();
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isTopping, setIsTopping] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      window.dispatchEvent(new CustomEvent('auth-required', { detail: { feature: 'your Wallet' } }));
    }
  }, [status]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="px-6 py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 text-white space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pt-2">
        <div className="text-2xl font-bold">Wallet</div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
        <p className="text-primary font-medium text-sm mb-1 relative z-10">Available Balance</p>
        
        {loading ? (
           <h1 className="text-4xl font-black text-slate-500 relative z-10 tracking-tight">Loading...</h1>
        ) : (
           <h1 className="text-4xl font-black text-white relative z-10 tracking-tight">
             ₦ {balance?.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
           </h1>
        )}
        
        <button 
          onClick={() => {
            const amount = prompt('Enter amount to add (₦):');
            if (amount) {
              setTopUpAmount(amount);
              setIsTopping(true);
            }
          }}
          className="mt-6 w-full py-4 bg-primary text-black font-bold rounded-xl shadow-glow-primary hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-5 h-5" /> Top Up Balance
        </button>
      </div>

      {error && (
        <div className="w-full p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
          {error}
        </div>
      )}

      {/* Payment Methods */}
      <div>
        <h2 className="text-lg font-bold mb-4 text-slate-200">Payment Methods</h2>
        <div className="space-y-3">
          <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1A1F2B] rounded-xl flex items-center justify-center border border-white/5">
                <CreditCard className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <div className="font-bold text-white">•••• 4242</div>
                <div className="text-xs text-slate-400">Expires 12/28</div>
              </div>
            </div>
            <div className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">Default</div>
          </div>

          <button className="w-full glass-panel p-4 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-white/5 transition-colors border-dashed text-slate-400 hover:text-white cursor-pointer">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-semibold">Add New Card</span>
          </button>
        </div>
      </div>

      {/* Recent Transactions Link */}
      <div>
        <button 
          onClick={() => {
            onClose();
            // In a panel-based UI, navigating to history should probably open the history panel
            // but we'll use router.push for now if they actually want a page, or simulate a panel switch?
            // Since layout manages activePanel, it's tricky to switch directly without context.
            // Let's just use a custom event or router.
            window.dispatchEvent(new CustomEvent('open-panel', { detail: 'history' }));
          }} 
          className="w-full glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
              <History className="w-5 h-5 text-slate-300" />
            </div>
            <span className="font-bold text-white">Transaction History</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </button>
      </div>

    </div>
  );
}
