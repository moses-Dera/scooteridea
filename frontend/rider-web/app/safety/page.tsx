'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SafetyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white">
      <div className="sticky top-0 z-40 pt-20 px-6 pb-6 border-b border-white/5 bg-[#0A0D14]/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.push('/menu')}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="text-2xl font-bold">Safety Rules</div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="bg-primary p-6 rounded-3xl text-black flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-black/10 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black mb-2 tracking-tight">Ride Safe, Ride Smart</h2>
          <p className="text-black/70 font-medium text-sm leading-relaxed">
            Your safety and the safety of pedestrians is our top priority. Please follow these city
            guidelines.
          </p>
        </div>

        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex gap-4 items-start">
            <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
            <div>
              <h3 className="font-bold text-white mb-1">Wear a Helmet</h3>
              <p className="text-sm text-slate-400">
                Always wear a certified helmet when riding. Protect your head at all times.
              </p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex gap-4 items-start">
            <AlertTriangle className="w-6 h-6 text-warning shrink-0" />
            <div>
              <h3 className="font-bold text-white mb-1">Stay off Sidewalks</h3>
              <p className="text-sm text-slate-400">
                Ride in bike lanes or close to the right edge of the street. Yield to pedestrians.
              </p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex gap-4 items-start">
            <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
            <div>
              <h3 className="font-bold text-white mb-1">Park Responsibly</h3>
              <p className="text-sm text-slate-400">
                Use designated docks. Do not block driveways, crosswalks, or wheelchair ramps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
