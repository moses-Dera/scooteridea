'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { paymentApi } from '@/lib/api';

import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/Map/RiderMap'), {
  ssr: false,
});

export default function TopUpCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');

  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      setMessage('Invalid payment reference');
      return;
    }

    const verify = async () => {
      try {
        const res = await paymentApi.verifyTopUp(reference);
        const data: any = res.data;
        if (data.success) {
          setStatus('success');
          setMessage('Payment verified successfully!');
        } else {
          setStatus('failed');
          setMessage(data.message || 'Payment verification failed');
        }
      } catch (err) {
        setStatus('failed');
        setMessage('Network error while verifying payment');
      }
    };

    verify();
  }, [reference]);

  return (
    <div className="min-h-screen relative text-white flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <MapView />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      </div>

      <div className="relative z-10 glass-panel p-8 rounded-3xl border border-white/10 max-w-sm w-full flex flex-col items-center shadow-2xl shadow-primary/20">
        {status === 'verifying' && (
          <>
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Verifying Payment</h1>
            <p className="text-slate-400 mb-8">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-slate-400 mb-8">{message}</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
            <p className="text-slate-400 mb-8">{message}</p>
          </>
        )}

        <button
          onClick={() => (window.location.href = '/')}
          disabled={status === 'verifying'}
          className="w-full py-4 bg-primary text-black font-bold rounded-xl shadow-glow-primary hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          Return to Map
        </button>
      </div>
    </div>
  );
}
