'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Plus, History, ChevronRight, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { paymentApi, userApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function WalletPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [methods, setMethods] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletRes, methodsRes] = await Promise.all([
          userApi.getWallet(),
          paymentApi.getMethods(),
        ]);
        setBalance((walletRes as any).data.balance);
        setMethods((methodsRes as any).data.data);
      } catch (err) {
        console.error('Failed to fetch wallet data', err);
      } finally {
        setIsLoadingData(false);
      }
    };
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const handleTopUp = async () => {
    if (!session?.user?.email) {
      toast.error('Please log in first');
      return;
    }

    try {
      setIsTopUpLoading(true);
      const res = await paymentApi.initializeTopUp(session.user.email, 1000 * 100);
      const json: any = res.data;

      if (json && json.authorization_url) {
        // Redirect browser to Paystack's secure checkout page
        window.location.href = json.authorization_url;
      } else {
        toast.error(json?.message || 'Failed to initialize payment');
      }
    } catch (e) {
      toast.error('Network error while initializing payment.');
    } finally {
      setIsTopUpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 pt-20 px-6 pb-6 border-b border-white/5 bg-[#0A0D14]/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.push('/menu')}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="text-2xl font-bold">Wallet</div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
          <p className="text-primary font-medium text-sm mb-1 relative z-10">Available Balance</p>
          <h1 className="text-4xl font-black text-white relative z-10 tracking-tight">
            {isLoadingData ? (
              <span className="text-2xl text-white/50">Loading...</span>
            ) : (
              `₦ ${balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`
            )}
          </h1>

          <button
            onClick={handleTopUp}
            disabled={isTopUpLoading}
            className="mt-6 w-full py-4 bg-primary text-black font-bold rounded-xl shadow-glow-primary hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isTopUpLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {isTopUpLoading ? 'Initializing...' : 'Top Up ₦1,000'}
          </button>
        </div>

        {/* Payment Methods */}
        <div>
          <h2 className="text-lg font-bold mb-4 text-slate-200">Payment Methods</h2>
          <div className="space-y-3">
            {isLoadingData ? (
              <div className="text-slate-400 text-sm">Loading methods...</div>
            ) : methods.length > 0 ? (
              methods.map((method) => (
                <div
                  key={method.id}
                  className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1A1F2B] rounded-xl flex items-center justify-center border border-white/5">
                      <CreditCard className="w-6 h-6 text-slate-300" />
                    </div>
                    <div>
                      <div className="font-bold text-white">
                        {method.brand === 'Card' ? `•••• ${method.last4}` : method.brand}
                      </div>
                      <div className="text-xs text-slate-400">Saved</div>
                    </div>
                  </div>
                  {method.isDefault && (
                    <div className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                      Default
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-slate-400 text-sm">
                No payment methods saved. They will be added automatically when you top up.
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions Link */}
        <div>
          <button
            onClick={() => router.push('/ride/history')}
            className="w-full glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors"
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
    </div>
  );
}
