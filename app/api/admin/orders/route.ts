import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API endpoint to fetch ALL orders (bypasses RLS)
 * Used by admin dashboard to show every order regardless of user
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ [ADMIN] Missing environment variables for orders')
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

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
