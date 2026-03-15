const ICT = 'Asia/Bangkok'

function formatTimeICT(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    timeZone: ICT,
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' ICT'
}

const GREEN = '#1DB446'
const RED = '#E53935'
const GRAY_DARK = '#333333'
const GRAY_MID = '#666666'

export class LineClient {
  private channelAccessToken: string
  private adminUserIds: string[]
  private baseUrl = 'https://api.line.me/v2/bot'

  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
    const userIdString = process.env.LINE_USER_ID || ''
    this.adminUserIds = userIdString.split(',').map(id => id.trim()).filter(Boolean)

    if (!this.channelAccessToken || this.adminUserIds.length === 0) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN and LINE_USER_ID are required')
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
    })
    const text = await res.text()
    if (!res.ok) {
      let errData: unknown
      try { errData = JSON.parse(text) } catch { errData = text }
      console.error('LINE API error', res.status, errData)
      throw new Error(`LINE API ${res.status}: ${JSON.stringify(errData)}`)
    }
    return text ? JSON.parse(text) : {}
  }

  async sendTextMessage(text: string): Promise<void> {
    for (const userId of this.adminUserIds) {
      await this.request('POST', '/message/push', {
        to: userId,
        messages: [{ type: 'text', text }],
      })
    }
  }

  async sendOrderNotification(orderData: {
    orderId: string
    customerName: string
    customerPhone: string
    items: Array<{ id?: string; name: string; quantity: number; price: number; portion?: string; image?: string }>
    totalPrice: number
    deliveryAddress: string
    deliveryDate?: string
    deliveryTime: string
    orderTime: string
  }): Promise<void> {
    const textFallback = this.buildTextFallback(orderData)

    try {
      const flexMsg = this.buildFlexMessage(orderData)
      for (const userId of this.adminUserIds) {
        await this.request('POST', '/message/push', {
          to: userId,
          messages: [flexMsg],
        })
      }
    } catch (err) {
      console.error('[LINE] Flex failed, fallback to text:', err)
      await this.sendTextMessage(textFallback)
    }
  }

  private buildTextFallback(orderData: {
    orderId: string
    customerName: string
    customerPhone: string
    items: Array<{ name: string; quantity: number; price: number; portion?: string }>
    totalPrice: number
    deliveryAddress: string
    deliveryDate?: string
    deliveryTime: string
    orderTime: string
  }): string {
    const id = orderData.orderId.slice(0, 8).toUpperCase()
    const totalMeals = orderData.items.reduce((s, i) => s + Math.max(1, i.quantity), 0)
    const lines = [
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
        const qty = Math.max(1, i.quantity)
        const portion = ((i.portion || '').toUpperCase() || (i.name || '').match(/\b(Bulk|Lean)\b/i)?.[1]?.toUpperCase() || '')
        const emoji = portion === 'BULK' ? '💪' : portion === 'LEAN' ? '🏃' : ''
        const name = (i.name || 'Item').replace(/\s*-(Bulk|Lean)\s*/gi, '').trim()
        const label = portion ? `${name} ${emoji}${portion}` : name
        return `  ${qty}× ${label} ฿${(i.price * qty).toLocaleString('th-TH')}`
      }),
      '',
      `💰 Total: ฿${orderData.totalPrice.toFixed(2)}`,
      `🕐 ${formatTimeICT(orderData.orderTime)}`,
    ]
    return lines.join('\n')
  }

  private buildFlexMessage(orderData: {
    orderId: string
    customerName: string
    customerPhone: string
    items: Array<{ id?: string; name: string; quantity: number; price: number; portion?: string; image?: string }>
    totalPrice: number
    deliveryAddress: string
    deliveryDate?: string
    deliveryTime: string
    orderTime: string
  }) {
    const id = orderData.orderId.slice(0, 8).toUpperCase()
    const totalMeals = orderData.items.reduce((s, i) => s + Math.max(1, i.quantity), 0)

    const itemRows: object[] = orderData.items.map((item) => {
      const qty = Math.max(1, item.quantity)
      let portion = (item.portion || '').toUpperCase()
      if (!portion) {
        const m = (item.name || '').match(/\b(Bulk|Lean)\b/i)
        portion = m ? m[1].toUpperCase() : ''
      }
      const baseName = (item.name || 'Item').replace(/\s*-(Bulk|Lean)\s*/gi, '').trim()
      const itemTotal = (item.price * qty).toLocaleString('th-TH')

      const emoji = portion === 'BULK' ? '💪' : portion === 'LEAN' ? '🏃' : ''
      const portionColor = portion === 'BULK' ? RED : GREEN

      const textContents: object[] = [
        { type: 'text', text: `${qty}× ${baseName}`, size: 'sm', wrap: true, weight: 'bold', color: GRAY_DARK },
      ]
      if (portion) {
        textContents.push({
          type: 'text',
          text: `${portion} ${emoji}`,
          size: 'md',
          weight: 'bold',
          color: portionColor,
        })
      }
      textContents.push({
        type: 'text',
        text: `฿${itemTotal}`,
        size: 'sm',
        color: GRAY_MID,
        weight: 'bold',
      })

      const leftContent: object[] = []
      if (item.image && item.image.startsWith('https://')) {
        leftContent.push({
          type: 'image',
          url: item.image,
          size: 'xs',
          aspectRatio: '1:1',
          flex: 0,
          margin: 'xs',
        })
      }
      leftContent.push({
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        flex: 1,
        contents: textContents,
      })

      return {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        margin: 'xs',
        contents: leftContent,
      }
    })

    const bodyContents: object[] = [
      {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          { type: 'text', text: '📱 Website Order', weight: 'bold', size: 'md', color: GREEN },
          { type: 'text', text: `#${id}`, weight: 'bold', size: 'sm', color: GRAY_DARK },
        ],
      },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'sm',
        paddingAll: 'sm',
        backgroundColor: GREEN,
        cornerRadius: 'md',
        contents: [
          { type: 'text', text: '⏰ DELIVERY', size: 'xs', color: '#ffffff', weight: 'bold' },
          {
            type: 'text',
            text: orderData.deliveryDate ? `${orderData.deliveryDate} at ${orderData.deliveryTime}` : (orderData.deliveryTime || 'ASAP'),
            size: 'sm',
            weight: 'bold',
            color: '#ffffff',
          },
        ],
      },
      { type: 'separator', margin: 'sm' },
      { type: 'text', text: `👤 ${orderData.customerName}`, weight: 'bold', size: 'sm', color: '#1a1a1a', wrap: true },
      { type: 'text', text: `📱 ${orderData.customerPhone}`, weight: 'bold', size: 'xs', color: GREEN, margin: 'xs' },
      { type: 'text', text: `📍 ${orderData.deliveryAddress}`, size: 'xs', weight: 'bold', color: '#1a1a1a', wrap: true, margin: 'xs' },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'sm',
        paddingAll: 'sm',
        paddingStart: 'sm',
        backgroundColor: '#fafbfc',
        borderColor: GREEN,
        borderWidth: '1px',
        cornerRadius: 'md',
        contents: [
          { type: 'text', text: `${totalMeals} meal${totalMeals !== 1 ? 's' : ''}`, weight: 'bold', size: 'xs', color: GRAY_MID, margin: 'xs' },
          ...itemRows,
        ],
      },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'sm',
        paddingAll: 'md',
        backgroundColor: GREEN,
        cornerRadius: 'md',
        contents: [
          { type: 'text', text: 'Total', size: 'xs', color: '#ffffff', weight: 'bold' },
          { type: 'text', text: `฿${orderData.totalPrice.toFixed(2)}`, size: 'xl', weight: 'bold', color: '#ffffff' },
        ],
      },
      {
        type: 'text',
        text: `🕐 ${formatTimeICT(orderData.orderTime)}`,
        size: 'xs',
        color: GRAY_MID,
        margin: 'sm',
        align: 'center',
      },
    ]

    return {
      type: 'flex',
      altText: `Order #${id} - ฿${orderData.totalPrice.toFixed(2)}`,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'xs',
          contents: bodyContents,
        },
      },
    }
  }
}

let _client: LineClient | null = null

export function getLineClient(): LineClient {
  if (!_client) _client = new LineClient()
  return _client
}
