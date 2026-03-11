export type OrderPushPayload = {
  id?: string
  customer_name?: string
  total?: number
  items?: { name: string; quantity: number; price?: number }[]
  payment_method?: string
}

export async function sendOrderPushNotification(payload: OrderPushPayload): Promise<void> {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || '')
    const res = await fetch(`${base}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '🥗 New Order!',
        body: `${payload.customer_name || 'Customer'} — ฿${(payload.total || 0).toLocaleString()}`,
        data: { url: '/admin', orderId: payload.id },
      }),
    })
    if (!res.ok) throw new Error(await res.text())
  } catch (err) {
    console.error('Push notification failed:', err)
  }
}
