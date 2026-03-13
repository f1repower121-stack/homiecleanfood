'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface ReferralTabProps {
  profile: { full_name: string | null; points: number; tier?: string; referral_code?: string } | null
  user: any
}

export default function ReferralTab({ profile, user }: ReferralTabProps) {
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchReferrals = async () => {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referred_user:profiles!referred_user_id(full_name)
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })

      if (!error) {
        setReferrals(data || [])
      }
      setLoading(false)
    }

    fetchReferrals()
  }, [user])

  const referralLink = profile?.referral_code
    ? `${window.location.origin}/signin?ref=${profile.referral_code}`
    : ''

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      alert('Referral link copied!')
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">Referral Program</h2>
        <p className="text-gray-600">Share your referral link and earn points when friends make their first order!</p>
      </div>

      {/* Referral Code */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-3">Your Referral Link</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-4 py-2 border rounded-lg bg-gray-50"
          />
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Copy
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Share this link with friends. You'll earn 100 points when they make their first order!
        </p>
      </div>

      {/* Referral Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-green-600">{referrals.length}</div>
          <div className="text-sm text-gray-600">Total Referrals</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-blue-600">
            {referrals.filter(r => r.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-purple-600">
            {referrals.filter(r => r.status === 'completed').length * 100}
          </div>
          <div className="text-sm text-gray-600">Points Earned</div>
        </div>
      </div>

      {/* Referral History */}
      <div className="bg-white rounded-xl border">
        <div className="p-6 border-b">
          <h3 className="font-semibold">Referral History</h3>
        </div>
        <div className="divide-y">
          {referrals.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No referrals yet. Share your link to get started!
            </div>
          ) : (
            referrals.map((referral) => (
              <div key={referral.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {referral.referred_user?.full_name || 'Unknown User'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(referral.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  referral.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {referral.status === 'completed' ? 'Completed (+100 pts)' : 'Pending'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}