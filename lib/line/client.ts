import axios, { AxiosInstance } from 'axios';

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
  };
}

export class LineClient {
  private client: AxiosInstance;
  private channelAccessToken: string;
  private userId: string;

  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    this.userId = process.env.LINE_USER_ID || '';

    if (!this.channelAccessToken || !this.userId) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN and LINE_USER_ID are required');
    }

    this.client = axios.create({
      baseURL: 'https://api.line.me/v2/bot',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.channelAccessToken}`
      }
    });
  }

  /**
   * Send a text message to the admin user
   */
  async sendTextMessage(text: string): Promise<void> {
    try {
      await this.client.post('/message/push', {
        to: this.userId,
        messages: [
          {
            type: 'text',
            text: text
          }
        ]
      });
    } catch (error) {
      console.error('Error sending Line text message:', error);
      throw error;
    }
  }

  /**
   * Send an order notification with flex message
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

      await this.client.post('/message/push', {
        to: this.userId,
        messages: [flexMessage]
      });
    } catch (error) {
      console.error('Error sending Line order notification:', error);
      throw error;
    }
  }

  /**
   * Create a flex message for order notification
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
      spacing: 'sm',
      contents: [
        {
          type: 'box',
          layout: 'baseline',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: `${item.quantity}x`,
              color: '#aaaaaa',
              size: 'sm',
              flex: 0
            },
            {
              type: 'text',
              text: item.name,
              weight: 'bold',
              color: '#666666',
              flex: 0,
              wrap: true
            },
            {
              type: 'text',
              text: `฿${(item.price * item.quantity).toFixed(2)}`,
              size: 'sm',
              color: '#999999',
              align: 'end'
            }
          ]
        }
      ]
    }));

    return {
      type: 'flex',
      altText: `New Order #${orderData.orderId}`,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '🎯 NEW ORDER',
                  weight: 'bold',
                  color: '#1DB446',
                  size: 'xl'
                },
                {
                  type: 'text',
                  text: `Order #${orderData.orderId}`,
                  weight: 'bold',
                  color: '#666666',
                  size: 'lg',
                  margin: 'md'
                }
              ]
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '👤 Customer:',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: orderData.customerName,
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 4
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '📱 Phone:',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: orderData.customerPhone,
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 4
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '📍 Address:',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: orderData.deliveryAddress.substring(0, 40),
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 4
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: '🕐 Time:',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: new Date(orderData.orderTime).toLocaleString('th-TH'),
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 4
                    }
                  ]
                }
              ]
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              spacing: 'sm',
              contents: itemsContent
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'md',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: 'Total:',
                  size: 'sm',
                  color: '#aaaaaa',
                  flex: 1
                },
                {
                  type: 'text',
                  text: `฿${orderData.totalPrice.toFixed(2)}`,
                  size: 'lg',
                  color: '#1DB446',
                  weight: 'bold',
                  align: 'end',
                  flex: 1
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
