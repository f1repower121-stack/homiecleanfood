self.addEventListener('push', (e) => {
  const data = e.data?.json() || {}
  const title = data.title || 'New Order'
  const options = {
    body: data.body || 'You have a new order',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-72.png',
    data: data.data || {},
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url || '/admin'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length) list[0].focus()
      else clients.openWindow(url)
    })
  )
})
