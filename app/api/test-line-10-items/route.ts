import { NextRequest, NextResponse } from 'next/server'
import { getLineClient } from '@/lib/line/client'

/**
 * Test endpoint: Send LINE notification with 10 different menu items
 * This tests if the LINE notification can properly display 10 items
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // Basic auth
    if (password !== 'homie2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧪 [TEST] Sending LINE notification with 10 different menu items...')

    // 10 different menu items
    const testItems = [
      { name: 'Australian Beef with Mexican Sauce - Lean', quantity: 1, price: 295 },
      { name: 'Australian Beef Steak - Bulk', quantity: 1, price: 350 },
      { name: 'Grilled Salmon With Spaghetti - Lean', quantity: 1, price: 275 },
      { name: 'Grilled Salmon With Spaghetti - Bulk', quantity: 1, price: 330 },
      { name: 'Grilled Chicken Lean - Regular', quantity: 2, price: 195 },
      { name: 'Grilled Chicken Bulk - Large', quantity: 1, price: 240 },
      { name: 'Thai Basil Chicken Lean - Spicy', quantity: 1, price: 210 },
      { name: 'Teriyaki Chicken Bulk - Sweet', quantity: 1, price: 250 },
      { name: 'BBQ Pork Lean - Smoky', quantity: 1, price: 220 },
      { name: 'Herb Roasted Turkey - Light', quantity: 1, price: 185 },
    ]

    const totalPrice = testItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    console.log('📋 [TEST] Order items:')
    testItems.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.quantity}× ${item.name} = ฿${(item.price * item.quantity).toLocaleString('th-TH')}`)
    })
    console.log(`💰 [TEST] Total: ฿${totalPrice.toLocaleString('th-TH')}`)

    // Get LINE client
    const lineClient = getLineClient()
    console.log('✅ [TEST] LINE client initialized')

    // Send test notification with 10 items
    await lineClient.sendOrderNotification({
      orderId: 'TEST10ITEMS' + Date.now().toString().slice(-6),
      customerName: 'Test Customer - 10 Items Order',
      customerPhone: '0912345678',
      items: testItems,
      totalPrice: totalPrice,
      deliveryAddress: '123 Test Street, Sukhumvit 71, Bangkok 10110, Thailand - Testing 10 items display',
      orderTime: new Date().toISOString(),
    })

    console.log('✅ [TEST] LINE notification sent successfully with 10 items!')

    return NextResponse.json({
      success: true,
      message: '✅ LINE notification sent with 10 different menu items!',
      details: {
        itemCount: testItems.length,
        totalPrice: totalPrice,
        items: testItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          lineTotal: item.quantity * item.price,
        })),
        testNotes: 'Check your LINE to verify all 10 items are displayed clearly',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('❌ [TEST] Failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to send test notification',
      },
      { status: 500 }
    )
  }
}
