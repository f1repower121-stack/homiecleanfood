# 🔧 Debug: Push Notifications Not Working

## Quick Test URL

Visit this in your browser to check everything:
```
https://homiecleanfood.vercel.app/api/debug-push
```

You'll see a JSON response showing:
- ✅ VAPID keys configured
- ✅ Web-push library status
- ✅ Database connection
- ✅ How many subscriptions exist
- ✅ Test push attempt

---

## Step-by-Step Debug Checklist

### 1️⃣ Check Service Worker Registration

**On admin page, open Developer Tools (F12):**

Go to: **Application → Service Workers**

You should see:
```
https://homiecleanfood.vercel.app/sw.js
Status: activated and running ✅
```

If NOT there:
- Refresh the page
- Check Console for errors (red text)
- Try in incognito/private mode

---

### 2️⃣ Check Notification Permission

**In Console (F12 → Console tab), run:**
```javascript
Notification.permission
```

Expected output:
```
"granted"
```

If shows `"denied"`:
1. Go to browser settings → Notifications
2. Find `homiecleanfood.vercel.app`
3. Click the X to remove it
4. Refresh page and click Allow again

---

### 3️⃣ Check Browser Console for Errors

**Open Console (F12) and look for messages:**

You should see (in order):
```
✅ Service Worker registered
✅ Notifications enabled
✅ Push subscription created: https://fcm.googleapis.com/...
✅ Subscription stored on server
✅ Successfully subscribed to Web Push notifications
```

If you see any ❌ errors, copy them and check the list below.

---

### 4️⃣ Check Subscriptions in Database

**Go to Supabase → SQL Editor → New Query:**

```sql
SELECT COUNT(*) as total_subscriptions FROM push_subscriptions;
```

Should return: `total_subscriptions: 1` or more

If returns `0`:
- Admin hasn't subscribed yet
- Or subscription storage failed (check console errors)

---

### 5️⃣ Test the Debug Endpoint

**Visit this URL:**
```
https://homiecleanfood.vercel.app/api/debug-push
```

**Look for this in the JSON response:**

```json
{
  "checks": {
    "vapidKeys": {
      "publicKeyExists": true,
      "privateKeyExists": true,
      "publicKeyLength": 88
    },
    "webpush": {
      "installed": true,
      "version": "3.6.7"
    },
    "database": {
      "connected": true,
      "error": null
    },
    "subscriptions": {
      "count": 1,
      "error": null,
      "endpoints": [...]
    },
    "testPush": {
      "sent": true,
      "message": "Test push sent successfully"
    }
  }
}
```

**What each section means:**

| Section | Expected | If Different |
|---------|----------|--------------|
| `vapidKeys.publicKeyExists` | `true` | VAPID keys not configured |
| `webpush.installed` | `true` | web-push package not installed |
| `database.connected` | `true` | Database connection failed |
| `subscriptions.count` | `≥ 1` | No subscriptions stored |
| `testPush.sent` | `true` | Push delivery failed |

---

## 🐛 Common Issues & Fixes

### Issue: "Notifications not supported"
**Problem**: Browser doesn't support Web Push
**Solution**: Use Chrome, Firefox, Edge, or Brave
**Not supported**: Safari, older browsers

### Issue: "Failed to subscribe to push notifications"
**Problem**: Service Worker didn't load
**Check**:
1. Is Service Worker active? (Application → Service Workers)
2. Are there console errors?
3. Try refreshing the page

### Issue: "No push subscriptions found"
**Problem**: Subscription wasn't saved to database
**Check**:
1. Did you click "Allow" for notifications?
2. Check console for "✅ Subscription stored on server"
3. Run SQL query to verify: `SELECT * FROM push_subscriptions;`

### Issue: "Test push sent but no notification"
**Problem**: Browser received push but doesn't show it
**Try**:
1. Check browser notification settings
2. Try on lock screen (close browser tab first)
3. Check if notification was blocked
4. Try refreshing page and testing again

### Issue: "Test notifications work but order notifications don't"
**Problem**: Order detection or server-side push not triggering
**Check**:
1. Admin dashboard must stay open to detect new orders
2. Polling runs every 10 seconds - wait up to 15 seconds
3. Check Console for "✅ Web Push sent to X subscribers"
4. Try placing an order while admin dashboard is open

---

## 📋 Full Debugging Script

Copy and paste in browser Console (F12):

```javascript
console.log('=== PUSH NOTIFICATIONS DEBUG ===')

// Check 1: Notification API
console.log('1. Notification API:', 'Notification' in window ? '✅' : '❌')
console.log('   Permission:', Notification.permission)

// Check 2: Service Worker
navigator.serviceWorker.ready.then(reg => {
  console.log('2. Service Worker:', '✅')
  console.log('   Registration:', reg)
}).catch(err => {
  console.log('2. Service Worker: ❌', err)
})

// Check 3: Push Manager
navigator.serviceWorker.ready.then(async reg => {
  const subscription = await reg.pushManager.getSubscription()
  console.log('3. Push Subscription:', subscription ? '✅' : '❌')
  if (subscription) {
    console.log('   Endpoint:', subscription.endpoint.substring(0, 50) + '...')
  }
}).catch(err => {
  console.log('3. Push Manager Error:', err)
})

console.log('=== END DEBUG ===')
```

---

## 🚀 Manual Test Without Order

**URL to manually send test push:**
```
https://homiecleanfood.vercel.app/api/test-push-send?message=Manual%20Test%20Notification
```

Expected: Notification appears immediately on lock screen

---

## 📱 Mobile Testing

**Important checklist:**
- [ ] Phone connected to WiFi/LTE
- [ ] Browser notifications enabled in phone settings
- [ ] Admin page opened in browser on phone (not app)
- [ ] Clicked "Allow" for notification permission
- [ ] Closed browser tab after subscribing
- [ ] Waited 10+ seconds before placing order
- [ ] Checked phone lock screen (not just in-app notification)

---

## 🔍 Network Debugging

**Open Network tab (F12 → Network)**

When admin dashboard loads, you should see requests:
- ✅ `POST /api/subscribe-push` - Status 201 (subscription saved)
- When order arrives: `POST /api/send-push-notification` - Status 200

If you see errors:
1. Click the failed request
2. Go to Response tab
3. Copy the error message
4. Share with technical support

---

## 💡 Still Not Working?

**Collect this info and share:**

1. Screenshot of Browser Console (F12)
2. Output from `/api/debug-push` endpoint
3. Result of SQL query: `SELECT * FROM push_subscriptions;`
4. What happens when you visit `/api/test-push-send` endpoint
5. Browser type and version
6. Phone OS and browser version

Then we can debug from there! 🔧
