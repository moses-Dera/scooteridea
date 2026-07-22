'use client';
import { useState } from 'react';
import { Shield, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';

export default function TwoFactorSetupModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'intro' | 'verify'>('intro');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  const handleSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(session as any)?.accessToken}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('OTP sent to your email');
        setStep('verify');
      } else {
        toast.error(data.message || 'Failed to setup 2FA');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setLoading(true);
    try {
      const res = await fetch('/api/proxy/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(session as any)?.accessToken}`,
        },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Two-Factor Authentication enabled');
        onClose();
      } else {
        toast.error(data.message || 'Invalid OTP');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 pb-6 text-white space-y-6">
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex flex-shrink-0 items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div className="text-2xl font-bold">Two-Factor Auth</div>
        </div>
      </div>

      {step === 'intro' ? (
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-[#1ED760]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-[#1ED760]" />
          </div>
          <h3 className="text-xl font-bold">Protect your account</h3>
          <p className="text-slate-400 text-sm">
            Add an extra layer of security to your account. We'll send a 6-digit code to your email whenever you sign in.
          </p>
          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full mt-6 py-3 px-4 rounded-xl bg-primary text-black hover:bg-primary/90 transition-colors font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending Code...' : 'Setup 2FA'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="space-y-6 text-center">
          <h3 className="text-xl font-bold">Enter Code</h3>
          <p className="text-slate-400 text-sm">
            We sent a 6-digit code to your email.
          </p>
          
          <div className="relative group max-w-[200px] mx-auto">
            <input
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-white placeholder-slate-600 focus:outline-none focus:border-[#1ED760]/50 focus:ring-1 focus:ring-[#1ED760]/50 transition-all text-center tracking-widest text-2xl font-bold"
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full mt-6 py-3 px-4 rounded-xl bg-primary text-black hover:bg-primary/90 transition-colors font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      )}
    </div>
  );
}
