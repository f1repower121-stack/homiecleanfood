import { NextRequest, NextResponse } from 'next/server';
import { getLineClient } from '@/lib/line/client';

/**
 * Test endpoint to verify Line API connection
 * GET /api/line/test - Send a test message to the admin's Line account
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 LINE TEST: Starting Line API test...');
    console.log('🧪 LINE TEST: Checking environment variables...');
    console.log('🧪 LINE TEST: TOKEN exists:', !!process.env.LINE_CHANNEL_ACCESS_TOKEN);
    console.log('🧪 LINE TEST: USER_ID:', process.env.LINE_USER_ID);
    console.log('🧪 LINE TEST: SECRET exists:', !!process.env.LINE_CHANNEL_SECRET);

    const lineClient = getLineClient();
    console.log('🧪 LINE TEST: LineClient initialized successfully');

    // Send a simple test message
    await lineClient.sendTextMessage('🧪 Test message from homiecleanfood API - Line integration is working!');
    console.log('🧪 LINE TEST: Test message sent successfully');

    return NextResponse.json({
      status: 'success',
      message: 'Test message sent to Line',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🧪 LINE TEST: FAILED -', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
