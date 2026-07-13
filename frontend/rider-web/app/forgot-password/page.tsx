'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 bg-[#0A0F1E] overflow-hidden pointer-events-auto">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#1ED760]/20 rounded-full blur-[120px] pointer-events-none opacity-50 mix-blend-screen animate-pulse duration-1000"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none opacity-50 mix-blend-screen"></div>

      <div className="w-full max-w-lg flex flex-col rounded-3xl overflow-hidden glass-panel border border-white/5 shadow-2xl relative z-10 bg-[#1A2235]/60 backdrop-blur-xl p-6 sm:p-8">
        <Link
          href="/login"
          className="absolute top-6 left-6 z-[100] text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="flex flex-col items-center text-center mt-8 mb-10">
          <div className="mb-6">
            <img
              src="/wordmark-transparent.png"
              alt="Scooterfy"
              className="h-12 object-contain drop-shadow-md"
            />
          </div>
          <div className="text-3xl font-bold text-white mb-2">Reset Password</div>
          <p className="text-slate-400 max-w-sm">
            Enter the email address associated with your account and we&apos;ll send you a recovery
            link.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium mb-6 flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse"></span>
            {error}
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 rounded-full bg-[#1ED760]/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#1ED760]" />
            </div>
            <div className="text-xl font-bold text-white mb-2">Check your inbox</div>
            <p className="text-slate-400 mb-6 max-w-xs">
              We&apos;ve sent password reset instructions to <strong>{email}</strong>
            </p>
            <Link
              href="/login"
              className="w-full h-12 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl flex items-center justify-center border border-white/10 transition-all"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-6">
            <div className="relative group">
              <label className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-1.5 block transition-colors group-focus-within:text-[#1ED760]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#1ED760] transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rider@example.com"
                  className="w-full h-12 bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-[#1ED760]/50 focus:ring-1 focus:ring-[#1ED760]/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="group relative w-full h-12 bg-[#1ED760] text-black font-bold text-lg rounded-xl flex items-center justify-center gap-2 overflow-hidden transform hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(30, 215, 96,0.4)] transition-all disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Send Recovery Link</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
