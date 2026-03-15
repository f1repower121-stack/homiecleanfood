import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Fetch ALL referrals (bypasses RLS) for admin dashboard
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('id, referrer_id, referral_code, referred_user_id, status, created_at, completed_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ [ADMIN] Error fetching referrals:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Enrich with profile names (referrer_id and referred_user_id = profiles.id)
    const ids = new Set<string>()
    ;(referrals || []).forEach((r: any) => {
      if (r.referrer_id) ids.add(r.referrer_id)
      if (r.referred_user_id) ids.add(r.referred_user_id)
    })

    let profilesMap: Record<string, { full_name: string }> = {}
    if (ids.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(ids))
      ;(profiles || []).forEach((p: any) => {
        profilesMap[p.id] = { full_name: p.full_name || 'Unknown' }
      })
    }

    const enriched = (referrals || []).map((r: any) => ({
      ...r,
      referrer_name: profilesMap[r.referrer_id]?.full_name || 'Unknown',
      referred_user_name: profilesMap[r.referred_user_id]?.full_name || 'Unknown',
    }))

    // Get unique referral codes from profiles for the "active codes" list
    const { data: profilesWithCode } = await supabase
      .from('profiles')
      .select('id, full_name, referral_code')
      .not('referral_code', 'is', null)

    return NextResponse.json({
      referrals: enriched,
      totalReferrals: enriched.length,
      completedCount: enriched.filter((r: any) => r.status === 'completed').length,
      pendingCount: enriched.filter((r: any) => r.status === 'pending').length,
      referralCodes: profilesWithCode || [],
    })
  } catch (err: any) {
    console.error('❌ [ADMIN] Referrals error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
