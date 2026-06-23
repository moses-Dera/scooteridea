'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Zap, X, Mail, Lock } from 'lucide-react';

interface LoginPanelProps {
  onClose: () => void;
}

export default function LoginPanel({ onClose }: LoginPanelProps) {
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
        // Success - force a router refresh or just close the panel
        // Wait for session to update
        window.location.reload(); 
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00FFA3]/10 flex items-center justify-center border border-[#00FFA3]/30">
            <Zap className="w-5 h-5 text-[#00FFA3] fill-[#00FFA3]" />
          </div>
          <div className="text-2xl font-bold text-white">Sign In</div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="flex-1 flex flex-col">
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#00FFA3] transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rider@example.com"
                className="w-full bg-[#0A0F1E] text-white border border-white/10 rounded-xl px-12 py-4 focus:outline-none focus:border-[#00FFA3]/50 focus:ring-1 focus:ring-[#00FFA3]/50 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <button type="button" className="text-xs font-semibold text-[#00FFA3] hover:text-[#00CC7F] transition-colors">
                Forgot?
              </button>
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#00FFA3] transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0A0F1E] text-white border border-white/10 rounded-xl px-12 py-4 focus:outline-none focus:border-[#00FFA3]/50 focus:ring-1 focus:ring-[#00FFA3]/50 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl bg-[#00FFA3] hover:bg-[#00CC7F] text-black font-bold text-lg transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,163,0.3)] mb-6 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
          ) : (
            'Sign In to Ride'
          )}
        </button>
      </form>
    </div>
  );
}
