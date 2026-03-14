import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const result: any = {
      timestamp: new Date().toISOString(),
      checks: {},
    }

    // Check 1: VAPID Keys
    result.checks.vapidKeys = {
      publicKeyExists: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      privateKeyExists: !!process.env.VAPID_PRIVATE_KEY,
      publicKeyLength: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.length || 0,
    }

    // Check 2: Web-push library
    let webpush: any
    try {
      webpush = require('web-push')
      result.checks.webpush = { installed: true, version: webpush.version || 'unknown' }
    } catch (err) {
      result.checks.webpush = { installed: false, error: 'web-push not installed' }
    }

    // Check 3: Database connection
    try {
      const { data: testData, error: testError, count } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact' })

      result.checks.database = {
        connected: !testError,
        error: testError?.message || null,
        query: 'push_subscriptions table accessible',
        totalRows: count,
      }
    } catch (err: any) {
      result.checks.database = {
        connected: false,
        error: err.message,
      }
    }

    // Check 4: Get subscriptions count
    try {
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')

      result.checks.subscriptions = {
        count: subscriptions?.length || 0,
        error: subError?.message || null,
        endpoints: subscriptions?.map((s: any) => ({
          id: s.id,
          endpoint: s.endpoint?.substring(0, 50) + '...',
          createdAt: s.created_at,
        })) || [],
      }
    } catch (err: any) {
      result.checks.subscriptions = {
        count: 0,
        error: err.message,
      }
    }

    // Check 5: Try to send a test push
    if (webpush && result.checks.subscriptions.count > 0) {
      webpush.setVapidDetails(
        'mailto:admin@homiecleanfood.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
      )

      try {
        const subscription = (await supabase.from('push_subscriptions').select('*').limit(1)).data?.[0]

        if (subscription) {
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
              title: '🔧 Debug Test Notification',
              body: 'This is a test from the debug endpoint',
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: 'debug-test',
              requireInteraction: true,
            })
          )

          result.checks.testPush = {
            sent: true,
            endpoint: subscription.endpoint?.substring(0, 50) + '...',
            message: 'Test push sent successfully',
          }
        }
      } catch (err: any) {
        result.checks.testPush = {
          sent: false,
          error: err.message,
          statusCode: err.statusCode,
        }
      }
    }

    return NextResponse.json(result, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}
