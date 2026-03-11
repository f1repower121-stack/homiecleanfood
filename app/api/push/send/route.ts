import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { supabase } from '@/lib/supabase'

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivate = process.env.VAPID_PRIVATE_KEY

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(
    `mailto:admin@homiecleanfood.com`,
    vapidPublic,
    vapidPrivate.replace(/\\n/g, '\n')
  )
}

export async function POST(req: Request) {
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: 'VAPID not configured' }, { status: 500 })
  }
  try {
    const { title, body, data } = await req.json()
    const { data: subs } = await supabase.from('push_subscriptions').select('endpoint,p256dh,auth')

    if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 })

    const payload = JSON.stringify({ title, body, data: data || {} })
    const results = await Promise.allSettled(
      subs.map((s: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
      )
    )

    const failedEndpoints = subs.filter((_: unknown, i: number) => results[i].status === 'rejected').map((s: { endpoint: string }) => s.endpoint)
    if (failedEndpoints.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', failedEndpoints)
    }

    return NextResponse.json({ ok: true, sent: results.filter((r) => r.status === 'fulfilled').length })
  } catch (e) {
    console.error('Push send error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
