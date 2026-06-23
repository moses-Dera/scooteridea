'use client';

import { useWallet } from '@/hooks';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Bike, CreditCard } from 'lucide-react';

interface WalletPanelProps {
  onClose: () => void;
}

export default function WalletPanel({ onClose }: WalletPanelProps) {
  const { data: session, status } = useSession();
  const { balance, loading, error, refetch } = useWallet();
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00FFA3]"></div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="text-2xl font-bold text-white">Wallet</div>
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
      <div className="w-full bg-gradient-to-br from-[#00FFA3]/10 to-[#00CC7F]/5 border border-[#00FFA3]/20 rounded-3xl p-6 relative overflow-hidden shadow-xl mb-6">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#00FFA3]/10 rounded-full blur-3xl"></div>
        
        {loading ? (
          <div>
            <span className="text-slate-400 font-medium text-sm uppercase tracking-wider">Available Balance</span>
            <div className="text-4xl font-black mt-2 mb-8 text-slate-500">Loading...</div>
          </div>
        ) : (
          <>
            <span className="text-slate-400 font-medium text-sm uppercase tracking-wider">Available Balance</span>
            <div className="text-4xl font-black mt-2 mb-8 text-white">₦ {balance?.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </>
        )}
        
        <div className="flex gap-4">
          <button
            onClick={() => {
              const amount = prompt('Enter amount to add (₦):');
              if (amount) {
                setTopUpAmount(amount);
                setIsTopping(true);
              }
            }}
            className="flex-1 h-12 bg-[#00FFA3] text-black font-bold rounded-xl shadow-[0_0_15px_rgba(0,255,163,0.3)] hover:bg-[#00FFA3]/90 transition-colors cursor-pointer"
          >
            Add Money
          </button>
          <button className="flex-1 h-12 bg-white/10 border border-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors cursor-pointer">
            Withdraw
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="w-full p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 mb-6">
          {error}
        </div>
      )}

      {/* Transactions List */}
      <div>
        <div className="text-lg font-semibold mb-4">Recent Transactions</div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00FFA3] mx-auto mb-4"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl"><Bike className="w-6 h-6 text-slate-300" /></div>
                <div>
                  <p className="font-semibold text-white">Sample Ride</p>
                  <p className="text-slate-400 text-xs mt-1">Today, 2:30 PM</p>
                </div>
              </div>
              <span className="font-bold text-white">-₦ 450.00</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl"><CreditCard className="w-6 h-6 text-slate-300" /></div>
                <div>
                  <p className="font-semibold text-white">Top Up</p>
                  <p className="text-slate-400 text-xs mt-1">Yesterday, 10:00 AM</p>
                </div>
              </div>
              <span className="font-bold text-[#00FFA3]">+₦ 2000.00</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
