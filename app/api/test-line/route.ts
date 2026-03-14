import { NextRequest, NextResponse } from 'next/server'
import { sendOrderLineNotification } from '@/lib/sendOrderLineNotification'

/**
 * Test endpoint to verify LINE notifications are working
 * POST to /api/test-line with admin password to test
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // Basic auth - use the same password as admin
    if (password !== 'homie2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧪 Testing LINE notification...')

    // Send a test order notification
    await sendOrderLineNotification({
      id: 'TEST001',
      customer_name: 'Test Customer',
      customer_phone: '0912345678',
      items: [
        { name: 'Grilled Chicken Lean', quantity: 1, price: 180 },
        { name: 'Beef Steak Bulk', quantity: 1, price: 220 },
      ],
      total: 400,
      delivery_address: 'Test Address, Bangkok',
      delivery_date: new Date().toISOString().split('T')[0],
      delivery_time: '12:00 - 13:00',
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: 'Test LINE notification sent successfully! Check your LINE account.',
    })
  } catch (error: any) {
    console.error('❌ LINE test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to send test notification',
        details: error?.stack,
      },
      { status: 500 }
    )
  }
}
