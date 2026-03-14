'use client'

import { useEffect, useState } from 'react'
import { requestNotificationPermission, subscribeToPushNotifications } from '@/lib/pushNotifications'

/**
 * PushNotificationSetup Component
 *
 * Globally registers service worker and requests push notification permission
 * so users can receive order notifications when their orders are placed/updated.
 *
 * This component runs once on app load and handles:
 * - Service worker registration
 * - Notification permission request
 * - Push subscription creation
 */
export default function PushNotificationSetup() {
  const [setupDone, setSetupDone] = useState(false)

  useEffect(() => {
    if (setupDone) return

    const setupPushNotifications = async () => {
      try {
        // Step 1: Register service worker (only once)
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
            console.log('✅ Service Worker registered:', registration)
          } catch (err) {
            console.error('❌ Service Worker registration failed:', err)
          }
        }

        // Step 2: Request notification permission
        const permissionGranted = await requestNotificationPermission()

        if (permissionGranted) {
          console.log('✅ Notification permission granted')

          // Step 3: Subscribe to push notifications
          const subscribed = await subscribeToPushNotifications()
          if (subscribed) {
            console.log('✅ Successfully subscribed to push notifications')
          } else {
            console.warn('⚠️ Failed to subscribe to push notifications')
          }
        } else {
          console.log('⚠️ Notification permission denied or not supported')
        }

        setSetupDone(true)
      } catch (err) {
        console.error('❌ Push notification setup error:', err)
        setSetupDone(true)
      }
    }

    setupPushNotifications()
  }, [setupDone])

  // This component doesn't render anything visible
  return null
}
