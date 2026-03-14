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
    const itemsContent = orderData.items.map((item, index) => ({
      type: 'box',
      layout: 'vertical',
      margin: index === 0 ? 'none' : 'md',
      paddingAll: 'md',
      backgroundColor: '#f8f9fa',
      cornerRadius: 'md',
      contents: [
        {
          type: 'box',
          layout: 'baseline',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: `${item.quantity}×`,
              weight: 'bold',
              color: '#1DB446',
              size: 'sm',
              flex: 0
            },
            {
              type: 'text',
              text: item.name,
              weight: 'bold',
              color: '#1a1a1a',
              flex: 0,
              wrap: true,
              size: 'md'
            },
            {
              type: 'text',
              text: `฿${(item.price * item.quantity).toFixed(2)}`,
              size: 'lg',
              weight: 'bold',
              color: '#1DB446',
              align: 'end',
              flex: 0
            }
          ]
        }
      ]
    }));

    return {
      type: 'flex',
      altText: `🎉 New Order #${orderData.orderId} - ฿${orderData.totalPrice.toFixed(2)}`,
      contents: {
        type: 'bubble',
        styles: {
          body: {
            backgroundColor: '#ffffff'
          }
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'lg',
          contents: [
            // Header with gradient effect
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              paddingAll: 'lg',
              backgroundColor: '#1DB446',
              cornerRadius: 'lg',
              contents: [
                {
                  type: 'text',
                  text: '🎉 NEW ORDER',
                  weight: 'bold',
                  color: '#ffffff',
                  size: 'xxl',
                  align: 'center'
                },
                {
                  type: 'text',
                  text: `#${orderData.orderId}`,
                  weight: 'bold',
                  color: '#e8f5e9',
                  size: 'lg',
                  align: 'center'
                }
              ]
            },
            // Customer Details Card
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'md',
              paddingAll: 'lg',
              backgroundColor: '#f0f9f6',
              cornerRadius: 'lg',
              contents: [
                {
                  type: 'text',
                  text: '📋 Customer Details',
                  weight: 'bold',
                  color: '#1DB446',
                  size: 'sm'
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'sm',
                  margin: 'md',
                  contents: [
                    {
                      type: 'box',
                      layout: 'baseline',
                      spacing: 'md',
                      contents: [
                        {
                          type: 'text',
                          text: '👤',
                          size: 'sm',
                          flex: 0
                        },
                        {
                          type: 'text',
                          text: orderData.customerName,
                          wrap: true,
                          color: '#1a1a1a',
                          size: 'md',
                          weight: 'bold',
                          flex: 5
                        }
                      ]
                    },
                    {
                      type: 'box',
                      layout: 'baseline',
                      spacing: 'md',
                      contents: [
                        {
                          type: 'text',
                          text: '📱',
                          size: 'sm',
                          flex: 0
                        },
                        {
                          type: 'text',
                          text: orderData.customerPhone,
                          wrap: true,
                          color: '#1DB446',
                          size: 'md',
                          weight: 'bold',
                          flex: 5
                        }
                      ]
                    },
                    {
                      type: 'box',
                      layout: 'baseline',
                      spacing: 'md',
                      contents: [
                        {
                          type: 'text',
                          text: '📍',
                          size: 'sm',
                          flex: 0
                        },
                        {
                          type: 'text',
                          text: orderData.deliveryAddress.substring(0, 45),
                          wrap: true,
                          color: '#333333',
                          size: 'xs',
                          flex: 5
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            // Items Card
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'md',
              paddingAll: 'lg',
              backgroundColor: '#fafafa',
              cornerRadius: 'lg',
              contents: [
                {
                  type: 'text',
                  text: '🍽️ Order Items',
                  weight: 'bold',
                  color: '#1DB446',
                  size: 'sm'
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'md',
                  margin: 'md',
                  contents: itemsContent
                }
              ]
            },
            // Total Amount Card
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              paddingAll: 'lg',
              backgroundColor: '#1DB446',
              cornerRadius: 'lg',
              contents: [
                {
                  type: 'text',
                  text: 'Total Amount',
                  color: '#ffffff',
                  size: 'sm',
                  align: 'center'
                },
                {
                  type: 'text',
                  text: `฿${orderData.totalPrice.toFixed(2)}`,
                  size: 'xxl',
                  weight: 'bold',
                  color: '#ffffff',
                  align: 'center'
                }
              ]
            },
            // Order Time
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'md',
              paddingAll: 'md',
              backgroundColor: '#f5f5f5',
              cornerRadius: 'md',
              contents: [
                {
                  type: 'text',
                  text: '🕐',
                  size: 'sm',
                  flex: 0
                },
                {
                  type: 'text',
                  text: new Date(orderData.orderTime).toLocaleString('th-TH'),
                  color: '#666666',
                  size: 'xs',
                  flex: 5
                }
              ]
            }
          ]
        }
      }
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
