'use server';

import { getLineClient } from '@/lib/line/client';
import { menuItems } from '@/lib/menuData';

export interface OrderNotificationData {
  id: string;
  customer_name: string;
  customer_phone: string;
  items: Array<{ id?: string; name: string; quantity: number; price: number; image?: string }>;
  total: number;
  delivery_address: string;
  delivery_date: string;
  delivery_time: string;
  created_at?: string;
  payment_slip_url?: string;
}

/**
 * Send order notification to admin's Line account
 */
export async function sendOrderLineNotification(order: OrderNotificationData) {
  try {
    console.log('🔍 [LINE] Initializing Line client...');
    console.log('🔍 [LINE] Environment Check:');
    console.log('  - NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('  - LINE_CHANNEL_ACCESS_TOKEN:', !!process.env.LINE_CHANNEL_ACCESS_TOKEN);
    console.log('  - LINE_CHANNEL_SECRET:', !!process.env.LINE_CHANNEL_SECRET);
    console.log('  - LINE_USER_ID:', process.env.LINE_USER_ID ? 'Present (length: ' + process.env.LINE_USER_ID.length + ')' : 'Missing');

    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || !process.env.LINE_USER_ID) {
      console.warn('⚠️ [LINE] Missing LINE credentials - skipping notification');
      return;
    }

    const lineClient = getLineClient();
    console.log('✅ [LINE] Line client initialized successfully');

    console.log('📤 [LINE] Sending notification for order:', order.id);
    console.log('📤 [LINE] Order items:', JSON.stringify(order.items, null, 2));

    // Normalize items so LINE gets true quantities and menu images (support quantity or qty from cart/order)
    const normalizedItems = (order.items || []).map((item: { id?: string; name?: string; portion?: string; price?: number; quantity?: number; qty?: number; image?: string }) => {
      const menuItem = item.id ? menuItems.find(m => m.id === item.id) : null;
      return {
        name: item.name || 'Item',
        quantity: Math.max(1, Math.round(Number(item.quantity ?? item.qty ?? 1))),
        price: Number(item.price) || 0,
        portion: item.portion,
        image: item.image || menuItem?.image,
      };
    });

    // Send rich flex message with order details
    await lineClient.sendOrderNotification({
      orderId: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      items: normalizedItems,
      totalPrice: order.total,
      deliveryAddress: order.delivery_address,
      deliveryDate: order.delivery_date,
      deliveryTime: order.delivery_time || 'ASAP',
      orderTime: order.created_at || new Date().toISOString(),
      paymentSlipUrl: order.payment_slip_url,
    });

    console.log(`✅ [LINE] Line notification sent successfully for order ${order.id}`);
  } catch (error) {
    console.error('❌ [LINE] Failed to send Line notification:', error);
    if (error instanceof Error) {
      console.error('  - Message:', error.message);
      console.error('  - Stack:', error.stack);
    }
    // Don't throw - we don't want to fail the order if Line notification fails
  }
}
