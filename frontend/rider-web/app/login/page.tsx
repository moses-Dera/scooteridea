'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      
      if (result?.error) {
        setError(result.error || 'Login failed')
      } else if (result?.ok) {
        // Redirect to home
        window.location.href = '/'
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-full min-h-screen relative flex items-center justify-center p-6 xl:flex-row bg-background overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Desktop Split Layout Hero (Hidden on Mobile) */}
      <div className="hidden xl:flex flex-col justify-center flex-1 h-full p-20 z-10">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/50 shadow-glow-primary mb-8">
           <span className="text-primary font-black text-3xl">V</span>
        </div>
        <h1 className="text-6xl font-bold tracking-tight mb-6">
          Your city,<br /> <span className="text-primary">unlocked.</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-md mb-12">
          Join thousands of riders using Scooter to commute faster, cheaper, and greener.
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 z-10 animate-in slide-in-from-bottom-8 duration-700 relative">
        
        {/* Mobile Logo */}
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/50 shadow-glow-primary mb-6 xl:hidden">
           <span className="text-primary font-black text-xl">V</span>
        </div>

        <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
        <p className="text-slate-400 mb-8">Enter your details to access your account.</p>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5 mb-8">
          <div>
            <label className="text-sm font-medium text-slate-300 ml-1 mb-1 block">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between ml-1 mb-1 block">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <Link href="#" className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">Forgot?</Link>
            </div>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-14 bg-primary text-black font-bold text-lg rounded-xl shadow-glow-primary flex items-center justify-center transform hover:scale-[1.02] transition-transform disabled:opacity-70 mt-2">
            {loading ? <span className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></span> : 'Log In'}
          </button>
        </form>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-px bg-white/10 flex-1"></div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Or</span>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>

        <button 
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full h-14 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-3 transform hover:scale-[1.02] transition-transform">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-sm text-slate-400 mt-8">
          Don't have an account? <Link href="/register" className="text-primary font-bold hover:underline">Sign up</Link>
        </p>

      </div>
    </div>
  )
}
