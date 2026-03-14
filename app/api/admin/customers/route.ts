import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API endpoint to fetch ALL customers (bypasses RLS)
 * Used by admin dashboard to show all profiles
 */
export async function GET(request: NextRequest) {
  try {
    // Verify environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ [ADMIN] Missing environment variables')
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
    }

    // Create admin client (uses service role, bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    console.log('📋 [ADMIN] Fetching all profiles (bypassing RLS)...')

    // Get ALL profiles - no filters, no RLS
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, points, tier, created_at')
      .order('points', { ascending: false })

    if (profileError) {
      console.error('❌ [ADMIN] Error fetching profiles:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    console.log(`✅ [ADMIN] Loaded ${profiles?.length || 0} profiles`)

    // Get all orders for spend calculations
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('user_id, total')

    if (orderError) {
      console.error('❌ [ADMIN] Error fetching orders:', orderError)
      // Still return profiles even if orders fail
      return NextResponse.json({
        customers: profiles || [],
        orders: []
      })
    }

    console.log(`✅ [ADMIN] Loaded ${orders?.length || 0} orders`)

    return NextResponse.json({
      customers: profiles || [],
      orders: orders || []
    })
  } catch (err: any) {
    console.error('❌ [ADMIN] Unexpected error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
