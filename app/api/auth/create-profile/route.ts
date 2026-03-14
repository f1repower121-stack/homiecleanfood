import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin client to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

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
