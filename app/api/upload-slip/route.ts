import { createBrowserClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const orderId = formData.get('orderId') as string

    if (!file || !orderId) {
      return NextResponse.json(
        { error: 'Missing file or orderId' },
        { status: 400 }
      )
    }

    console.log(`[Upload] Processing file: ${file.name} for order: ${orderId}`)

    // Create Supabase client
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get file extension
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${orderId}.${ext}`

    // Convert file to buffer
    const buffer = await file.arrayBuffer()

    console.log(`[Upload] Uploading to storage: ${path} (${buffer.byteLength} bytes)`)

    // Upload to storage
    const { data, error: uploadErr } = await supabase.storage
      .from('payment-slips')
      .upload(path, new Blob([buffer], { type: file.type || 'image/jpeg' }), {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      })

    if (uploadErr) {
      console.error('[Upload] Storage error:', uploadErr)
      return NextResponse.json(
        { error: `Upload failed: ${uploadErr.message}` },
        { status: 500 }
      )
    }

    console.log('[Upload] File uploaded successfully:', data)

    // Get public URL
    const publicUrl = `https://efvbudblbtayfszxgxhq.supabase.co/storage/v1/object/public/payment-slips/${path}`

    // Update order with payment slip URL using RPC function (bypasses RLS)
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      'update_payment_slip_url',
      {
        order_id: orderId,
        slip_url: publicUrl,
      }
    )

    if (rpcErr) {
      console.error('[Upload] RPC error:', rpcErr)
      return NextResponse.json(
        { error: `Failed to save URL: ${rpcErr.message}` },
        { status: 500 }
      )
    }

    console.log('[Upload] Successfully saved payment slip URL:', publicUrl, rpcData)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: 'Payment slip uploaded successfully',
    })
  } catch (error: any) {
    console.error('[Upload] Error:', error)
    return NextResponse.json(
      { error: `Server error: ${error?.message}` },
      { status: 500 }
    )
  }
}
