// Service Worker for handling push notifications
console.log('[SW] Service Worker loaded')

self.addEventListener('push', event => {
  console.log('[SW] Push notification received:', event.data)
  
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || 'notification',
    requireInteraction: true,
    data: data.data,
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked')
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus()
      }
      return clients.openWindow('/admin')
    })
  )
})
