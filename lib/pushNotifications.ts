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

export async function subscribeToPushNotifications() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported')
      return false
    }

    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Subscribe to push notifications
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured')
        return false
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as any,
      })

      console.log('✅ Push subscription created:', subscription.endpoint)
    }

    // Store subscription on server
    const response = await fetch('/api/subscribe-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    })

    if (response.ok) {
      console.log('✅ Subscription stored on server')
      return true
    } else {
      console.error('Failed to store subscription on server')
      return false
    }
  } catch (err: any) {
    console.error('Failed to subscribe to push notifications:', err)
    return false
  }
}

export async function unsubscribeFromPushNotifications() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Notify server to remove subscription
      await fetch('/api/unsubscribe-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })

      // Unsubscribe locally
      await subscription.unsubscribe()
      console.log('✅ Unsubscribed from push notifications')
      return true
    }

    return false
  } catch (err: any) {
    console.error('Failed to unsubscribe from push notifications:', err)
    return false
  }
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
  }

  sendNotification(title, options)
}

// Helper function to convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
