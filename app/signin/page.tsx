'use client'
import { useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

function SignInForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const urlRefCode = searchParams.get('ref') || ''
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [refInput, setRefInput] = useState(urlRefCode)
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
        const { data: signUpData, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name, ref_code: refInput.trim().toUpperCase() || undefined } }
        })
        if (error) throw error
        if (signUpData.session) {
          // Email confirmation disabled — session returned immediately
          setMessage({ type: 'success', text: '🎉 Account created! Redirecting...' })
          await new Promise(resolve => setTimeout(resolve, 500))
          window.location.href = redirect
        } else {
          setMessage({ type: 'success', text: '🎉 Account created! Check your email to confirm.' })
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-homie-lime rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-lime-200">
              <span className="text-white font-display font-bold text-2xl">H</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-homie-green">Homie Clean Food</h1>
            <p className="text-homie-gray text-sm mt-1.5">
              {mode === 'signin' ? 'Welcome back! Sign in to your account.' : 'Create your account to start earning loyalty points.'}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex bg-gray-50 rounded-xl p-1 mb-6">
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

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-homie-dark mb-1">
                  Referral Code <span className="text-homie-gray font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={refInput}
                  onChange={e => setRefInput(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC12345"
                  maxLength={8}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime uppercase tracking-widest"
                />
                {urlRefCode && (
                  <p className="text-xs text-homie-lime mt-1">Referral code applied from your invite link!</p>
                )}
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
            <div className="mt-6 bg-lime-50 rounded-2xl p-4 border border-lime-100">
              <p className="text-xs font-semibold text-homie-green mb-2">✨ Benefits of creating an account:</p>
              <ul className="text-xs text-homie-gray space-y-1.5">
                <li>⭐ Earn loyalty points with every order</li>
                <li>📋 View your full order history</li>
                <li>🚀 Faster checkout every time</li>
                <li>🤝 Refer friends &amp; earn 50 pts when they order</li>
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-homie-gray">Loading...</p>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
