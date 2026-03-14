import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Import web-push (will need to install this package)
let webpush: any
try {
  webpush = require('web-push')
  webpush.setVapidDetails(
    'mailto:admin@homiecleanfood.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
} catch (err) {
  console.warn('web-push not installed, using fallback')
}

export async function POST(request: NextRequest) {
  try {
    const { title, body, data } = await request.json()

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      )
    }

    // Get all push subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (fetchError) {
      console.error('Failed to fetch subscriptions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found')
      return NextResponse.json({ sent: 0 }, { status: 200 })
    }

    // Send notifications to all subscriptions
    let sent = 0
    let failed = 0

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'new-order',
      requireInteraction: true,
      data: data || {},
    })

    for (const subscription of subscriptions) {
      try {
        if (webpush) {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              auth: subscription.auth_key,
              p256dh: subscription.p256dh_key,
            },
          }

          await webpush.sendNotification(pushSubscription, notificationPayload)
          sent++
          console.log(`✅ Push sent to ${subscription.endpoint}`)
        }
      } catch (err: any) {
        failed++
        console.error(`Failed to send push to ${subscription.endpoint}:`, err.message)

        // Remove subscription if it's invalid/expired
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id)
          console.log(`Removed expired subscription: ${subscription.endpoint}`)
        }
      }
    }

    return NextResponse.json(
      { success: true, sent, failed, total: subscriptions.length },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Send push notification error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
