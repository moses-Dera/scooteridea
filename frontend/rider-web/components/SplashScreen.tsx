'use client';
import { useState, useEffect } from 'react';

export default function SplashScreen() {
  const [show, setShow] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Smoothly fill the logo over ~2 seconds
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 100;
        return p + 2; // Increment 2% every 40ms
      });
    }, 40);

    const timer = setTimeout(() => setShow(false), 2400);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0D14] transition-opacity duration-500">
      <div className="relative flex flex-col items-center">
        {/* Dim Base Logo */}
        <img
          src="/wordmark-transparent.png"
          alt="Scooterfy Base"
          className="w-64 h-64 sm:w-80 sm:h-80 object-contain opacity-30"
        />

        {/* Bright Colored Logo (Reveals from left to right) */}
        <img
          src="/wordmark-transparent.png"
          alt="Scooterfy Loading"
          className="absolute top-0 left-0 w-64 h-64 sm:w-80 sm:h-80 object-contain"
          style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}
        />
      </div>
    </div>
  );
}
