'use client'

import { useState } from 'react'
import { X, KeyRound } from 'lucide-react'

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bikeId: string) => void;
}

export function ManualEntryModal({ isOpen, onClose, onSubmit }: ManualEntryModalProps) {
  const [bikeId, setBikeId] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (bikeId.trim()) {
      onSubmit(bikeId.trim().toUpperCase())
      setBikeId('')
      onClose()
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-surfaceLight border border-white/10 shadow-2xl shadow-primary/5 rounded-3xl p-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <X className="w-5 h-5 text-slate-400" />
        </button>

        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 mb-4">
          <KeyRound className="w-6 h-6 text-primary" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Enter Bike ID</h2>
        <p className="text-slate-400 text-sm mb-6">Type the code found below the scooter's QR code (e.g. SCT123).</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input 
            type="text" 
            value={bikeId}
            onChange={(e) => setBikeId(e.target.value)}
            placeholder="SCT..."
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 uppercase focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-lg tracking-widest text-center"
            autoFocus
          />
          
          <button 
            type="submit"
            disabled={!bikeId.trim()}
            className="w-full h-12 bg-primary text-black font-bold rounded-xl shadow-glow-primary hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
            Confirm
          </button>
        </form>
      </div>
    </div>
  )
}
