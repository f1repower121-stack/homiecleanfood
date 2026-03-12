import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CartProvider from '@/components/CartProvider'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#7CB518',
}

export const metadata: Metadata = {
  title: 'Homie Clean Food | Fresh Clean Meals Bangkok',
  description: 'Macro-balanced, freshly crafted clean meals delivered in Bangkok. Chicken, beef & fish options with Lean or Bulk portions.',
  keywords: 'clean food bangkok, healthy meal delivery, meal prep bangkok, homiecleanfood',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Homie Clean Food' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
          <PWAInstallPrompt />
        </CartProvider>
      </body>
    </html>
  )
}
