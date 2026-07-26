'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Suspense } from 'react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-[#1A2235]/60 backdrop-blur-xl rounded-3xl border border-white/10 text-center">
          <div className="w-16 h-16 bg-[#1ED760]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-[#1ED760]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Password Reset!</h1>
          <p className="text-slate-400 mb-6">Your password has been successfully updated.</p>
          <p className="text-sm text-slate-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center p-4">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#1ED760]/10 rounded-full blur-[120px] pointer-events-none opacity-50 mix-blend-screen"></div>
      
      <div className="w-full max-w-md p-8 bg-[#1A2235]/80 backdrop-blur-xl rounded-3xl border border-white/10 relative z-10 shadow-2xl">
        <div className="mb-8 text-center">
          <img src="/wordmark-transparent.png" alt="Scooterfy" className="h-8 mx-auto mb-6 object-contain opacity-90" />
          <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-slate-400">Enter your new password below.</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium mb-6 flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="relative group">
            <label className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-2 block transition-colors group-focus-within:text-[#1ED760]">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#1ED760] transition-colors" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-[#1ED760]/50 focus:ring-1 focus:ring-[#1ED760]/50 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token || password.length < 8}
            className="group relative w-full h-12 bg-[#1ED760] text-black font-bold text-lg rounded-xl flex items-center justify-center gap-2 overflow-hidden transform hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(30, 215, 96,0.4)] transition-all disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {loading ? (
              <span className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Update Password</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center text-[#1ED760]">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
