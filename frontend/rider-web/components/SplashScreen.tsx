'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

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
      <div className="relative flex flex-col items-center w-64 h-64 sm:w-80 sm:h-80">
        {/* Dim Base Logo */}
        <Image
          src="/wordmark-transparent.png"
          alt="Scooterfy Base"
          fill
          priority
          sizes="(max-width: 640px) 256px, 320px"
          className="object-contain opacity-30"
        />

        {/* Bright Colored Logo (Reveals from left to right) */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}>
          <Image
            src="/wordmark-transparent.png"
            alt="Scooterfy Loading"
            fill
            priority
            sizes="(max-width: 640px) 256px, 320px"
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}
