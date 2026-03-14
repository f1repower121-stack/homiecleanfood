import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOrderLineNotification } from '@/lib/sendOrderLineNotification'

// Use admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

/**
 * Test endpoint: Create an order with 10 different menu items
 * POST to /api/test-order-10-items with password
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // Basic auth
    if (password !== 'homie2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧪 [TEST] Creating test order with 10 different menu items...')

    // 10 different menu items with variety of proteins
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
      console.log(`  ${idx + 1}. ${item.quantity}× ${item.name} = ฿${item.price * item.quantity}`)
    })
    console.log(`💰 [TEST] Total: ฿${totalPrice}`)

    // Create order in database using admin client to bypass RLS
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        reference_id: 'TEST' + Date.now().toString().slice(-5),
        items: testItems,
        total: totalPrice,
        payment_method: 'cod',
        status: 'pending',
        notes: 'Automated test order with 10 different menu items',
        customer_name: 'Test Customer - 10 Items',
        customer_phone: '0912345678',
        delivery_address: '123 Test Street, Sukhumvit 71, Bangkok 10110',
        delivery_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        delivery_time: '14:00',
      })
      .select()
      .single()

    if (orderError) throw orderError

    console.log(`✅ [TEST] Order created: ${orderData.id}`)

    // Send LINE notification
    console.log('📤 [TEST] Sending LINE notification...')
    await sendOrderLineNotification({
      id: orderData.id,
      customer_name: 'Test Customer - 10 Items',
      customer_phone: '0912345678',
      items: testItems as any,
      total: totalPrice,
      delivery_address: '123 Test Street, Sukhumvit 71, Bangkok 10110',
      delivery_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      delivery_time: '14:00',
      created_at: orderData.created_at,
    })

    console.log('✅ [TEST] LINE notification sent successfully')

    return NextResponse.json({
      success: true,
      message: '✅ Test order created with 10 items and LINE notification sent!',
      details: {
        orderId: orderData.id,
        referenceId: orderData.reference_id,
        itemCount: testItems.length,
        totalPrice: totalPrice,
        items: testItems,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('❌ [TEST] Failed to create test order:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to create test order',
      },
      { status: 500 }
    )
  }
}
