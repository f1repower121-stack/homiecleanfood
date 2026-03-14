import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#7CB518',
}

export const metadata: Metadata = {
  title: 'Homie Admin Dashboard',
  description: 'Admin dashboard for orders, payments, and menu management',
  manifest: '/manifest-admin.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Homie Admin' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
