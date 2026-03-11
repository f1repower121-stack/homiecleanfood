'use client'
import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { supabase } from '@/lib/supabase'

const fmtDate = (s: string) =>
  new Date(s).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const fmt = (n: number) => n?.toLocaleString('th-TH') ?? '0'

type Order = { id: string; customer_name?: string; total?: number; created_at: string; status: string }

type Props = { onSelectOrder?: () => void; darkMode?: boolean }

export default function NotificationBell({ onSelectOrder, darkMode }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [open, setOpen] = useState(false)
  const { permission, supported, requestPermission, subscribe } = usePushNotifications()

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase.from('orders').select('id,customer_name,total,created_at,status').order('created_at', { ascending: false })
      setOrders(data || [])
      setPendingCount((data || []).filter((o: Order) => o.status === 'pending').length)
    }
    fetchOrders()
    const t = setInterval(fetchOrders, 30000)
    return () => clearInterval(t)
  }, [])

  const pendingOrders = orders.filter((o) => o.status === 'pending').slice(0, 5)

  const handleEnablePush = async () => {
    if (permission === 'granted') await subscribe()
    else await requestPermission()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
      >
        <svg className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {pendingCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
      </button>
      {open && (
        <div className={`absolute right-0 top-12 w-72 rounded-2xl shadow-xl z-50 overflow-hidden border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
            <p className="font-semibold text-sm">Notifications</p>
          </div>
          {supported && permission !== 'granted' && (
            <div className={`px-4 py-3 border-b ${darkMode ? 'bg-green-900/20 border-green-900/30' : 'bg-green-50 border-green-100'}`}>
              <button onClick={handleEnablePush} className={`text-sm font-medium hover:underline ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                Enable push notifications
              </button>
            </div>
          )}
          {pendingCount === 0 ? (
            <p className={`text-center py-8 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>All caught up! 🎉</p>
          ) : (
            pendingOrders.map((o) => (
              <div
                key={o.id}
                className={`px-4 py-3 border-b cursor-pointer ${darkMode ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-50 hover:bg-gray-50'}`}
                onClick={() => {
                  setOpen(false)
                  onSelectOrder ? onSelectOrder() : (window.location.href = '/admin')
                }}
              >
                <p className="text-sm font-medium">New order from {o.customer_name || 'Guest'}</p>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{fmtDate(o.created_at)} · ฿{fmt(o.total || 0)}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
