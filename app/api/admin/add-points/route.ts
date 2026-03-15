import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/** Add points and log to loyalty_point_transactions for audit trail */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
    }

    const body = await request.json()
    const { user_id, points_to_add } = body
    if (!user_id || typeof points_to_add !== 'number') {
      return NextResponse.json({ error: 'user_id and points_to_add required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { error: logErr } = await supabase.from('loyalty_point_transactions').insert({
      user_id,
      points_delta: points_to_add,
      source: 'manual',
      reference_type: 'admin_adjustment',
    })
    if (logErr) console.warn('Loyalty log (table may not exist):', logErr.message)

    const { error } = await supabase.rpc('add_points', { user_id, points_to_add })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
