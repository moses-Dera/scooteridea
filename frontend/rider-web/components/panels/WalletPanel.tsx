'use client';

import { useWallet } from '@/hooks';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CreditCard, Plus, History, ChevronRight, X } from 'lucide-react';
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
      window.dispatchEvent(new CustomEvent('auth-required', { detail: { feature: 'your Wallet' } }));
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
           <div className="flex justify-center relative z-10 py-2"><LoadingSpinner size="md" /></div>
        ) : (
           <h1 className="text-4xl font-black text-white relative z-10 tracking-tight">
             ₦ {balance?.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
           </h1>
        )}
        
        {isTopping ? (
          <div className="mt-6 flex gap-2 items-center relative z-10">
            <input 
              type="number" 
              placeholder="Amount (₦)" 
              className="flex-1 bg-black/40 border border-primary/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              autoFocus
            />
            <button 
              onClick={() => {
                const amount = parseFloat(topUpAmount);
                if (!amount || amount < 100) {
                  toast.error('Minimum top-up is ₦100');
                  return;
                }
                
                // Initialize Paystack Checkout
                if ((window as any).PaystackPop) {
                  const handler = (window as any).PaystackPop.setup({
                    key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxx', 
                    email: session?.user?.email || 'rider@scooter.com',
                    amount: amount * 100, // Paystack expects lowest currency denomination (Kobo)
                    currency: 'NGN',
                    ref: 'txn_' + Math.floor((Math.random() * 1000000000) + 1),
                    callback: async function(response: any) {
                      // Payment Complete! 
                      // In production, we'd verify this reference on the backend before crediting.
                      try {
                        const { userApi } = await import('@/lib/api');
                        await userApi.topUpWallet(response.reference);
                        toast.success(`Payment successful! ₦${amount} has been added to your wallet.`);
                      } catch (err: any) {
                        console.error('Failed to top up wallet on backend', err);
                        const errorMessage = err?.message || 'Transaction verification failed.';
                        toast.error(`Attention: ${errorMessage}`);
                      }
                      setIsTopping(false);
                      setTopUpAmount('');
                      // Force a refresh of the wallet balance
                      window.location.reload(); 
                    },
                    onClose: function() {
                      // User closed the payment window
                      setIsTopping(false);
                    }
                  });
                  handler.openIframe();
                } else {
                  toast.error('Payment gateway is still loading. Please try again in a moment.');
                }
              }}
              className="py-3 px-6 bg-primary text-black font-bold rounded-xl shadow-glow-primary hover:scale-[1.02] transition-transform cursor-pointer"
            >
              Pay
            </button>
            <button 
              onClick={() => setIsTopping(false)}
              className="py-3 px-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
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
