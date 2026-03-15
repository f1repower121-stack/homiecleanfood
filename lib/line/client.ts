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
  private siteUrl: string;

  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    this.siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://homiecleanfood.vercel.app';

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
    items: Array<{ name: string; quantity: number; price: number; size?: string; portion?: string; image?: string }>;
    totalPrice: number;
    deliveryAddress: string;
    deliveryDate?: string;
    deliveryTime: string;
    orderTime: string;
    paymentSlipUrl?: string;
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
    items: Array<{ name: string; quantity: number; price: number; size?: string; portion?: string; image?: string }>;
    totalPrice: number;
    deliveryAddress: string;
    deliveryDate?: string;
    deliveryTime: string;
    orderTime: string;
    paymentSlipUrl?: string;
  }): LineFlexMessage {
    // Validate items array with detailed logging
    const itemsArray = Array.isArray(orderData.items) ? orderData.items : [];
    // Create a short display ID from the full order ID
    const displayOrderId = orderData.orderId.slice(0, 8).toUpperCase();
    console.log(`📋 [LINE] Processing ${itemsArray.length} items for order ${orderData.orderId}`);

    if (itemsArray.length === 0) {
      console.warn('⚠️ [LINE] No items found in order - creating message with empty items');
    }

    // Build item rows as Flex components - quantity bold & larger
    // Support both quantity and qty (orders may use either), ensure we get the true meal count
    const itemComponents = itemsArray.flatMap((item, idx) => {
      const rawQty = item?.quantity ?? (item as { qty?: number })?.qty ?? 1;
      const qty = Math.max(1, Math.round(Number(rawQty)));
      const name = String(item?.name || 'Item');
      const price = Number(item?.price) || 0;
      const itemTotal = (price * qty).toLocaleString('th-TH');
      const it = item as { size?: string; portion?: string };
      let portion = String(it?.size || it?.portion || '').toUpperCase();
      if (!portion) {
        const portionMatch = name.match(/-(Bulk|Lean|Regular|Light)(\s|$)/i);
        portion = portionMatch ? portionMatch[1].toUpperCase() : '';
      }
      const portionEmoji = portion === 'BULK' ? '💪' : portion === 'LEAN' ? '🏃' : '';
      const baseName = name.replace(/\s*-(Bulk|Lean|Regular|Light)\s*/i, '').trim();
      const nameAndPrice = `${baseName} ${portionEmoji}${portion}\n   ฿${itemTotal}`;
      const itemImage = (item as { image?: string })?.image;
      const rowContents = [
        { type: 'text', text: `${idx + 1}. ${qty}×`, weight: 'bold', size: 'md', color: '#1DB446', flex: 0 },
        { type: 'text', text: nameAndPrice, size: 'sm', color: '#333333', wrap: true, flex: 1 },
      ];
      if (itemImage && itemImage.startsWith('http')) {
        rowContents.unshift({
          type: 'image' as const,
          url: itemImage,
          size: 'xs' as const,
          aspectRatio: '1:1' as const,
          flex: 0,
          margin: 'xs' as const,
        });
      }
      return [
        { type: 'box', layout: 'horizontal', spacing: 'sm', margin: 'xs', contents: rowContents },
      ];
    });

    const totalMeals = itemsArray.reduce((sum, i) => sum + Math.max(1, Math.round(Number(i?.quantity ?? (i as { qty?: number })?.qty ?? 1))), 0);
    const itemsBoxContents = [
      { type: 'text', text: `Total: ${totalMeals} meal${totalMeals !== 1 ? 's' : ''}`, weight: 'bold', size: 'xs', color: '#666666', margin: 'sm' },
      ...itemComponents,
    ];

    // Format time for better readability - English with Indochina Time (ICT)
    const orderDate = new Date(orderData.orderTime);
    const timeStr = orderDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Bangkok',
    }) + ' ICT';

    return {
      type: 'flex',
      altText: `🎉 Order #${displayOrderId} - ฿${orderData.totalPrice.toFixed(2)}`,
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
                  text: '📱 Website Order',
                  weight: 'bold',
                  size: 'xl',
                  color: '#1DB446',
                },
                {
                  type: 'text',
                  text: `#${displayOrderId}`,
                  weight: 'bold',
                  size: 'lg',
                  color: '#333333',
                },
              ],
            },

            // Delivery Time - PROMINENT
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              paddingAll: 'md',
              backgroundColor: '#1DB446',
              cornerRadius: 'md',
              contents: [
                {
                  type: 'text',
                  text: '⏰ DELIVERY',
                  size: 'xs',
                  color: '#ffffff',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: `${orderData.deliveryDate ? orderData.deliveryDate + ' at ' : ''}${orderData.deliveryTime}`,
                  size: 'lg',
                  weight: 'bold',
                  color: '#ffffff',
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

            // Delivery Address - Full address, clearly visible
            {
              type: 'text',
              text: `📍 ${orderData.deliveryAddress}`,
              size: 'md',
              color: '#1a1a1a',
              weight: 'bold',
              wrap: true,
              margin: 'md',
            },

            // Items List - quantity bold & larger
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              paddingAll: 'md',
              paddingStart: 'lg',
              backgroundColor: '#fafbfc',
              borderColor: '#1DB446',
              borderWidth: '1px',
              cornerRadius: 'md',
              contents: itemsBoxContents,
            },

            ...(orderData.paymentSlipUrl ? [
              // Payment Slip Image
              {
                type: 'image',
                url: orderData.paymentSlipUrl,
                size: 'full',
                aspectRatio: '4:5',
                aspectMode: 'cover',
                margin: 'md',
              },
              // Payment Slip Label
              {
                type: 'text',
                text: '📸 Payment Slip',
                size: 'xs',
                color: '#999999',
                margin: 'xs',
                align: 'center',
              },
            ] : []),

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
