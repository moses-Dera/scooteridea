'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';

export default function LanguagePage() {
  const router = useRouter();
  const [selected, setSelected] = useState('en');

  const languages = [
    { code: 'en', name: 'English (US)' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'pt', name: 'Português' },
  ];

  useEffect(() => {
    const saved = localStorage.getItem('language');
    if (saved) setSelected(saved);
  }, []);

  const handleSelect = (code: string) => {
    setSelected(code);
    localStorage.setItem('language', code);
    // In a real app, you would trigger an i18n context update or reload here
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white">
      <div className="sticky top-0 z-40 pt-20 px-6 pb-6 border-b border-white/5 bg-[#0A0D14]/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.push('/settings')}
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
          <div className="text-2xl font-bold">Language</div>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          {languages.map((lang) => (
            <div
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className="p-5 border-b border-white/5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
            >
              <div
                className={`font-semibold ${selected === lang.code ? 'text-primary' : 'text-slate-200'}`}
              >
                {lang.name}
              </div>
              {selected === lang.code && <Check className="w-5 h-5 text-primary" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
