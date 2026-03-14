import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';

/**
 * Verify that the request is from Line servers
 * Line Messaging API sends an X-Line-Signature header that we need to validate
 */
function verifyLineSignature(body: string, signature: string | null): boolean {
  if (!CHANNEL_SECRET || !signature) {
    return false;
  }

  const hash = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(body)
    .digest('base64');

  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('X-Line-Signature');
    const body = await request.text();

    // Verify the request is from Line
    if (!verifyLineSignature(body, signature)) {
      console.warn('Invalid Line signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const events = JSON.parse(body).events || [];

    console.log(`📨 Received ${events.length} Line events`);

    // Handle each event
    for (const event of events) {
      console.log(`Event type: ${event.type}`);

      // For now, just acknowledge the webhook
      // In the future, you can handle incoming messages from Line here
      if (event.type === 'message' && event.message.type === 'text') {
        console.log(`Message from ${event.source.userId}: ${event.message.text}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing Line webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Line also sends a GET request to verify the webhook URL is valid
 */
export async function GET(request: NextRequest) {
  console.log('📍 Line webhook endpoint is accessible');
  return NextResponse.json({ status: 'ok' });
}
