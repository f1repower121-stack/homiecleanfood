# Web Push Notifications Setup Guide

## What's Implemented
This system sends push notifications to your phone's lock screen when new orders arrive, **even when the admin dashboard is closed or not actively used**.

## How It Works
1. **Service Worker** runs in background on your phone
2. When a new order is received, it's detected by the admin dashboard
3. A server-side API sends Web Push notifications to all subscribed devices
4. Notifications appear on lock screen via browser push service

## Setup Steps

### 1. Create Database Table (REQUIRED)
Run this SQL in your Supabase SQL Editor:

```sql
-- Create push subscriptions table for Web Push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  auth_key TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert their own subscription
CREATE POLICY "Allow insert push subscriptions" ON push_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow anyone to delete their own subscription
CREATE POLICY "Allow delete push subscriptions" ON push_subscriptions
  FOR DELETE
  USING (true);

-- Create policy to view all subscriptions (for server-side push)
CREATE POLICY "Allow select push subscriptions" ON push_subscriptions
  FOR SELECT
  USING (true);

-- Create index on endpoint for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
```

### 2. Test on Your Phone
1. Go to `https://homiecleanfood.vercel.app/admin`
2. Sign in with password
3. You'll see a notification permission request - **Click Allow**
4. Navigate away or close the browser tab
5. Place a test order from the main app
6. **Check your phone lock screen** - you should see the notification

## Features
✅ Lock screen notifications when app is closed
✅ Background delivery via Web Push Protocol
✅ Works even when not actively using the dashboard
✅ Shows order details (customer name, items, total)
✅ Clicking notification opens admin dashboard
✅ Multiple devices can receive notifications

## Environment Variables
Already configured:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Browser push service key
- `VAPID_PRIVATE_KEY` - Server signing key
- `NEXT_PUBLIC_SITE_URL` - https://homiecleanfood.vercel.app

## API Endpoints
- `POST /api/subscribe-push` - Subscribe device to notifications
- `POST /api/unsubscribe-push` - Unsubscribe device
- `POST /api/send-push-notification` - Send to all subscribed devices (internal)

## Troubleshooting

### Notifications not appearing?
1. **Check browser settings**: Settings → Notifications → Allow homiecleanfood.vercel.app
2. **Verify Service Worker**: Open DevTools → Application → Service Workers (should show active)
3. **Check subscription**: Open DevTools → Console, look for "✅ Successfully subscribed to Web Push notifications"
4. **Restart browser**: Close and reopen the admin dashboard

### Still not working?
1. Go to admin dashboard
2. Open DevTools → Console
3. Look for any error messages starting with "❌"
4. Create a test order and check console for "✅ Web Push sent to X/Y subscribers"

## Notes
- First time setup: Approve notification permission when prompted
- Notifications persist until you explicitly disable them in browser settings
- Each device needs its own subscription (phone, tablet, laptop all separate)
- Works on any modern browser: Chrome, Firefox, Edge, Brave, etc.
