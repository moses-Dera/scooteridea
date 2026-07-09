'use client';
import { Shield, Phone, AlertTriangle, CheckCircle } from 'lucide-react';

export default function SafetyPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-6 pb-6 text-white space-y-6">
      <div className="flex items-center justify-between mb-2 pt-2">
        <div className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" /> Safety Center
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <a href="tel:112" className="w-full bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center justify-center gap-3 text-red-400 font-bold hover:bg-red-500/20 transition-colors">
        <Phone className="w-5 h-5" /> Emergency SOS (112)
      </a>

      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-2">The Golden Rules</div>
        <div className="space-y-3">
          <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex flex-shrink-0 items-center justify-center text-primary">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white mb-1">Wear a Helmet</div>
              <div className="text-xs text-slate-400">Always protect your head. We strongly recommend bringing your own helmet for every ride.</div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex flex-shrink-0 items-center justify-center text-warning">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white mb-1">One Rider Per Vehicle</div>
              <div className="text-xs text-slate-400">Tandem riding is illegal and highly dangerous. Keep it to one person per scooter.</div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#00D4FF]/20 flex flex-shrink-0 items-center justify-center text-[#00D4FF]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white mb-1">Ride in Bike Lanes</div>
              <div className="text-xs text-slate-400">Stay off the sidewalks. Use bike lanes whenever available, and follow all local traffic laws.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
