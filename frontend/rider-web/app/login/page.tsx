'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Mail, Lock, ArrowRight, Chrome, Zap } from 'lucide-react';

export default function LoginPage() {
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
        window.location.href = '/';
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 bg-[#0A0F1E] overflow-hidden">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#00FFA3]/20 rounded-full blur-[120px] pointer-events-none opacity-50 mix-blend-screen animate-pulse duration-1000"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none opacity-50 mix-blend-screen"></div>

      <div className="w-full max-w-5xl flex rounded-3xl overflow-hidden glass-panel border border-white/5 shadow-2xl relative z-10">
        
        {/* Left Side: Branding / Hero (Hidden on smaller screens) */}
        <div className="hidden lg:flex flex-col justify-between flex-1 p-12 bg-gradient-to-br from-[#111827]/80 to-[#0A0F1E]/90 border-r border-white/5 relative overflow-hidden">
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
          
          <div>
            <div className="w-14 h-14 rounded-2xl bg-[#00FFA3]/10 flex items-center justify-center border border-[#00FFA3]/30 shadow-[0_0_20px_rgba(0,255,163,0.2)] mb-8">
               <Zap className="w-7 h-7 text-[#00FFA3] fill-[#00FFA3]" />
            </div>
            <h1 className="text-5xl font-black tracking-tight text-white mb-6 leading-tight">
              Unlock Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFA3] to-emerald-400">Next Ride.</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-sm">
              Instant access to thousands of premium electric scooters across your city. Sign in to start moving.
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
        <div className="w-full lg:w-[480px] p-8 sm:p-12 bg-[#1A2235]/60 backdrop-blur-xl flex flex-col justify-center relative">
          
          {/* Mobile Logo */}
          <div className="w-12 h-12 rounded-xl bg-[#00FFA3]/10 flex items-center justify-center border border-[#00FFA3]/30 shadow-[0_0_15px_rgba(0,255,163,0.2)] mb-8 lg:hidden">
            <Zap className="w-6 h-6 text-[#00FFA3] fill-[#00FFA3]" />
          </div>

          <div className="text-3xl font-bold text-white mb-2">Welcome Back</div>
          <p className="text-slate-400 mb-8">Enter your credentials to access your wallet and ride history.</p>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium mb-6 flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="relative group">
              <label className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-2 block transition-colors group-focus-within:text-[#00FFA3]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#00FFA3] transition-colors" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rider@example.com"
                  className="w-full h-14 bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-[#00FFA3]/50 focus:ring-1 focus:ring-[#00FFA3]/50 transition-all"
                />
              </div>
            </div>
            
            <div className="relative group">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold tracking-wider text-slate-500 uppercase transition-colors group-focus-within:text-[#00FFA3]">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-semibold text-[#00FFA3] hover:text-[#00FFA3]/80 transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#00FFA3] transition-colors" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-[#00FFA3]/50 focus:ring-1 focus:ring-[#00FFA3]/50 transition-all"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="group relative w-full h-14 bg-[#00FFA3] text-black font-bold text-lg rounded-xl flex items-center justify-center gap-2 overflow-hidden transform hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(0,255,163,0.4)] transition-all disabled:opacity-70 disabled:hover:translate-y-0 mt-4"
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
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Or Continue With</span>
            <div className="h-px bg-gradient-to-l from-transparent to-white/20 flex-1"></div>
          </div>

          <button 
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full h-14 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl flex items-center justify-center gap-3 border border-white/10 hover:border-white/20 transition-all"
          >
            <Chrome className="w-5 h-5" />
            Google Account
          </button>

          <p className="text-center text-sm text-slate-400 mt-10">
            New to Scooter?{' '}
            <Link href="/register" className="text-[#00FFA3] font-bold hover:underline underline-offset-4 decoration-2">
              Create an account
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
