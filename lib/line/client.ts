const ICT = 'Asia/Bangkok'

function formatTimeICT(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    timeZone: ICT,
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' ICT'
}

export class LineClient {
  private channelAccessToken: string;
  private adminUserIds: string[];
  private baseUrl = 'https://api.line.me/v2/bot';

  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    const userIdString = process.env.LINE_USER_ID || '';
    this.adminUserIds = userIdString.split(',').map(id => id.trim()).filter(Boolean);

    if (!this.channelAccessToken || this.adminUserIds.length === 0) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN and LINE_USER_ID are required');
    }
  }

  private async request(method: string, endpoint: string, body?: object): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.channelAccessToken.trim()}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      let errData: unknown;
      try { errData = JSON.parse(text); } catch { errData = text; }
      console.error('LINE API error', res.status, errData);
      throw new Error(`LINE API ${res.status}: ${JSON.stringify(errData)}`);
    }
    return text ? JSON.parse(text) : {};
  }

  async sendTextMessage(text: string): Promise<void> {
    for (const userId of this.adminUserIds) {
      await this.request('POST', '/message/push', {
        to: userId,
        messages: [{ type: 'text', text }],
      });
    }
  }

  /**
   * Send order notification. Uses text message (most reliable).
   * Format: compact, items with qty×, Bulk in bold/emoji, ICT time.
   */
  async sendOrderNotification(orderData: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    items: Array<{ name: string; quantity: number; price: number; portion?: string }>;
    totalPrice: number;
    deliveryAddress: string;
    deliveryDate?: string;
    deliveryTime: string;
    orderTime: string;
  }): Promise<void> {
    const id = orderData.orderId.slice(0, 8).toUpperCase();
    const totalMeals = orderData.items.reduce((s, i) => s + Math.max(1, i.quantity), 0);

    const lines: string[] = [
      '📱 New Order',
      `#${id}`,
      '',
      `⏰ ${orderData.deliveryDate || ''} ${orderData.deliveryTime}`.trim(),
      `👤 ${orderData.customerName}`,
      `📱 ${orderData.customerPhone}`,
      `📍 ${orderData.deliveryAddress}`,
      '',
      `${totalMeals} meal${totalMeals !== 1 ? 's' : ''}:`,
      ...orderData.items.map(i => {
        const qty = Math.max(1, i.quantity);
        let portion = (i.portion || '').toUpperCase();
        if (!portion) {
          const m = (i.name || '').match(/\b(Bulk|Lean)\b/i);
          portion = m ? m[1].toUpperCase() : '';
        }
        const emoji = portion === 'BULK' ? '💪' : portion === 'LEAN' ? '🏃' : '';
        const name = (i.name || 'Item').replace(/\s*-(Bulk|Lean)\s*/gi, '').trim();
        const label = portion ? `${name} ${emoji}${portion}` : name;
        const itemTotal = (i.price * qty).toLocaleString('th-TH');
        return `  ${qty}× ${label} ฿${itemTotal}`;
      }),
      '',
      `💰 Total: ฿${orderData.totalPrice.toFixed(2)}`,
      `🕐 ${formatTimeICT(orderData.orderTime)}`,
    ];

    const text = lines.join('\n');
    await this.sendTextMessage(text);
  }
}

let _client: LineClient | null = null;

export function getLineClient(): LineClient {
  if (!_client) _client = new LineClient();
  return _client;
}
