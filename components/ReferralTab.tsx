'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatDateICT } from '@/lib/dateUtils'

interface ReferralTabProps {
  profile: { full_name: string | null; points: number; tier?: string; referral_code?: string } | null
  user: any
}

export default function ReferralTab({ profile, user }: ReferralTabProps) {
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(profile?.referral_code ?? null)

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      // Fetch referral code directly — don't rely solely on parent prop
      const { data: prof } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single()
      if (prof?.referral_code) setReferralCode(prof.referral_code)

      const { data } = await supabase
        .from('referrals')
        .select('*, referred_user:profiles!referrals_referred_user_id_fkey(full_name)')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })

      setReferrals(data || [])
      setLoading(false)
    }

    fetchData()
  }, [user])

  const referralLink = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://homiecleanfood.vercel.app'}/signin?ref=${referralCode}`
    : ''

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = referralLink
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const completedCount = referrals.filter(r => r.status === 'completed').length
  const pendingCount = referrals.filter(r => r.status === 'pending').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-homie-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-homie-dark mb-1">Referral Program</h2>
        <p className="text-sm text-homie-gray">Share your link — earn <span className="font-semibold text-homie-green">50 points</span> when a friend makes their first order!</p>
      </div>

      {/* Your referral link */}
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-semibold text-homie-dark mb-1">Your Referral Link</h3>
        <p className="text-xs text-homie-gray mb-3">Anyone who registers using this link will be linked to your account.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl bg-homie-cream text-sm text-homie-dark font-mono"
          />
          <button
            onClick={copyToClipboard}
            className="px-5 py-2.5 bg-homie-green text-white text-sm font-semibold rounded-xl hover:bg-homie-lime transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        {referralCode && (
          <p className="text-xs text-homie-gray mt-2">
            Or share your code: <span className="font-bold text-homie-green tracking-widest">{referralCode}</span>
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border p-4 text-center">
          <div className="text-2xl font-bold text-homie-green">{referrals.length}</div>
          <div className="text-xs text-homie-gray mt-1">Total Referred</div>
        </div>
        <div className="bg-white rounded-2xl border p-4 text-center">
          <div className="text-2xl font-bold text-yellow-500">{pendingCount}</div>
          <div className="text-xs text-homie-gray mt-1">Pending</div>
        </div>
        <div className="bg-white rounded-2xl border p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{completedCount * 50}</div>
          <div className="text-xs text-homie-gray mt-1">Points Earned</div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-homie-cream rounded-2xl p-5">
        <h3 className="font-semibold text-homie-dark mb-3">How it works</h3>
        <div className="space-y-2 text-sm text-homie-gray">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-homie-green text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            <span>Share your referral link or code with friends</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-homie-green text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            <span>Friend registers using your link or enters the code manually</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-homie-green text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            <span>When they place their <strong>first order</strong>, you automatically receive <strong>50 points</strong></span>
          </div>
        </div>
      </div>

      {/* Referral history */}
      <div className="bg-white rounded-2xl border">
        <div className="p-5 border-b">
          <h3 className="font-semibold text-homie-dark">Referral History</h3>
        </div>
        <div className="divide-y">
          {referrals.length === 0 ? (
            <div className="p-8 text-center text-homie-gray text-sm">
              No referrals yet — share your link to get started!
            </div>
          ) : (
            referrals.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-homie-dark">
                    {r.referred_user?.full_name || 'Friend'}
                  </div>
                  <div className="text-xs text-homie-gray mt-0.5">
                    {formatDateICT(r.created_at)}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  r.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {r.status === 'completed' ? '+50 pts earned' : 'Pending first order'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
