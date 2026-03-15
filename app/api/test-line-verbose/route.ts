import { NextRequest, NextResponse } from 'next/server'
import { getLineClient } from '@/lib/line/client'

/**
 * Verbose test endpoint for LINE notifications with full API response
 * POST to /api/test-line-verbose with admin password
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // Basic auth
    if (password !== 'homie2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧪 [VERBOSE TEST] Starting LINE notification test...')

    // Check environment variables
    const hasToken = !!process.env.LINE_CHANNEL_ACCESS_TOKEN
    const hasUserId = !!process.env.LINE_USER_ID
    const userIds = process.env.LINE_USER_ID?.split(',').map(id => id.trim()) || []

    console.log('🔍 [VERBOSE TEST] Environment:')
    console.log('  - LINE_CHANNEL_ACCESS_TOKEN:', hasToken ? '✅ Configured' : '❌ Missing')
    console.log('  - LINE_USER_ID:', hasUserId ? `✅ Configured (${userIds.length} admin(s))` : '❌ Missing')

    if (!hasToken || !hasUserId) {
      return NextResponse.json({
        success: false,
        error: 'LINE credentials not configured',
        environment: {
          hasToken,
          hasUserId,
          adminCount: userIds.length,
        },
      })
    }

    try {
      const lineClient = getLineClient()
      console.log('✅ [VERBOSE TEST] Line client created successfully')

      const testOrder = {
        orderId: 'TEST001',
        customerName: 'Test Customer',
        customerPhone: '0912345678',
        items: [
          { name: 'Grilled Chicken Lean', quantity: 2, price: 180, portion: 'lean' },
          { name: 'Beef Steak Bulk', quantity: 1, price: 220, portion: 'bulk' },
        ],
        totalPrice: 580,
        deliveryAddress: '123 Test Street, Bangkok 10110',
        deliveryTime: '17:30',
        orderTime: new Date().toISOString(),
      }

      console.log('📤 [VERBOSE TEST] Sending test order:', JSON.stringify(testOrder, null, 2))

      await lineClient.sendOrderNotification(testOrder)

      console.log('✅ [VERBOSE TEST] Test notification sent successfully!')

      return NextResponse.json({
        success: true,
        message: 'Test LINE notification sent successfully!',
        details: {
          orderSent: testOrder,
          adminsNotified: userIds.length,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (clientError: any) {
      console.error('❌ [VERBOSE TEST] Line client error:', clientError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send LINE notification',
          errorDetails: {
            message: clientError?.message,
            code: clientError?.code,
          },
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('❌ [VERBOSE TEST] Test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Test failed',
      },
      { status: 500 }
    )
  }
}
