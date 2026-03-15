'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { formatDateICT, formatDateThaiICT } from '@/lib/dateUtils'

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const orderId = params.id
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (error) throw error
        setOrder(data)
      } catch (err) {
        setError('Order not found')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-homie-lime border-t-homie-green rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-homie-gray">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-homie-dark mb-2">Order Not Found</h1>
          <p className="text-homie-gray mb-6">Sorry, we couldn't find order #{orderId}</p>
          <Link href="/" className="btn-primary inline-block">Back to Home</Link>
        </div>
      </div>
    )
  }

  const items = Array.isArray(order.items) ? order.items : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-lime-50 to-white px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-homie-green mb-2">Order Details</h1>
          <p className="text-homie-gray">Order ID: <span className="font-mono font-bold text-homie-dark">{order.reference_id || order.id.slice(0, 8).toUpperCase()}</span></p>
        </div>

        {/* Order Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6 border border-lime-100">
          {/* Customer Info */}
          <div className="mb-6 pb-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-homie-dark mb-4">👤 Customer Information</h2>
            <div className="space-y-2">
              <p className="text-homie-gray"><span className="font-semibold">Name:</span> {order.customer_name}</p>
              <p className="text-homie-gray"><span className="font-semibold">Phone:</span> <a href={`tel:${order.customer_phone}`} className="text-homie-lime hover:text-homie-green font-medium">{order.customer_phone}</a></p>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="mb-6 pb-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-homie-dark mb-4">📍 Delivery Address</h2>
            <p className="text-homie-dark text-base leading-relaxed">{order.delivery_address}</p>
            <div className="mt-4 text-sm text-homie-gray">
              <p><span className="font-semibold">Date:</span> {formatDateThaiICT(order.delivery_date)}</p>
              <p><span className="font-semibold">Time:</span> {order.delivery_time}</p>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6 pb-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-homie-dark mb-4">🍽️ Items Ordered</h2>
            <div className="space-y-3">
              {items.length === 0 ? (
                <p className="text-homie-gray">No items found</p>
              ) : (
                items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-homie-dark">{item.name}</p>
                      <p className="text-sm text-homie-gray">{item.quantity} × ฿{Number(item.price).toLocaleString('th-TH')}</p>
                    </div>
                    <p className="font-bold text-homie-green">฿{(item.quantity * Number(item.price)).toLocaleString('th-TH')}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="mb-6 pb-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-homie-dark mb-4">💳 Payment Method</h2>
            <div className="flex items-center gap-3 p-3 bg-lime-50 rounded-lg">
              <span className="text-2xl">
                {order.payment_method === 'promptpay' ? '🇹🇭' :
                 order.payment_method === 'cod' ? '💵' :
                 order.payment_method === 'card' ? '💳' : '💰'}
              </span>
              <span className="capitalize font-semibold text-homie-dark">
                {order.payment_method === 'promptpay' ? 'PromptPay QR' :
                 order.payment_method === 'cod' ? 'Cash on Delivery' :
                 order.payment_method === 'card' ? 'Credit/Debit Card' : 'Unknown'}
              </span>
            </div>
            <p className="text-sm text-homie-gray mt-3">
              Status: <span className="font-bold capitalize text-homie-green">{order.status}</span>
            </p>
          </div>

          {/* Payment Slip */}
          {order.payment_slip_url && (
            <div className="mb-6 pb-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-homie-dark mb-4">📸 Payment Slip</h2>
              <div className="relative w-full max-w-sm mx-auto bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={order.payment_slip_url}
                  alt="Payment slip"
                  width={400}
                  height={500}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          )}

          {/* Total */}
          <div className="bg-gradient-to-r from-homie-green to-homie-lime text-white rounded-lg p-6 text-center mb-6">
            <p className="text-sm mb-1">Total Amount</p>
            <p className="text-4xl font-bold">฿{order.total.toLocaleString('th-TH')}</p>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800">📝 Special Notes</p>
              <p className="text-sm text-yellow-700 mt-1">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-homie-gray">
          <p>Questions? Call us: <a href="tel:0959505111" className="text-homie-green font-semibold">+66 95 950 5111</a></p>
          <Link href="/" className="text-homie-lime hover:text-homie-green mt-4 inline-block">← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
