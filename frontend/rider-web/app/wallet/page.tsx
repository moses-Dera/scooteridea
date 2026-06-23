'use client'

import Link from 'next/link'
import { useWallet } from '@/hooks'
import { useState } from 'react'

export default function WalletPage() {
  const { balance, loading, error, refetch } = useWallet();
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isTopping, setIsTopping] = useState(false);
  return (
    <div className="w-full h-full relative flex flex-col bg-background overflow-y-auto">
      
      {/* Header */}
      <header className="pt-20 pb-6 px-6 xl:pt-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="w-10 h-10 rounded-full glass-button flex items-center justify-center hover:bg-white/10 transition-colors">
            ←
          </Link>
          <div className="text-2xl font-bold">Wallet</div>
        </div>

        {/* Balance Card */}
        <div className="w-full bg-gradient-to-br from-surfaceLight to-surface border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
          
          {loading ? (
            <div>
              <span className="text-slate-400 font-medium text-sm uppercase tracking-wider">Available Balance</span>
              <div className="text-4xl font-black mt-2 mb-8 text-slate-500">Loading...</div>
            </div>
          ) : (
            <>
              <span className="text-slate-400 font-medium text-sm uppercase tracking-wider">Available Balance</span>
              <div className="text-4xl font-black mt-2 mb-8 text-white">₦ {balance?.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </>
          )}
          
          <div className="flex gap-4">
            <button
              onClick={() => {
                const amount = prompt('Enter amount to add (₦):');
                if (amount) {
                  setTopUpAmount(amount);
                  setIsTopping(true);
                }
              }}
              className="flex-1 h-12 bg-primary text-black font-bold rounded-xl shadow-glow-primary hover:bg-primary/90 transition-colors"
            >
              Add Money
            </button>
            <button className="flex-1 h-12 bg-white/10 border border-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors">
              Withdraw
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-6 pb-12 flex flex-col xl:flex-row gap-8">
        
        {error && (
          <div className="w-full p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
            {error}
          </div>
        )}
        
        {/* Transactions List */}
        <div className="flex-1">
          <div className="text-lg font-semibold mb-4">Recent Transactions</div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-slate-400">Loading transactions...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="p-4 rounded-2xl glass-panel flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center">🚲</div>
                  <div>
                    <p className="font-semibold text-white">Sample Transaction</p>
                    <p className="text-slate-400 text-xs mt-1">Fetching real data from backend...</p>
                  </div>
                </div>
                <span className="font-bold text-white">-₦ 0.00</span>
              </div>
            </div>
          )}
          
          <button className="w-full mt-4 py-4 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            View All Transactions
          </button>
        </div>

        {/* Payment Methods */}
        <div className="xl:w-[35%]">
          <div className="text-lg font-semibold mb-4">Payment Methods</div>
          
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-2xl glass-panel flex items-center justify-between border-primary/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-6 bg-slate-800 rounded flex items-center justify-center border border-white/10 text-xs font-bold text-slate-300">MC</div>
                <span className="font-medium">•••• 4242</span>
              </div>
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-md font-bold">Default</span>
            </div>

            <div className="p-4 rounded-2xl glass-panel flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-6 bg-slate-800 rounded flex items-center justify-center border border-white/10 text-xs font-bold text-slate-300">VV</div>
                <span className="font-medium">•••• 8910</span>
              </div>
            </div>

            <button className="w-full p-4 rounded-2xl border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2 font-medium mt-2">
              <span>+</span> Add New Method
            </button>
          </div>
        </div>

      </main>
    </div>
  )
}
