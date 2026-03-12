'use client'

import { useMemo } from 'react'
import Link from 'next/link'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://homiecleanfood.vercel.app'

export default function QRPage() {
  const qrUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(SITE_URL)}`,
    []
  )

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-homie-green mb-2">Scan to Order</h1>
      <p className="text-homie-gray text-sm mb-8 text-center max-w-sm">
        Show this QR code at your restaurant or share it so customers can open Homie and order directly.
      </p>
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <img
          src={qrUrl}
          alt="QR Code for Homie Clean Food"
          className="w-[300px] h-[300px]"
          width={300}
          height={300}
        />
      </div>
      <p className="text-homie-gray text-xs mt-4">{SITE_URL}</p>
      <Link href="/" className="mt-8 text-homie-lime font-semibold hover:underline">
        ← Back to Home
      </Link>
    </div>
  )
}
