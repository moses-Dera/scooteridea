'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function TopUpCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // The 'reference' is available via searchParams.get('reference') if you ever want to display it.

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
      <p className="text-slate-400 mb-8 max-w-sm">
        Your wallet is being topped up. If your balance doesn&apos;t update immediately, give it a
        few seconds for the transaction to clear.
      </p>

      <button
        onClick={() => router.push('/wallet')}
        className="w-full max-w-xs py-4 bg-primary text-black font-bold rounded-xl shadow-glow-primary hover:scale-[1.02] transition-transform"
      >
        Return to Wallet
      </button>
    </div>
  );
}
