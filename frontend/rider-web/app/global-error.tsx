"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Rider App Global Error:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-white antialiased flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3 text-center tracking-tight">Oops! Something snapped</h2>
        <p className="text-slate-400 max-w-md mx-auto mb-10 text-center text-lg">
          We couldn't load this part of the app. Our team has been notified.
        </p>
        <button
          onClick={() => reset()}
          className="w-full max-w-xs py-4 rounded-full bg-[#1ED760] text-black font-bold text-lg hover:bg-[#00cc82] transition-colors shadow-lg shadow-[#1ED760]/20 active:scale-95"
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
