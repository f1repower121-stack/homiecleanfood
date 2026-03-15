import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

/**
 * API endpoint to fetch ALL orders (bypasses RLS)
 * Used by admin dashboard to show every order regardless of user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ [ADMIN] Error fetching orders:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log(`✅ [ADMIN] Loaded ${data?.length || 0} orders`)
    return NextResponse.json({ orders: data || [] })
  } catch (err: any) {
    console.error('❌ [ADMIN] Unexpected error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * PATCH: Update order (status, payment_confirmed)
 * Uses service role so updates always persist
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
    }

    const body = await request.json()
    const { orderId, status, payment_confirmed } = body

    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (status !== undefined) updates.status = status
    if (payment_confirmed !== undefined) updates.payment_confirmed = payment_confirmed

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      console.error('❌ [ADMIN] PATCH orders error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ order: data })
  } catch (err: any) {
    console.error('❌ [ADMIN] PATCH unexpected:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
