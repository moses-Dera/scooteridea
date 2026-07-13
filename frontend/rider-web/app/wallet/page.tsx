'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Plus, History, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function WalletPage() {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 pt-20 px-6 pb-6 border-b border-white/5 bg-[#0A0D14]/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
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
            ₦ 2,500.00
          </h1>

          <button className="mt-6 w-full py-4 bg-primary text-black font-bold rounded-xl shadow-glow-primary hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Top Up Balance
          </button>
        </div>

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
              <div className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                Default
              </div>
            </div>

            <button className="w-full glass-panel p-4 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-white/5 transition-colors border-dashed text-slate-400 hover:text-white">
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
