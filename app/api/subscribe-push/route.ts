import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json()

    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      )
    }

    const { endpoint, keys } = subscription

    // Store subscription in database
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert([
        {
          endpoint,
          auth_key: keys.auth,
          p256dh_key: keys.p256dh,
        },
      ])
      .select()

    if (error) {
      console.error('Failed to store push subscription:', error)
      return NextResponse.json(
        { error: 'Failed to store subscription' },
        { status: 500 }
      )
    }

    console.log('✅ Push subscription stored:', endpoint)

    return NextResponse.json(
      { success: true, id: data?.[0]?.id },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Push subscription error:', err)
    return NextResponse.json(
      { error: err.message || 'Subscription failed' },
      { status: 500 }
    )
  }
}
