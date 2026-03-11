'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { UserPlus } from 'lucide-react'

interface WixCustomer {
  id?: string
  name?: string
  email?: string
  phone?: string
  address?: string
  total_spent?: number
  [key: string]: unknown
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  const [tab, setTab] = useState<'orders' | 'customers'>('orders')
  const [orders, setOrders] = useState<any[]>([])
  const [customers, setCustomers] = useState<WixCustomer[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [registering, setRegistering] = useState<string | null>(null)
  const [registerMsg, setRegisterMsg] = useState<{ id: string; msg: string } | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }, [])

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('wix_customers').select('*')
    setCustomers((data as WixCustomer[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authed) {
      if (tab === 'orders') fetchOrders()
      else fetchCustomers()
    }
  }, [authed, tab, fetchOrders, fetchCustomers])

  useEffect(() => {
    if (!authed) return
    const t = setInterval(() => (tab === 'orders' ? fetchOrders() : fetchCustomers()), 30000)
    return () => clearInterval(t)
  }, [authed, tab, fetchOrders, fetchCustomers])

  const handleRefresh = () => (tab === 'orders' ? fetchOrders() : fetchCustomers())

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id)
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status } : o)))
  }

  const handleRegister = async (customer: WixCustomer) => {
    const email = customer.email?.trim()
    if (!email) {
      setRegisterMsg({ id: customer.id || '', msg: 'No email' })
      setTimeout(() => setRegisterMsg(null), 3000)
      return
    }
    setRegistering(customer.id || email)
    try {
      const { data, error } = await supabase.auth.signUp({ email })
      if (error) throw error
      setRegisterMsg({ id: customer.id || email, msg: 'Magic link sent' })
      setTimeout(() => setRegisterMsg(null), 4000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setRegisterMsg({ id: customer.id || email, msg })
      setTimeout(() => setRegisterMsg(null), 4000)
    } finally {
      setRegistering(null)
    }
  }

  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-orange-100 text-orange-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const today = new Date().toDateString()
  const revenue = orders.filter(o => new Date(o.created_at).toDateString() === today).reduce((s, o) => s + (o.total || 0), 0)
  const pending = orders.filter(o => o.status === 'pending').length

  if (!authed)
    return (
      <div className="min-h-screen bg-homie-cream flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-homie-green rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">H</span>
          </div>
          <h1 className="text-2xl font-bold text-homie-green mb-1">Admin Panel</h1>
          <p className="text-gray-400 text-sm mb-6">Homie Clean Food</p>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e =>
              e.key === 'Enter' &&
              (pw === 'homie2024' ? setAuthed(true) : (setErr(true), setTimeout(() => setErr(false), 2000)))
            }
            placeholder="Password"
            className={`w-full px-4 py-3 border rounded-xl mb-3 text-center ${err ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
          />
          {err && <p className="text-red-500 text-sm mb-3">Wrong password</p>}
          <button
            onClick={() =>
              pw === 'homie2024' ? setAuthed(true) : (setErr(true), setTimeout(() => setErr(false), 2000))
            }
            className="w-full bg-homie-green text-white py-3 rounded-xl font-semibold"
          >
            Sign In
          </button>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-homie-green text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl">🏠 Homie Admin</h1>
          <p className="text-white/70 text-xs">Auto-refreshes every 30s</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="bg-white/20 px-3 py-2 rounded-xl text-sm">
            {loading ? '⏳' : '🔄'} Refresh
          </button>
          <button onClick={() => setAuthed(false)} className="bg-white/20 px-3 py-2 rounded-xl text-sm">
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setTab('orders')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                tab === 'orders'
                  ? 'border-homie-green text-homie-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setTab('customers')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                tab === 'customers'
                  ? 'border-homie-green text-homie-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Customers
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {tab === 'orders' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { l: "Today's Revenue", v: `฿${revenue.toLocaleString()}`, c: 'text-green-600' },
                { l: 'Pending 🔴', v: pending, c: 'text-yellow-600' },
                {
                  l: "Today's Orders",
                  v: orders.filter(o => new Date(o.created_at).toDateString() === today).length,
                  c: 'text-blue-600',
                },
                { l: 'Total', v: orders.length, c: 'text-purple-600' },
              ].map(s => (
                <div key={s.l} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
                  <div className="text-sm text-gray-500">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {['all', 'pending', 'confirmed', 'preparing', 'delivered', 'cancelled'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-4 py-1.5 rounded-full text-sm capitalize ${
                    filter === s ? 'bg-homie-green text-white' : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  {s}
                  {s !== 'all' && ` (${orders.filter(o => o.status === s).length})`}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl text-gray-400">
                  <p className="text-4xl mb-3">📦</p>
                  <p className="font-medium">No orders yet</p>
                  <p className="text-sm mt-1">Orders will appear here when customers order</p>
                </div>
              ) : (
                filtered.map(order => (
                  <div
                    key={order.id}
                    className={`bg-white rounded-2xl shadow-sm overflow-hidden ${
                      order.status === 'pending' ? 'ring-2 ring-yellow-300' : ''
                    }`}
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold">#{order.id.slice(0, 8).toUpperCase()}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full capitalize ${colors[order.status] || 'bg-gray-100'}`}
                            >
                              {order.status}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(order.created_at).toLocaleString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="text-sm font-medium">
                            👤 {order.customer_name || 'Guest'}{' '}
                            {order.customer_phone && (
                              <span className="text-homie-green">📞 {order.customer_phone}</span>
                            )}
                          </div>
                          {order.delivery_address && (
                            <div className="text-xs text-gray-500">📍 {order.delivery_address}</div>
                          )}
                          {order.notes && (
                            <div className="text-xs text-orange-600 mt-1">📝 {order.notes}</div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-homie-green text-xl">
                            ฿{(order.total || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {order.payment_method === 'cod' ? '💵 COD' : '💳 Card'}
                          </div>
                          <div className="text-xs text-gray-400">{expanded === order.id ? '▲' : '▼'}</div>
                        </div>
                      </div>
                    </div>
                    {expanded === order.id && (
                      <div className="border-t p-4 bg-gray-50 space-y-4">
                        {Array.isArray(order.items) && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                            {order.items.map((item: any, i: number) => (
                              <div
                                key={i}
                                className="flex justify-between text-sm bg-white rounded-lg px-3 py-2 mb-1"
                              >
                                <span>
                                  {item.name}{' '}
                                  <span className="text-gray-400 text-xs">
                                    ({item.portion}) x{item.quantity}
                                  </span>
                                </span>
                                <span className="font-bold text-homie-green">
                                  ฿{item.price * item.quantity}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between bg-homie-green text-white rounded-lg px-3 py-2 text-sm font-bold mt-1">
                              <span>Total</span>
                              <span>฿{order.total}</span>
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Update Status</p>
                          <div className="flex flex-wrap gap-2">
                            {['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'].map(s => (
                              <button
                                key={s}
                                onClick={() => updateStatus(order.id, s)}
                                className={`px-3 py-1.5 rounded-xl text-xs capitalize ${
                                  order.status === s
                                    ? 'bg-homie-green text-white'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === 'customers' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-400">Loading customers...</div>
            ) : customers.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">👥</p>
                <p className="font-medium">No customers</p>
                <p className="text-sm mt-1">wix_customers table is empty or does not exist</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-semibold text-homie-green">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-homie-green">Email</th>
                      <th className="text-left px-4 py-3 font-semibold text-homie-green">Phone</th>
                      <th className="text-left px-4 py-3 font-semibold text-homie-green">Address</th>
                      <th className="text-right px-4 py-3 font-semibold text-homie-green">Total Spent</th>
                      <th className="px-4 py-3 w-28"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, i) => (
                      <tr key={c.id || i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-homie-dark">{c.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{c.email ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.address ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-homie-green">
                          ฿{(c.total_spent ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRegister(c)}
                            disabled={registering === (c.id || c.email)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-homie-lime text-white text-xs font-medium rounded-lg hover:bg-homie-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <UserPlus size={14} />
                            {registering === (c.id || c.email) ? 'Sending…' : 'Register'}
                          </button>
                          {registerMsg && (registerMsg.id === c.id || registerMsg.id === c.email) && (
                            <p className={`text-xs mt-1 ${registerMsg.msg.includes('sent') ? 'text-green-600' : 'text-amber-600'}`}>
                              {registerMsg.msg}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
