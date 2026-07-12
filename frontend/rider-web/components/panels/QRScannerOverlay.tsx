'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, Smartphone, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QRScannerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onManualEntryClick: () => void;
}

export function QRScannerOverlay({ isOpen, onClose, onManualEntryClick }: QRScannerOverlayProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleScan = (result: any) => {
    if (result && result.length > 0) {
      const scannedText = result[0].rawValue;
      
      // Attempt to extract bikeId from the URL or text
      // E.g., if QR code is "https://scooterfy.app/unlock?bikeId=SCT123" or just "SCT123"
      try {
        let extractedBikeId = scannedText;
        
        if (scannedText.includes('http')) {
          const url = new URL(scannedText);
          const urlParams = new URLSearchParams(url.search);
          const paramId = urlParams.get('bikeId');
          if (paramId) {
            extractedBikeId = paramId;
          } else {
             // Fallback: assume the last segment of the path is the bike ID
             const parts = url.pathname.split('/');
             extractedBikeId = parts[parts.length - 1];
          }
        }
        
        // Ensure the ID is clean
        if (extractedBikeId) {
          // Close the scanner and push to the unlock URL
          onClose();
          // We can use a query param so the main page intercepts it, or push to a dedicated route
          router.push(`/?unlock=${extractedBikeId}`);
        }
      } catch (err) {
        setError("Invalid QR Code format.");
      }
    }
  };

  const handleError = (error: unknown) => {
    console.error(error);
    setError("Camera access denied or unavailable.");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 mt-safe">
            <h2 className="text-xl font-bold text-white tracking-tight">Scan to Unlock</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Scanner Area */}
          <div className="flex-1 relative flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-sm aspect-square rounded-3xl overflow-hidden border-2 border-[#1ED760]/50 relative shadow-[0_0_50px_rgba(30,215,96,0.2)]">
              {/* Corner brackets for aesthetic */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#1ED760] z-10 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#1ED760] z-10 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#1ED760] z-10 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#1ED760] z-10 rounded-br-xl" />
              
              <Scanner 
                onScan={handleScan}
                onError={handleError}
                formats={['qr_code']}
                components={{
                  onOff: true,
                  torch: true,
                  zoom: true,
                  finder: false, // We built our own custom finder box above
                }}
                styles={{
                  container: { width: '100%', height: '100%' },
                  video: { objectFit: 'cover' }
                }}
              />
            </div>
            
            {error && (
              <div className="mt-6 px-4 py-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">
                {error}
              </div>
            )}
            
            <p className="mt-8 text-slate-300 text-center text-sm max-w-xs leading-relaxed">
              Point your camera at the QR code located on the handlebars to unlock.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="p-6 pb-safe flex flex-col gap-4">
            <button 
              onClick={() => {
                onClose();
                onManualEntryClick();
              }}
              className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
            >
              <Keyboard size={20} className="text-[#1ED760]" />
              Enter Code Manually
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
