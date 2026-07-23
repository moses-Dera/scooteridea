'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, AlertOctagon } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ReportPage() {
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
          <div className="text-2xl font-bold">Report a Problem</div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 mb-8">
          <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-200/90 font-medium leading-relaxed">
            Use this form to report damaged bikes, illegal parking, or app bugs. In case of
            emergency, please call 112 or local authorities immediately.
          </p>
        </div>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            toast.success('Report submitted successfully!');
            router.push('/menu');
          }}
        >
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2 ml-1">Issue Type</label>
            <select className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 appearance-none">
              <option value="" disabled selected>
                Select an issue...
              </option>
              <option value="damaged">Damaged Bike</option>
              <option value="parking">Illegal Parking</option>
              <option value="app">App Bug / Crash</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2 ml-1">
              Bike ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 84920"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2 ml-1">Description</label>
            <textarea
              rows={4}
              placeholder="Please describe the problem..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 placeholder:text-slate-500 resize-none"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2 ml-1">
              Photo Evidence
            </label>
            <div className="w-full border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:bg-white/5 hover:border-primary/50 transition-colors cursor-pointer">
              <Camera className="w-8 h-8 mb-2" />
              <span className="text-sm font-bold">Tap to upload photo</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-primary text-black font-bold rounded-xl shadow-glow-primary hover:scale-[1.02] transition-transform"
          >
            Submit Report
          </button>
        </form>
      </div>
    </div>
  );
}
