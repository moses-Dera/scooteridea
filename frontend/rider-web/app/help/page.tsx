'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, HelpCircle, PhoneCall } from 'lucide-react';

export default function HelpPage() {
  const router = useRouter();

  const faqs = [
    { q: "How do I start a ride?", a: "Scan the QR code on the handlebars or enter the bike ID manually to unlock." },
    { q: "Where can I park?", a: "You must park at designated 'Docks' visible on the map. Parking elsewhere incurs a penalty." },
    { q: "What if the battery dies?", a: "If the battery dies mid-ride, please park it safely on the sidewalk and end the ride in the app. You won't be charged extra." },
  ];

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white">
      <div className="sticky top-0 z-40 pt-20 px-6 pb-6 border-b border-white/5 bg-[#0A0D14]/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-2xl font-bold">Help & Support</div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8">
        
        {/* Contact Support */}
        <div>
          <h2 className="text-lg font-bold mb-4 text-slate-200">Contact Us</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="glass-panel p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors flex flex-col items-center justify-center gap-2 text-center">
              <MessageCircle className="w-6 h-6 text-primary" />
              <span className="font-bold text-sm">Live Chat</span>
            </button>
            <button className="glass-panel p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors flex flex-col items-center justify-center gap-2 text-center">
              <PhoneCall className="w-6 h-6 text-primary" />
              <span className="font-bold text-sm">Call Support</span>
            </button>
          </div>
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
