'use client';
import { AlertTriangle, Camera, Send, ArrowLeft, X } from 'lucide-react';
import { useState } from 'react';

export default function ReportPanel({ onClose }: { onClose: () => void }) {
  const [issueType, setIssueType] = useState('broken_vehicle');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="px-6 py-12 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
          <Send className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Report Received</h2>
        <p className="text-slate-400 mb-6">
          Thank you for helping keep our fleet safe and reliable. Our team is reviewing your report.
        </p>
        <button
          onClick={onClose}
          className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 text-white space-y-6">
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-panel', { detail: 'menu' }))}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex flex-shrink-0 items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-warning" /> Report Issue
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex flex-shrink-0 items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-slate-300" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Issue Type
          </label>
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
            className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary appearance-none"
          >
            <option value="broken_vehicle">Broken Vehicle</option>
            <option value="illegal_parking">Illegal Parking</option>
            <option value="app_bug">App Bug / Glitch</option>
            <option value="billing">Billing Issue</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please describe the issue in detail..."
            rows={4}
            className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary resize-none"
          ></textarea>
        </div>

        <button className="w-full bg-white/5 border border-white/10 border-dashed rounded-xl py-4 flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
          <Camera className="w-5 h-5" /> Attach Photo (Optional)
        </button>

        <button
          onClick={handleSubmit}
          disabled={description.trim() === '' || submitting}
          className="w-full mt-4 py-4 bg-primary disabled:bg-primary/30 disabled:text-slate-500 text-black font-bold rounded-xl shadow-glow-primary transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              Sending...
            </>
          ) : (
            'Submit Report'
          )}
        </button>
      </div>
    </div>
  );
}
