'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, HelpCircle, PhoneCall, CheckCircle2 } from 'lucide-react';

export default function HelpPage() {
  const router = useRouter();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const faqs = [
    {
      q: 'How do I start a ride?',
      a: 'Scan the QR code on the handlebars or enter the bike ID manually to unlock.',
    },
    {
      q: 'Where can I park?',
      a: "You must park at designated 'Docks' visible on the map. Parking elsewhere incurs a penalty.",
    },
    {
      q: 'What if the battery dies?',
      a: "If the battery dies mid-ride, please park it safely on the sidewalk and end the ride in the app. You won't be charged extra.",
    },
  ];

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/proxy/auth/user/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitSuccess(true);
        setSubject('');
        setMessage('');
      } else {
        setError(data.error || 'Failed to submit ticket');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="text-2xl font-bold">Help & Support</div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8">
        {/* Contact Support */}
        <div>
          <h2 className="text-lg font-bold mb-4 text-slate-200">Submit a Request</h2>
          {submitSuccess ? (
            <div className="glass-panel p-6 rounded-2xl border border-primary/20 flex flex-col items-center justify-center text-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-primary" />
              <div>
                <h3 className="font-bold text-white text-lg">Ticket Submitted</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Our team will review your request and contact you shortly.
                </p>
              </div>
              <button
                onClick={() => setSubmitSuccess(false)}
                className="mt-2 text-primary font-bold text-sm"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmitTicket}
              className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4"
            >
              {error && (
                <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm font-medium border border-danger/20">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                  placeholder="E.g., Issue with billing"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors h-32 resize-none"
                  placeholder="Describe your issue in detail..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !subject || !message}
                className="w-full bg-primary text-black font-bold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-primary/90"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>
          )}
        </div>

        {/* FAQs */}
        <div>
          <h2 className="text-lg font-bold mb-4 text-slate-200">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="glass-panel p-5 rounded-2xl border border-white/5">
                <div className="flex items-start gap-3 mb-2">
                  <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <h3 className="font-bold text-slate-200">{faq.q}</h3>
                </div>
                <p className="text-sm text-slate-400 pl-8 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
