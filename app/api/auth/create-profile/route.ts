import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Create profile record for new user after signup
 * This is called from the client after successful signup
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, fullName } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    console.log(`📝 [PROFILE] Creating profile for user ${userId}`)

    // Verify environment variables are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      const missing = []
      if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
      if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
      const errorMsg = `Missing environment variables: ${missing.join(', ')}`
      console.error(`❌ [PROFILE] ${errorMsg}`)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    // Create admin client at request time (not build time)
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Create profile record
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name: fullName || 'Customer',
        points: 0,
        tier: 'Homie',
        created_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error('❌ Profile creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log(`✅ Profile created for ${userId}`)
    return NextResponse.json({ success: true, profile: data })
  } catch (err: any) {
    console.error('❌ Unexpected error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
