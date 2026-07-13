'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Mail, Lock, ArrowRight, Chrome, Zap, X } from 'lucide-react';

interface LoginOverlayProps {
  feature?: string | null;
  onClose: () => void;
}

export default function LoginOverlay({ feature, onClose }: LoginOverlayProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error || 'Login failed');
      } else if (result?.ok) {
        if (window.location.pathname === '/login' || window.location.pathname === '/register') {
          window.location.href = '/';
        } else {
          window.location.reload();
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full max-w-[100vw] relative flex flex-col bg-black/40 backdrop-blur-md overflow-y-auto overflow-x-hidden p-4 sm:p-8">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#1ED760]/20 rounded-full blur-[120px] pointer-events-none opacity-50 mix-blend-screen animate-pulse duration-1000"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none opacity-50 mix-blend-screen"></div>

      <div className="m-auto w-full max-w-5xl flex flex-col md:flex-row rounded-3xl overflow-hidden glass-panel border border-white/5 shadow-2xl relative z-10 flex-shrink-0 my-8 md:my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors z-50 group border border-white/10"
        >
          <X className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
        </button>

        {/* Left Side: Branding / Hero (Hidden on smaller screens) */}
        <div className="hidden md:flex flex-col justify-between flex-1 p-12 bg-gradient-to-br from-[#111827]/80 to-[#0A0F1E]/90 border-r border-white/5 relative overflow-hidden">
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>

          <div>
            <div className="mb-6">
              <img
                src="/wordmark-transparent.png"
                alt="Scooterfy"
                className="h-10 object-contain drop-shadow-md"
              />
            </div>
            <div className="text-5xl font-black tracking-tight text-white mb-4 leading-tight">
              Unlock Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1ED760] to-emerald-400">
                Next Ride.
              </span>
            </div>
            <p className="text-lg text-slate-400 max-w-sm">
              Instant access to thousands of premium electric scooters across your city. Sign in to
              start moving.
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <span>Secure Access</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
            <span>Real-time Telemetry</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
            <span>Zero Emissions</span>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-[400px] lg:w-[480px] p-6 sm:p-8 bg-[#1A2235]/60 backdrop-blur-xl flex flex-col justify-center relative">
          {/* Mobile Logo */}
          <div className="mb-6 md:hidden">
            <img
              src="/wordmark-transparent.png"
              alt="Scooterfy"
              className="h-8 object-contain drop-shadow-md"
            />
          </div>

          <div className="text-3xl font-bold text-white mb-2">
            {feature ? `Access Required` : `Welcome Back`}
          </div>
          <p className="text-slate-400 mb-6">
            {feature
              ? `Please sign in to securely access ${feature}.`
              : `Enter your credentials to access your wallet and ride history.`}
          </p>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium mb-6 flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
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

            <div className="relative group">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold tracking-wider text-slate-500 uppercase transition-colors group-focus-within:text-[#1ED760]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#1ED760] hover:text-[#1ED760]/80 transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#1ED760] transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-[#1ED760]/50 focus:ring-1 focus:ring-[#1ED760]/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full h-12 bg-[#1ED760] text-black font-bold text-lg rounded-xl flex items-center justify-center gap-2 overflow-hidden transform hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(30, 215, 96,0.4)] transition-all disabled:opacity-70 disabled:hover:translate-y-0 mt-4"
            >
              {loading ? (
                <span className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Sign In to Ride</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-4 my-8 opacity-60">
            <div className="h-px bg-gradient-to-r from-transparent to-white/20 flex-1"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Or Continue With
            </span>
            <div className="h-px bg-gradient-to-l from-transparent to-white/20 flex-1"></div>
          </div>

          <button
            type="button"
            onClick={() => {
              const cbUrl =
                window.location.pathname === '/login' || window.location.pathname === '/register'
                  ? '/'
                  : window.location.href;
              signIn('google', { callbackUrl: cbUrl });
            }}
            className="w-full h-12 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl flex items-center justify-center gap-3 border border-white/10 hover:border-white/20 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google Account
          </button>

          <p className="text-center text-sm text-slate-400 mt-10">
            New to Scooter?{' '}
            <Link
              href="/register"
              className="text-[#1ED760] font-bold hover:underline underline-offset-4 decoration-2"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
