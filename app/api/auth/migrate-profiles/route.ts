import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Bulk migration endpoint to create profiles for existing auth users
 * This finds all auth users that don't have a profile and creates one for them
 *
 * POST /api/auth/migrate-profiles?key=ADMIN_SECRET_KEY
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin secret for security
    const { searchParams } = new URL(request.url)
    const adminKey = searchParams.get('key')
    const expectedKey = process.env.ADMIN_MIGRATION_KEY || 'migrate-profiles-secret'

    if (adminKey !== expectedKey) {
      console.error('❌ [MIGRATE] Unauthorized migration attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 [MIGRATE] Starting profile migration...')

    // Verify environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      const missing = []
      if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
      if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
      const errorMsg = `Missing environment variables: ${missing.join(', ')}`
      console.error(`❌ [MIGRATE] ${errorMsg}`)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Step 1: Get all auth users using admin API
    console.log('📋 [MIGRATE] Fetching all auth users...')
    const { data: { users: allAuthUsers }, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ [MIGRATE] Error fetching auth users:', authError)
      return NextResponse.json({ error: 'Failed to fetch auth users' }, { status: 500 })
    }

    console.log(`📋 [MIGRATE] Found ${allAuthUsers?.length || 0} total auth users`)

    // Step 2: Get all existing profiles
    console.log('📋 [MIGRATE] Fetching existing profiles...')
    const { data: existingProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')

    if (profileError) {
      console.error('❌ [MIGRATE] Error fetching profiles:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }

    const existingProfileIds = new Set((existingProfiles || []).map(p => p.id))
    console.log(`📋 [MIGRATE] Found ${existingProfileIds.size} existing profiles`)

    // Step 3: Find users without profiles
    const usersWithoutProfiles = (allAuthUsers || []).filter(user => !existingProfileIds.has(user.id))
    console.log(`📋 [MIGRATE] Found ${usersWithoutProfiles.length} users without profiles`)

    if (usersWithoutProfiles.length === 0) {
      console.log('✅ [MIGRATE] All users already have profiles!')
      return NextResponse.json({
        success: true,
        message: 'All users already have profiles',
        total_users: allAuthUsers?.length || 0,
        existing_profiles: existingProfileIds.size,
        created: 0,
        users_created: []
      })
    }

    // Step 4: Create profiles for missing users
    console.log(`📝 [MIGRATE] Creating ${usersWithoutProfiles.length} profiles...`)
    const newProfiles = usersWithoutProfiles.map(user => ({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
      email: user.email,
      points: 0,
      tier: 'Homie',
      created_at: new Date().toISOString(),
    }))

    const { data: createdProfiles, error: insertError } = await supabase
      .from('profiles')
      .insert(newProfiles)
      .select('id, full_name, email')

    if (insertError) {
      console.error('❌ [MIGRATE] Error creating profiles:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    console.log(`✅ [MIGRATE] Successfully created ${createdProfiles?.length || 0} profiles`)

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${createdProfiles?.length || 0} profiles`,
      total_users: allAuthUsers?.length || 0,
      existing_profiles: existingProfileIds.size,
      created: createdProfiles?.length || 0,
      users_created: (createdProfiles || []).map(p => ({
        id: p.id,
        name: p.full_name,
        email: p.email
      }))
    })
  } catch (err: any) {
    console.error('❌ [MIGRATE] Unexpected error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
