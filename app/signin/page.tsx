'use client'
import { useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

function SignInForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (!data.session) throw new Error('No session returned')
        setMessage({ type: 'success', text: 'Welcome back! Redirecting...' })
        await new Promise(resolve => setTimeout(resolve, 500))
        window.location.href = redirect
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        })
        if (error) throw error
        setMessage({ type: 'success', text: '🎉 Account created! Check your email to confirm.' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-homie-cream">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-lg p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-homie-green rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-display font-bold text-2xl">H</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-homie-green">Homie Clean Food</h1>
            <p className="text-homie-gray text-sm mt-1">
              {mode === 'signin' ? 'Welcome back! Sign in to your account.' : 'Create your account to start earning loyalty points.'}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex bg-homie-cream rounded-xl p-1 mb-6">
            {(['signin', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setMessage(null) }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === m ? 'bg-white text-homie-green shadow-sm' : 'text-homie-gray hover:text-homie-dark'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-homie-dark mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Your full name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-homie-dark mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-homie-dark mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-homie-gray hover:text-homie-dark">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {message && (
              <div className={`rounded-xl p-3 text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
              }`}>
                {message.text}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-homie-green text-white font-bold py-3.5 rounded-xl hover:bg-homie-lime transition-colors disabled:opacity-60">
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Benefits for new users */}
          {mode === 'register' && (
            <div className="mt-6 bg-homie-cream rounded-xl p-4">
              <p className="text-xs font-semibold text-homie-green mb-2">✨ Benefits of creating an account:</p>
              <ul className="text-xs text-homie-gray space-y-1">
                <li>⭐ Earn loyalty points with every order</li>
                <li>🎁 Redeem points for free meals</li>
                <li>📋 View your full order history</li>
                <li>🚀 Faster checkout every time</li>
              </ul>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-homie-gray mt-6">
          By signing in you agree to our{' '}
          <Link href="/contact" className="text-homie-lime hover:underline">Terms & Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-homie-cream">
        <p className="text-homie-gray">Loading...</p>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
