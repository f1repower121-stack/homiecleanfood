# Line Messaging API Integration Setup

## Overview
This integration sends real-time order notifications to your Line Official Account when customers place orders. You'll receive rich messages with:
- ✅ Order ID and customer details
- ✅ List of items ordered with quantities and prices
- ✅ Delivery address and time
- ✅ Total amount in Thai Baht

## What You've Set Up

### Credentials Added to `.env.local`
```
LINE_CHANNEL_ID=@homiecleanfood
LINE_CHANNEL_ACCESS_TOKEN=6b2d326271ba451b7ac4be0a7f17bdcb
LINE_USER_ID=1656987267
```

### Files Created
1. **`lib/line/client.ts`** - Line Messaging API client
2. **`lib/sendOrderLineNotification.ts`** - Order notification helper
3. **`app/api/line/webhook/route.ts`** - Webhook endpoint for receiving messages
4. **Integration in `app/order/page.tsx`** - Automatic notifications on order creation

## Complete Setup Steps

### Step 1: Get Channel Secret (IMPORTANT)
1. Go to [Line Developer Console](https://developers.line.biz)
2. Select your channel
3. Go to **Messaging API** tab
4. Copy the **Channel Secret**
5. Add to `.env.local`:
```
LINE_CHANNEL_SECRET=your_channel_secret_here
```

### Step 2: Configure Webhook URL
1. In Line Developer Console → Messaging API
2. Under **Webhook settings:**
   - URL: `https://homiecleanfood.vercel.app/api/line/webhook`
   - Enable: **Use webhook**
   - Verify: Click **Verify** button

### Step 3: Deploy to Vercel
```bash
git add .
git commit -m "feat: add Line Messaging API integration for order notifications"
git push
```

### Step 4: Test the Integration
After deployment, place a test order and check your Line account for the notification.

## How It Works

### When a Customer Places an Order:
1. Order is saved to Supabase
2. **Push notification** sent to web app users
3. **Line notification** sent to your admin account with:
   - Rich flex message with order details
   - Customer name and phone
   - List of items
   - Delivery address and time
   - Total price

### Message Format
The Line message is a **Flex Message** (rich format) that looks like:
```
┌─────────────────────┐
│ 🎯 NEW ORDER        │
│ Order #ABC1234      │
├─────────────────────┤
│ 👤 Customer: John   │
│ 📱 Phone: 081234567│
│ 📍 Address: Bangkok │
│ 🕐 Time: Today 12PM │
├─────────────────────┤
│ 2x Salad  ฿150      │
│ 1x Juice  ฿60       │
├─────────────────────┤
│ Total: ฿360         │
└─────────────────────┘
```

## Troubleshooting

### Notifications Not Sending?
1. Check `.env.local` has correct credentials
2. Verify webhook URL is set in Line Developer Console
3. Check server logs: `npm run dev` and place test order
4. Verify `LINE_USER_ID` matches your Line account ID

### Webhook Verification Failed?
1. Ensure `LINE_CHANNEL_SECRET` is correct
2. Webhook URL must be HTTPS (https://homiecleanfood.vercel.app)
3. Click "Verify" button in Line Developer Console

### Still Not Working?
Run the test script:
```bash
node scripts/test-line-integration.js
```

## Features You Can Extend

### Reply to Messages
You can handle incoming messages from customers through Line:
```typescript
// In app/api/line/webhook/route.ts
if (event.type === 'message') {
  // Handle customer messages
}
```

### Send Additional Notifications
- Order status updates (confirmed, preparing, ready)
- Delivery notifications
- Customer support requests

## Security Notes

⚠️ **Keep these secret:**
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `LINE_USER_ID`

Never commit these to version control. They're already in `.gitignore`.

## Support

For issues with Line API:
- [Line Messaging API Docs](https://developers.line.biz/en/reference/)
- [Line Bot SDK Documentation](https://line-bot-sdk-nodejs.readthedocs.io/)
