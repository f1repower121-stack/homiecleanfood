'use client'
import { useState, useEffect, useCallback } from 'react'

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function usePushNotifications() {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window && !!VAPID_KEY)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (!supported || !VAPID_KEY) return
    setLoading(true)
    try {
      if (!navigator.serviceWorker.controller) {
        await navigator.serviceWorker.register('/sw.js')
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        setSubscription(sub)
        setLoading(false)
        return
      }
      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as BufferSource,
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSub.toJSON()),
      })
      if (res.ok) setSubscription(newSub)
    } catch (err) {
      console.error('Push subscribe error:', err)
    }
    setLoading(false)
  }, [supported])

  const requestPermission = useCallback(async () => {
    if (!supported) return
    const p = await Notification.requestPermission()
    setPermission(p)
    if (p === 'granted') await subscribe()
  }, [supported, subscribe])

  return { subscription, supported, permission, loading, subscribe, requestPermission }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}
