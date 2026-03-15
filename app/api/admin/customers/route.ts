import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API endpoint to fetch ALL customers (bypasses RLS)
 * Used by admin dashboard to show all profiles
 * Includes email from auth.users
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, address, points, tier, created_at')
      .order('points', { ascending: false })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Get emails from auth.users via admin API
    const emailMap: Record<string, string> = {}
    let page = 1
    const perPage = 1000
    while (true) {
      const { data: { users } } = await supabase.auth.admin.listUsers({ page, perPage })
      if (!users?.length) break
      users.forEach((u: any) => { emailMap[u.id] = u.email || '' })
      if (users.length < perPage) break
      page++
    }

    const customers = (profiles || []).map((p: any) => ({
      ...p,
      email: emailMap[p.id] || '',
    }))

    const { data: orders } = await supabase.from('orders').select('user_id, total')

    return NextResponse.json({
      customers,
      orders: orders || []
    })
  } catch (err: any) {
    console.error('❌ [ADMIN] Unexpected error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/** Update customer details (full_name, phone) - points use add_points RPC */
export async function PATCH(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
    }

    const body = await request.json()
    const { customerId, full_name, phone, address } = body
    if (!customerId) {
      return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    }

    const updates: Record<string, string> = {}
    if (full_name !== undefined) updates.full_name = String(full_name)
    if (phone !== undefined) updates.phone = String(phone)
    if (address !== undefined) updates.address = String(address)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', customerId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/** Delete customer: profile first, then auth user */
export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    if (!customerId) {
      return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    await supabase.from('profiles').delete().eq('id', customerId)
    const { error } = await supabase.auth.admin.deleteUser(customerId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
