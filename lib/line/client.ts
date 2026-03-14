interface LineMessage {
  type: string;
  text?: string;
  altText?: string;
  contents?: any;
}

interface LineFlexMessage {
  type: 'flex';
  altText: string;
  contents: {
    type: 'bubble';
    body: any;
    footer?: any;
    styles?: any;
  };
}

export class LineClient {
  private channelAccessToken: string;
  private adminUserIds: string[];
  private baseUrl = 'https://api.line.me/v2/bot';

  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

    // Support multiple admin User IDs (comma-separated)
    const userIdString = process.env.LINE_USER_ID || '';
    this.adminUserIds = userIdString
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (!this.channelAccessToken || this.adminUserIds.length === 0) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN and LINE_USER_ID are required');
    }

    console.log(`📞 Line Admin Users: ${this.adminUserIds.length} admin(s) configured`);
  }

  /**
   * Make HTTP request using native fetch instead of axios
   */
  private async request(method: string, endpoint: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    console.log(`📡 LINE API: ${method} ${endpoint}`);
    console.log(`📡 Authorization: Bearer ${this.channelAccessToken.substring(0, 20)}...`);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.channelAccessToken.trim()}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      responseData = { rawResponse: responseText };
    }

    if (!response.ok) {
      console.error(`❌ LINE API Error: ${response.status}`, responseData);
      throw new Error(`Line API error: ${response.status} - ${JSON.stringify(responseData)}`);
    }

    return responseData;
  }

  /**
   * Send a text message to all admin users
   */
  async sendTextMessage(text: string): Promise<void> {
    const sendPromises = this.adminUserIds.map(userId =>
      this.request('POST', '/message/push', {
        to: userId,
        messages: [
          {
            type: 'text',
            text: text
          }
        ]
      }).catch(error => {
        console.error(`Error sending to admin ${userId}:`, error);
        throw error;
      })
    );

    await Promise.all(sendPromises);
  }

  /**
   * Send an order notification with flex message to all admin users
   */
  async sendOrderNotification(orderData: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    totalPrice: number;
    deliveryAddress: string;
    orderTime: string;
  }): Promise<void> {
    try {
      const flexMessage = this.createOrderFlexMessage(orderData);

      const sendPromises = this.adminUserIds.map(userId =>
        this.request('POST', '/message/push', {
          to: userId,
          messages: [flexMessage]
        }).catch(error => {
          console.error(`Error sending order to admin ${userId}:`, error);
          throw error;
        })
      );

      await Promise.all(sendPromises);
      console.log(`✅ Order notification sent to ${this.adminUserIds.length} admin(s)`);
    } catch (error) {
      console.error('Error sending Line order notification:', error);
      throw error;
    }
  }

  /**
   * Create a modern, visually stunning flex message for order notification
   */
  private createOrderFlexMessage(orderData: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    totalPrice: number;
    deliveryAddress: string;
    orderTime: string;
  }): LineFlexMessage {
    // Validate items array with detailed logging
    const itemsArray = Array.isArray(orderData.items) ? orderData.items : [];
    console.log(`📋 [LINE] Processing ${itemsArray.length} items for order ${orderData.orderId}`);

    if (itemsArray.length === 0) {
      console.warn('⚠️ [LINE] No items found in order - creating message with empty items');
    }

    // Create simple item display - first 3 items max for mobile
    const displayItems = itemsArray.slice(0, 3);
    const itemsText = displayItems
      .map(item => {
        const qty = Number(item?.quantity) || 1;
        const name = String(item?.name || 'Item');
        return `${qty}× ${name}`;
      })
      .join('\n');

    const remainingCount = itemsArray.length - 3;
    const itemsDisplay = itemsText + (remainingCount > 0 ? `\n➕ ${remainingCount} more` : '');

    // Format time for better readability
    const orderDate = new Date(orderData.orderTime);
    const timeStr = orderDate.toLocaleString('th-TH', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      type: 'flex',
      altText: `🎉 Order #${orderData.orderId} - ฿${orderData.totalPrice.toFixed(2)}`,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            // Order Header
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'xs',
              contents: [
                {
                  type: 'text',
                  text: '🎉 NEW ORDER',
                  weight: 'bold',
                  size: 'xl',
                  color: '#1DB446',
                },
                {
                  type: 'text',
                  text: `#${orderData.orderId}`,
                  weight: 'bold',
                  size: 'lg',
                  color: '#333333',
                },
              ],
            },

            // Separator
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              height: '2px',
              backgroundColor: '#dddddd',
              contents: [],
            },

            // Customer Name - Large
            {
              type: 'text',
              text: `👤 ${orderData.customerName}`,
              weight: 'bold',
              size: 'lg',
              color: '#1a1a1a',
              wrap: true,
            },

            // Phone - Prominent
            {
              type: 'text',
              text: `📱 ${orderData.customerPhone}`,
              weight: 'bold',
              size: 'md',
              color: '#1DB446',
              margin: 'xs',
            },

            // Delivery Address
            {
              type: 'text',
              text: `📍 ${orderData.deliveryAddress.substring(0, 50)}`,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'md',
            },

            // Items List
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              paddingAll: 'md',
              backgroundColor: '#f9f9f9',
              borderColor: '#e0e0e0',
              borderWidth: '1px',
              cornerRadius: 'md',
              contents: [
                {
                  type: 'text',
                  text: itemsDisplay,
                  size: 'md',
                  color: '#1a1a1a',
                  weight: 'bold',
                  wrap: true,
                  align: 'start',
                },
              ],
            },

            // Total Amount - Prominent Box
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              paddingAll: 'lg',
              backgroundColor: '#1DB446',
              cornerRadius: 'md',
              contents: [
                {
                  type: 'text',
                  text: 'Total',
                  size: 'sm',
                  color: '#ffffff',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: `฿${orderData.totalPrice.toFixed(2)}`,
                  size: 'xxl',
                  weight: 'bold',
                  color: '#ffffff',
                },
              ],
            },

            // Time
            {
              type: 'text',
              text: `🕐 ${timeStr}`,
              size: 'xs',
              color: '#999999',
              margin: 'md',
              align: 'center',
            },
          ],
        },
        // Action Button
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: '📋 View Order Details',
                uri: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://homiecleanfood.vercel.app'}/admin?orderid=${orderData.orderId}`,
              },
              color: '#1DB446',
            },
          ],
        },
      },
    };
  }
}

/**
 * Get a singleton instance of LineClient
 */
let lineClientInstance: LineClient | null = null;

export function getLineClient(): LineClient {
  if (!lineClientInstance) {
    lineClientInstance = new LineClient();
  }
  return lineClientInstance;
}
