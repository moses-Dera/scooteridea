'use client';

import { useWallet } from '@/hooks';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CreditCard, Plus, History, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';

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
      window.dispatchEvent(
        new CustomEvent('auth-required', { detail: { feature: 'your Wallet' } }),
      );
    }
  }, [status]);

  useEffect(() => {
    if (!document.getElementById('paystack-inline-script')) {
      const script = document.createElement('script');
      script.id = 'paystack-inline-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="px-6 py-12 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 text-white space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-panel', { detail: 'menu' }))}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex flex-shrink-0 items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div className="text-2xl font-bold">Wallet</div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-slate-300" />
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
        <p className="text-primary font-medium text-sm mb-1 relative z-10">Available Balance</p>

        {loading ? (
          <div className="flex justify-center relative z-10 py-2">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <h1 className="text-4xl font-black text-white relative z-10 tracking-tight">
            ₦{' '}
            {balance?.toLocaleString('en-NG', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || '0.00'}
          </h1>
        )}

        {isTopping ? (
          <div className="mt-6 flex flex-col gap-3 relative z-10">
            <input
              type="number"
              placeholder="Amount (₦)"
              className="w-full bg-black/40 border border-[#1ED760]/30 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-[#1ED760] transition-colors"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              autoFocus
            />
            <button
              onClick={() => setIsTopping(false)}
              className="w-full py-3 px-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const amount = parseFloat(topUpAmount);
                if (!amount || amount < 100) {
                  toast.error('Minimum top-up is ₦100');
                  return;
                }

                // Initialize Paystack Checkout via Backend
                import('@/lib/api').then(async ({ paymentApi }) => {
                  try {
                    const res: any = await paymentApi.initializeTopUp(
                      session?.user?.email || 'rider@scooter.com',
                      amount * 100,
                    );
                    if (res.data?.authorization_url) {
                      window.location.href = res.data.authorization_url;
                    } else {
                      toast.error('Failed to initialize payment.');
                      setIsTopping(false);
                    }
                  } catch (err: any) {
                    toast.error('Network error while initializing payment.');
                    setIsTopping(false);
                  }
                });
              }}
              className="w-full py-3 px-5 bg-[#1ED760] text-black font-bold rounded-xl shadow-[0_0_15px_rgba(30,215,96,0.2)] hover:shadow-[0_0_20px_rgba(30,215,96,0.4)] hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center"
            >
              Pay
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsTopping(true)}
            className="mt-6 w-full py-4 bg-primary text-black font-bold rounded-xl shadow-glow-primary hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Top Up Balance
          </button>
        )}
      </div>

      {error && (
        <div className="w-full p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
          {error}
        </div>
      )}

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
