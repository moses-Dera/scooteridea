'use client';
import { HelpCircle, ChevronDown, Mail, MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function HelpPanel({ onClose }: { onClose: () => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);

  const handleLiveChat = () => {
    setConnecting(true);
    setTimeout(() => {
      alert("All our support agents are currently busy. Please leave us an email.");
      setConnecting(false);
    }, 1500);
  };

  const faqs = [
    { q: "How do I unlock a scooter?", a: "Scan the QR code on the handlebars or enter the vehicle ID manually in the app." },
    { q: "Where can I ride?", a: "You can ride anywhere within the operational zone shown on the map. Red zones indicate no-ride areas." },
    { q: "How is pricing calculated?", a: "There is a standard per-minute rate. Surge pricing may apply during high demand. There is NO unlock fee." },
    { q: "How do I end my ride?", a: "Park the scooter in a designated parking zone (shown as green docks on the map) and tap 'End Ride' in the app." }
  ];

  return (
    <div className="px-6 pb-6 text-white space-y-6">
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-panel', { detail: 'menu' }))}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex flex-shrink-0 items-center justify-center transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-2xl font-bold flex items-center gap-2">
            Help & Support
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex flex-shrink-0 items-center justify-center transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={handleLiveChat}
          disabled={connecting}
          className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {connecting ? (
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <MessageSquare className="w-6 h-6 text-primary" />
          )}
          <span className="font-bold text-sm">{connecting ? 'Connecting...' : 'Live Chat'}</span>
        </button>
        <a 
          href="mailto:support@scooterfy.com?subject=Rider%20Support%20Request"
          className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors"
        >
          <Mail className="w-6 h-6 text-[#00D4FF]" />
          <span className="font-bold text-sm">Email Us</span>
        </a>
      </div>

      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-4">Frequently Asked Questions</div>
        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div key={idx} className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
              <button 
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
              >
                <span className="font-bold text-sm">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === idx && (
                <div className="p-4 pt-0 text-sm text-slate-400 bg-white/5">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
