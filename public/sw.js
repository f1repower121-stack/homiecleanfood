// Service Worker for handling push notifications and background sync

console.log('[SW] Service Worker loaded')

// Handle push notifications from server
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event.data)

  let notificationData = {
    title: 'New Order Received',
    body: 'You have a new order!',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'new-order',
    requireInteraction: true,
  }

  try {
    if (event.data) {
      const data = event.data.json()
      notificationData = { ...notificationData, ...data }
    }
  } catch (err) {
    console.error('[SW] Failed to parse push data:', err)
    if (event.data) {
      notificationData.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data || {},
    })
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification)
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus admin window if already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url.includes('/admin')) {
          return client.focus()
        }
      }
      // Open admin if not already open
      if (clients.openWindow) {
        return clients.openWindow('/admin')
      }
    })
  )
})

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...')
  self.skipWaiting()
})

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...')
  event.waitUntil(clients.claim())
})
