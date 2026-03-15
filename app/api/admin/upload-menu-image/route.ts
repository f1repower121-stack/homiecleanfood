import { createBrowserClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// Upload menu item image to Supabase Storage
// Bucket: menu-images (create in Supabase Dashboard if needed)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const menuItemId = formData.get('menuItemId') as string | null

    if (!file || !file.type?.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Missing or invalid image file' },
        { status: 400 }
      )
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    if (!allowed.includes(ext)) {
      return NextResponse.json(
        { error: 'Allowed formats: jpg, png, webp, gif' },
        { status: 400 }
      )
    }

    const path = menuItemId
      ? `${menuItemId}.${ext}`
      : `img_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const buffer = await file.arrayBuffer()
    const { data, error: uploadErr } = await supabase.storage
      .from('menu-images')
      .upload(path, new Blob([buffer], { type: file.type }), {
        upsert: true,
        contentType: file.type,
      })

    if (uploadErr) {
      console.error('[Upload Menu] Storage error:', uploadErr)
      return NextResponse.json(
        { error: `Upload failed: ${uploadErr.message}. Ensure "menu-images" bucket exists in Supabase Storage.` },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path,
    })
  } catch (error: any) {
    console.error('[Upload Menu] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    )
  }
}
