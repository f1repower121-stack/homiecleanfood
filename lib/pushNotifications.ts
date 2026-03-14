// Push notification helper functions

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Notifications not supported')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

export function sendNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          badge: '/icon-192x192.png',
          icon: '/icon-192x192.png',
          ...options,
        })
      })
    } else {
      new Notification(title, options)
    }
  }
}

export function sendOrderNotification(orderData: {
  customerName: string
  total: number
  items: any[]
  referenceId?: string
}) {
  const itemNames = orderData.items.slice(0, 2).map((i: any) => i.name).join(', ')
  const title = `🎉 New Order from ${orderData.customerName}`
  const options: NotificationOptions = {
    body: `${itemNames}${orderData.items.length > 2 ? '...' : ''} - ฿${orderData.total}`,
    tag: 'new-order',
    requireInteraction: true,
    actions: [{ action: 'open', title: 'View Order' }],
  }

  sendNotification(title, options)
}
