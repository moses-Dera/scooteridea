'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell } from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();

  // Local state only for now since notifications are handled via Expo Push Tokens
  const [promotions, setPromotions] = useState(true);
  const [tripUpdates, setTripUpdates] = useState(true);
  const [accountAlerts, setAccountAlerts] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('push_prefs');
    if (saved) {
      const parsed = JSON.parse(saved);
      setPromotions(parsed.promotions ?? true);
      setTripUpdates(parsed.tripUpdates ?? true);
      setAccountAlerts(parsed.accountAlerts ?? true);
    }
  }, []);

  const toggle = (key: string, val: boolean, setter: any) => {
    setter(!val);
    localStorage.setItem(
      'push_prefs',
      JSON.stringify({
        promotions: key === 'promotions' ? !val : promotions,
        tripUpdates: key === 'tripUpdates' ? !val : tripUpdates,
        accountAlerts: key === 'accountAlerts' ? !val : accountAlerts,
      }),
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white">
      <div className="sticky top-0 z-40 pt-20 px-6 pb-6 border-b border-white/5 bg-[#0A0D14]/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-2xl font-bold">Push Notifications</div>
        </div>
      </div>

      <div className="px-6 py-8 space-y-6">
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-start gap-4">
              <Bell className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-200">Trip Updates</div>
                <div className="text-xs text-slate-500 mt-1">
                  Receipts, ride start/end confirmations.
                </div>
              </div>
            </div>
            <button
              onClick={() => toggle('tripUpdates', tripUpdates, setTripUpdates)}
              className={`w-12 h-7 rounded-full relative transition-colors ${tripUpdates ? 'bg-primary' : 'bg-white/10'}`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${tripUpdates ? 'right-1' : 'left-1'}`}
              ></div>
            </button>
          </div>

          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-start gap-4">
              <Bell className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-200">Account & Security</div>
                <div className="text-xs text-slate-500 mt-1">
                  Wallet low balance, password changes.
                </div>
              </div>
            </div>
            <button
              onClick={() => toggle('accountAlerts', accountAlerts, setAccountAlerts)}
              className={`w-12 h-7 rounded-full relative transition-colors ${accountAlerts ? 'bg-primary' : 'bg-white/10'}`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${accountAlerts ? 'right-1' : 'left-1'}`}
              ></div>
            </button>
          </div>

          <div className="p-5 flex items-center justify-between">
            <div className="flex items-start gap-4">
              <Bell className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-200">Promotions</div>
                <div className="text-xs text-slate-500 mt-1">
                  Discounts, new features, and news.
                </div>
              </div>
            </div>
            <button
              onClick={() => toggle('promotions', promotions, setPromotions)}
              className={`w-12 h-7 rounded-full relative transition-colors ${promotions ? 'bg-primary' : 'bg-white/10'}`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${promotions ? 'right-1' : 'left-1'}`}
              ></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
