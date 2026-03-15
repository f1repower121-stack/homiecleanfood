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
        <h2 className="text-lg font-semibold text-stone-900 mb-1">Referral Program</h2>
        <p className="text-sm text-stone-500">Share your link — earn <span className="font-semibold text-homie-green">50 points</span> when a friend makes their first order</p>
      </div>

      {/* Your referral link */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <h3 className="font-semibold text-stone-900 mb-1 text-sm">Your Referral Link</h3>
        <p className="text-xs text-stone-500 mb-3">Anyone who registers using this link will be linked to your account.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-3.5 py-2.5 border border-stone-200 rounded-lg bg-stone-50 text-sm text-stone-900 font-mono"
          />
          <button
            onClick={copyToClipboard}
            className="px-4 py-2.5 bg-homie-green text-white text-sm font-semibold rounded-lg hover:bg-homie-green/90"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        {referralCode && (
          <p className="text-xs text-stone-500 mt-2">
            Or share your code: <span className="font-semibold text-homie-green tracking-widest">{referralCode}</span>
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center shadow-sm">
          <div className="text-xl font-semibold text-stone-900 tabular-nums">{referrals.length}</div>
          <div className="text-xs text-stone-500 mt-1 font-medium">Total Referred</div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center shadow-sm">
          <div className="text-xl font-semibold text-amber-600 tabular-nums">{pendingCount}</div>
          <div className="text-xs text-stone-500 mt-1 font-medium">Pending</div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center shadow-sm">
          <div className="text-xl font-semibold text-homie-green tabular-nums">{completedCount * 50}</div>
          <div className="text-xs text-stone-500 mt-1 font-medium">Points Earned</div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-5">
        <h3 className="font-semibold text-stone-900 mb-3 text-sm">How it works</h3>
        <div className="space-y-2.5 text-sm text-stone-600">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-md bg-homie-green text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">1</span>
            <span>Share your referral link or code with friends</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-md bg-homie-green text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">2</span>
            <span>Friend registers using your link or enters the code manually</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-md bg-homie-green text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">3</span>
            <span>When they place their <strong>first order</strong>, you receive <strong>50 points</strong></span>
          </div>
        </div>
      </div>

      {/* Referral history */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900 text-sm">Referral History</h3>
        </div>
        <div className="divide-y divide-stone-100">
          {referrals.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-sm">
              No referrals yet — share your link to get started
            </div>
          ) : (
            referrals.map((r) => (
              <div key={r.id} className="px-5 py-4 flex items-center justify-between hover:bg-stone-50/50">
                <div>
                  <div className="font-medium text-sm text-stone-900">
                    {r.referred_user?.full_name || 'Friend'}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {formatDateICT(r.created_at)}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  r.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {r.status === 'completed' ? '+50 pts' : 'Pending'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
