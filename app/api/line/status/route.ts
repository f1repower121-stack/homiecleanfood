import { NextResponse } from 'next/server'

/**
 * GET /api/line/status - Check if LINE env vars are configured (no secrets exposed)
 * Helps debug "notifications don't come" - if configured: false, add vars in Vercel
 */
export async function GET() {
  const hasToken = !!process.env.LINE_CHANNEL_ACCESS_TOKEN
  const hasUserId = !!process.env.LINE_USER_ID
  const userIds = process.env.LINE_USER_ID?.split(',').map((id: string) => id.trim()).filter(Boolean) || []

  return NextResponse.json({
    configured: hasToken && hasUserId,
    hasToken,
    hasUserId,
    adminCount: userIds.length,
    hint: !hasToken || !hasUserId
      ? 'Add LINE_CHANNEL_ACCESS_TOKEN and LINE_USER_ID in Vercel Project Settings > Environment Variables'
      : 'Credentials set. Ensure your LINE bot is in development mode or has approved channels for push messages.',
  })
}
