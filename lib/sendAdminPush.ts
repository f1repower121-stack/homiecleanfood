/**
 * Server-side utility to send push notifications to admin subscribers.
 * Used when orders are placed (via API) and when new customers register.
 */
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivate = process.env.VAPID_PRIVATE_KEY

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(
    'mailto:admin@homiecleanfood.com',
    vapidPublic,
    vapidPrivate.replace(/\\n/g, '\n')
  )
}

export async function sendAdminPush(title: string, body: string, data?: Record<string, unknown>): Promise<number> {
  if (!vapidPublic || !vapidPrivate) return 0
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: subs } = await supabase.from('push_subscriptions').select('endpoint,p256dh_key,auth_key')
    if (!subs?.length) return 0

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'admin-notification',
      requireInteraction: true,
      data: data || {},
    })

    const results = await Promise.allSettled(
      subs.map((s: { endpoint: string; p256dh_key: string; auth_key: string }) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh_key, auth: s.auth_key } },
          payload
        )
      )
    )

    const failedEndpoints = subs.filter((_: unknown, i: number) => results[i].status === 'rejected').map((s: { endpoint: string }) => s.endpoint)
    if (failedEndpoints.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', failedEndpoints)
    }

    return results.filter((r) => r.status === 'fulfilled').length
  } catch (e) {
    console.error('sendAdminPush error:', e)
    return 0
  }
}
