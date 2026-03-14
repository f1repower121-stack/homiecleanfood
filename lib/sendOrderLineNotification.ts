import { getLineClient } from '@/lib/line/client';

export interface OrderNotificationData {
  id: string;
  customer_name: string;
  customer_phone: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  delivery_address: string;
  delivery_date: string;
  delivery_time: string;
  created_at?: string;
}

/**
 * Send order notification to admin's Line account
 */
export async function sendOrderLineNotification(order: OrderNotificationData) {
  try {
    const lineClient = getLineClient();

    // Format delivery date and time
    const [year, month, day] = order.delivery_date.split('-');
    const dateStr = `${day}/${month}/${year}`;

    // Send rich flex message with order details
    await lineClient.sendOrderNotification({
      orderId: order.id.slice(0, 8).toUpperCase(),
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      items: order.items,
      totalPrice: order.total,
      deliveryAddress: order.delivery_address,
      orderTime: order.created_at || new Date().toISOString()
    });

    console.log(`✅ Line notification sent for order ${order.id}`);
  } catch (error) {
    console.error('❌ Failed to send Line notification:', error);
    // Don't throw - we don't want to fail the order if Line notification fails
  }
}
