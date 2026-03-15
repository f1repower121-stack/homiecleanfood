import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/** GET loyalty point history - derived from orders, referrals, redemptions + manual log */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: config } = await supabase.from('loyalty_config').select('*').eq('id', 'singleton').single()
    const cfg = config || {
      points_per_baht: 0.01,
      referral_bonus: 100,
      multiplier_homie: 1,
      multiplier_clean_eater: 1.5,
      multiplier_protein_king: 2,
      tier_clean_eater: 200,
      tier_protein_king: 500,
    }

    const ptsMult = (tier: string) =>
      tier === 'Protein King' ? (cfg.multiplier_protein_king ?? 2) : tier === 'Clean Eater' ? (cfg.multiplier_clean_eater ?? 1.5) : (cfg.multiplier_homie ?? 1)
    const getTier = (pts: number) => pts >= (cfg.tier_protein_king ?? 500) ? 'Protein King' : pts >= (cfg.tier_clean_eater ?? 200) ? 'Clean Eater' : 'Homie'

    type Entry = { user_id: string; user_name: string; points_delta: number; source: string; reference_id: string | null; reference_label: string | null; created_at: string }

    const entries: Entry[] = []
    const names: Record<string, string> = {}

    const getProfileName = async (id: string) => {
      if (names[id]) return names[id]
      const { data } = await supabase.from('profiles').select('full_name').eq('id', id).single()
      names[id] = data?.full_name || 'Unknown'
      return names[id]
    }

    // 1. Manual transactions
    let q = supabase.from('loyalty_point_transactions').select('*').order('created_at', { ascending: false })
    if (userId) q = q.eq('user_id', userId)
    const { data: manual } = await q
    for (const m of manual || []) {
      const n = await getProfileName(m.user_id)
      entries.push({
        user_id: m.user_id,
        user_name: n,
        points_delta: m.points_delta,
        source: m.source,
        reference_id: m.reference_id,
        reference_label: m.reference_type || null,
        created_at: m.created_at,
      })
    }

    // 2. Orders → points earned (derive)
    let ordersQ = supabase.from('orders').select('id, user_id, total, created_at').not('user_id', 'is', null).order('created_at', { ascending: false })
    if (userId) ordersQ = ordersQ.eq('user_id', userId)
    const { data: orders } = await ordersQ
    for (const o of orders || []) {
      const { data: prof } = await supabase.from('profiles').select('points').eq('id', o.user_id).single()
      const tier = getTier(prof?.points ?? 0)
      const pts = Math.floor((o.total || 0) * (cfg.points_per_baht ?? 0.01) * ptsMult(tier))
      if (pts > 0) {
        entries.push({
          user_id: o.user_id,
          user_name: await getProfileName(o.user_id),
          points_delta: pts,
          source: 'order',
          reference_id: o.id,
          reference_label: `Order ฿${(o.total || 0).toLocaleString()}`,
          created_at: o.created_at,
        })
      }
    }

    // 3. Referrals → referrer gets bonus
    let refQ = supabase.from('referrals').select('id, referrer_id, referred_user_id, status, created_at, completed_at').eq('status', 'completed').order('completed_at', { ascending: false })
    const { data: referrals } = await refQ
    for (const r of referrals || []) {
      if (userId && r.referrer_id !== userId) continue
      const bonus = cfg.referral_bonus ?? 100
      const referredName = await getProfileName(r.referred_user_id)
      entries.push({
        user_id: r.referrer_id,
        user_name: await getProfileName(r.referrer_id),
        points_delta: bonus,
        source: 'referral',
        reference_id: r.id,
        reference_label: `Referred: ${referredName}`,
        created_at: r.completed_at || r.created_at,
      })
    }

    // 4. Redemptions (spent points)
    let redQ = supabase.from('loyalty_redemptions').select('*').order('created_at', { ascending: false })
    if (userId) redQ = redQ.eq('user_id', userId)
    const { data: redemptions } = await redQ
    for (const r of redemptions || []) {
      entries.push({
        user_id: r.user_id,
        user_name: await getProfileName(r.user_id),
        points_delta: -(r.points_spent || 0),
        source: 'redemption',
        reference_id: r.id,
        reference_label: r.reward_name || 'Redeemed',
        created_at: r.created_at,
      })
    }

    entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ transactions: entries.slice(0, 500) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
