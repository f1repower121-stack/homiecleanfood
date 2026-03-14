# Deployment & Testing Checklist for Web Push Notifications

## ✅ What's Been Deployed
- ✓ Web Push notification API endpoints
- ✓ Service Worker for background notifications
- ✓ Database subscription management
- ✓ Server-side push delivery system
- ✓ Admin dashboard integration
- ✓ Test endpoint for manual testing

## 🔧 Required Setup (One-time)

### Step 1: Create Database Table in Supabase
1. Go to **Supabase Dashboard** → Your Project
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the entire contents of `supabase/migrations/add_push_subscriptions_table.sql`
5. Click **Run** (blue button)
6. Wait for "Query successful" message ✓

**Expected result**: No errors, "Query successful" appears

### Step 2: Verify Environment Variables
Check that `.env.local` has these (they should already be set):
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BDiH2NB9KBWP6rsc0k_4vixSxE9RmUPEa7-XkQg6VUVMLtia7Znb6-Icr5itXqPvIiDMN1t-ohA-KbICnztPAJg
VAPID_PRIVATE_KEY=hcOe77cIDlv0TnBpBBDRcO1TgnTI2nTde3Tij4_dzC4
NEXT_PUBLIC_SITE_URL=https://homiecleanfood.vercel.app
```

✓ If present, nothing to do. If missing, add them to `.env.local`

### Step 3: Deploy to Vercel
Changes have been auto-deployed to: **https://homiecleanfood.vercel.app**

Check deployment status:
- Visit Vercel Dashboard
- Look for latest commit (852d392) → should show **✓ Ready**

## 📱 Testing on Your Phone

### Test Part 1: Enable Notifications
1. **On your phone**, open browser and go to: `https://homiecleanfood.vercel.app/admin`
2. Sign in with password
3. **You'll see a notification permission popup**
   - Click **"Allow"** (important!)
   - If you clicked "Block" by mistake, see Troubleshooting below
4. **Wait 2 seconds** - you should see in console:
   - ✅ Notifications enabled
   - ✅ Service Worker registered
   - ✅ Successfully subscribed to Web Push notifications

### Test Part 2: Send Test Notification
Option A - Via API (recommended):
```bash
curl -X POST "https://homiecleanfood.vercel.app/api/test-push-send?message=Test%20Order%20Arrived"
```

Option B - Manual test via admin:
1. Keep the admin page open on your phone
2. Place a test order from the main app (https://homiecleanfood.vercel.app)
3. Within 10 seconds, you should see the notification

### Test Part 3: Lock Screen Test (THE CRITICAL TEST)
1. **Close the browser tab** (or minimize it completely)
2. Make sure phone is NOT actively showing the admin dashboard
3. Place a test order OR run the curl command above
4. **Look at your phone lock screen** - notification should appear! 🔔

This proves it works in the background.

## ✅ Expected Results After Setup

### Console Output (Dev Tools F12)
You should see messages like:
```
✅ Service Worker registered
✅ Notifications enabled
✅ Successfully subscribed to Web Push notifications
✅ Web Push sent to 1/1 subscribers
```

### Notification Format
When an order arrives:
```
Title: 🎉 New Order from [Customer Name]
Body: [Item 1], [Item 2]... - ฿[Total]
```

### On Lock Screen
- Notification persists even with app closed
- Clicking it opens admin dashboard to `/admin`
- Shows up in notification center

## 🐛 Troubleshooting

### "Chrome/Firefox not asking for notification permission"
**Solution**: Manually allow:
1. Type in address bar: `chrome://settings/content/notifications`
2. Find `homiecleanfood.vercel.app`
3. Change to **Allow**
4. Refresh admin page

### "Notifications show on admin page but not on lock screen"
**Problem**: Service Worker not registered
**Solution**:
1. Open DevTools (F12)
2. Go to **Application** → **Service Workers**
3. Should see one listed as "active"
4. If not active:
   - Refresh page
   - Check console for errors
   - Try incognito/private mode

### "Still not receiving lock screen notifications"
**Debug steps**:
1. Check console (F12 → Console tab)
2. Look for these messages:
   - `✅ Service Worker registered` - if missing, SW didn't load
   - `✅ Subscribed to Web Push` - if missing, subscription failed
   - Check for `❌ Failed` messages

3. If you see errors:
   - Screenshot the errors
   - Check Supabase Storage buckets are accessible
   - Verify database table was created (run SQL query again)

### "I accidentally blocked notifications"
**Fix**:
1. **Chrome**: Settings → Privacy → Site Settings → Notifications → Remove homiecleanfood.vercel.app
2. **Firefox**: Preferences → Privacy → Permissions → Notifications → Remove homiecleanfood.vercel.app
3. Refresh admin page and approve again

## 🔍 Manual Verification

### Check Database Table Exists
In Supabase SQL Editor, run:
```sql
SELECT COUNT(*) as total_subscriptions FROM push_subscriptions;
```
Should return: `total_subscriptions: 1` (after subscribing once)

### Check Subscription Stored
```sql
SELECT endpoint, created_at FROM push_subscriptions ORDER BY created_at DESC LIMIT 1;
```
Should return your endpoint

## 📊 Monitoring

### View All Subscriptions
```sql
SELECT COUNT(*) FROM push_subscriptions;
```

### View Recent Subscriptions
```sql
SELECT id, endpoint, created_at FROM push_subscriptions ORDER BY created_at DESC LIMIT 10;
```

### Clean Up Old Subscriptions
```sql
DELETE FROM push_subscriptions WHERE created_at < NOW() - INTERVAL '30 days';
```

## 🎯 Success Criteria
✅ Database table created
✅ Admin can approve notifications
✅ Console shows "✅ Subscribed to Web Push"
✅ Test notification appears on lock screen when browser closed
✅ Clicking notification opens admin dashboard

Once all above pass → **Setup is complete!** 🎉
