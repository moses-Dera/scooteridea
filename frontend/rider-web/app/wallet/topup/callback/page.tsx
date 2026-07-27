'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { paymentApi } from '@/lib/api';

const MAX_VERIFICATION_ATTEMPTS = 5;
const VERIFICATION_DELAY_MS = 2000;

export default function TopUpCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      setMessage('Invalid payment reference');
      return;
    }

    let cancelled = false;

    const verify = async () => {
      for (let attempt = 1; attempt <= MAX_VERIFICATION_ATTEMPTS; attempt += 1) {
        try {
          const res = await paymentApi.verifyTopUp(reference);
          const data: any = res.data;

          if (data.success) {
            if (!cancelled) {
              setStatus('success');
              setMessage('Payment verified successfully!');
            }
            return;
          }

          const paymentStatus = String(data.paymentStatus || '').toLowerCase();
          const isTransient = ['pending', 'ongoing', 'processing', 'queued'].includes(
            paymentStatus,
          );

          if (!isTransient || attempt === MAX_VERIFICATION_ATTEMPTS) {
            if (!cancelled) {
              setStatus('failed');
              setMessage(data.message || 'Payment verification failed');
            }
            return;
          }

          if (!cancelled) {
            setMessage('Payment is still being confirmed...');
          }
          await new Promise((resolve) => setTimeout(resolve, VERIFICATION_DELAY_MS));
        } catch (err) {
          if (!cancelled) {
            setStatus('failed');
            setMessage('Network error while verifying payment');
          }
          return;
        }
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm text-white flex flex-col items-center justify-center px-6 text-center overflow-hidden pointer-events-auto">
      <div className="relative z-10 glass-panel p-8 rounded-3xl border border-white/10 max-w-sm w-full flex flex-col items-center shadow-2xl shadow-primary/20 pointer-events-auto">
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
          onClick={() => router.push('/')}
          disabled={status === 'verifying'}
          className="w-full py-4 bg-primary text-black font-bold rounded-xl shadow-glow-primary hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          Return to Map
        </button>
      </div>
    </div>
  );
}
