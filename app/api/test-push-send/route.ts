import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Simple test endpoint to manually send test push notifications
// Usage: POST /api/test-push-send with optional ?message=custom_message
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customMessage = searchParams.get('message') || 'Test Order from Homie Clean Food'

    // Get all subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint')

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions', details: fetchError },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No subscriptions found. Subscribe first in admin dashboard.' },
        { status: 400 }
      )
    }

    // Try to send using web-push
    let webpush: any
    try {
      webpush = require('web-push')
      webpush.setVapidDetails(
        'mailto:admin@homiecleanfood.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
      )
    } catch (err) {
      return NextResponse.json(
        {
          error: 'web-push library not available',
          subscriptionsFound: subscriptions.length,
          subscriptions: subscriptions.map((s: any) => ({ id: s.id, endpoint: s.endpoint })),
        },
        { status: 200 }
      )
    }

    let sent = 0
    let failed = 0

    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            auth: subscription.auth_key,
            p256dh: subscription.p256dh_key,
          },
        }

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title: '🎉 Test Notification',
            body: customMessage,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: 'test-notification',
            requireInteraction: true,
          })
        )
        sent++
      } catch (err: any) {
        failed++
        console.error(`Failed to send to ${subscription.endpoint}:`, err.message)
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Test notification sent to ${sent}/${subscriptions.length} devices`,
        sent,
        failed,
        total: subscriptions.length,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Test push error:', err)
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
