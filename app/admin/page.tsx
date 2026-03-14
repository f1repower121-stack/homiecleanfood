'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import AdminLoyaltyTab from '@/components/admin/LoyaltyTab'
import NotificationBell from '@/components/admin/NotificationBell'
import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'
import { requestNotificationPermission, sendOrderNotification, subscribeToPushNotifications, unsubscribeFromPushNotifications } from '@/lib/pushNotifications'

const ADMIN_PASSWORD = 'homie2024'

// ─── Types ───────────────────────────────────────────────────────────────────
type Order = {
  id: string; customer_name: string; customer_phone: string
  delivery_address: string; items: any[]; total: number
  status: string; payment_method: string; notes: string; created_at: string
  payment_confirmed?: boolean
  payment_slip_url?: string
  reference_id?: string
}
type MenuItem = {
  id: string; name: string; category: string; lean_price: number
  bulk_price: number; description: string; image_url: string
  calories_lean: number; protein_lean: number; carb_lean: number
  fat_lean: number; available: boolean; meal_type?: string
}
type Customer = {
  id: string; full_name: string; email: string; phone: string
  points: number; tier: string; created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_STEPS = ['pending','confirmed','preparing','out_for_delivery','delivered']
const STATUS_LABEL: Record<string,string> = {
  pending:'Pending', confirmed:'Confirmed', preparing:'Preparing',
  out_for_delivery:'Out for Delivery', delivered:'Delivered'
}
const STATUS_COLOR: Record<string,string> = {
  pending:'bg-amber-100 text-amber-700 border-amber-200',
  confirmed:'bg-blue-100 text-blue-700 border-blue-200',
  preparing:'bg-orange-100 text-orange-700 border-orange-200',
  out_for_delivery:'bg-purple-100 text-purple-700 border-purple-200',
  delivered:'bg-emerald-100 text-emerald-700 border-emerald-200',
}
const STATUS_DOT: Record<string,string> = {
  pending:'bg-amber-400', confirmed:'bg-blue-400', preparing:'bg-orange-400',
  out_for_delivery:'bg-purple-400', delivered:'bg-emerald-400',
}
const TIER_BADGE: Record<string,{label:string,cls:string}> = {
  homie:{label:'🌱 Homie',cls:'bg-gray-100 text-gray-600'},
  'Homie':{label:'🌱 Homie',cls:'bg-gray-100 text-gray-600'},
  clean_eater:{label:'🥗 Clean Eater',cls:'bg-lime-100 text-lime-700'},
  'Clean Eater':{label:'🥗 Clean Eater',cls:'bg-lime-100 text-lime-700'},
  protein_king:{label:'👑 Protein King',cls:'bg-amber-100 text-amber-700'},
  'Protein King':{label:'👑 Protein King',cls:'bg-amber-100 text-amber-700'},
}

function getTierFromPoints(pts: number): string {
  if (pts >= 500) return 'Protein King'
  if (pts >= 200) return 'Clean Eater'
  return 'Homie'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n:number) => n?.toLocaleString('th-TH') ?? '0'
const fmtDate = (s:string) => new Date(s).toLocaleString('th-TH',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
const daysAgo = (n:number) => { const d=new Date(); d.setDate(d.getDate()-n); return d }

// ─── Mini Components ──────────────────────────────────────────────────────────
function Badge({s}:{s:string}) {
  const cls = STATUS_COLOR[s] || 'bg-gray-100 text-gray-600 border-gray-200'
  return <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s]||'bg-gray-400'}`}/>
    {STATUS_LABEL[s]||s}
  </span>
}

function StatCard({icon,label,value,sub,color='green'}:{icon:string,label:string,value:string|number,sub?:string,color?:string}) {
  const colors:Record<string,string> = {
    green:'from-emerald-500 to-green-600',
    orange:'from-orange-400 to-amber-500',
    blue:'from-blue-500 to-indigo-600',
    purple:'from-purple-500 to-violet-600',
  }
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-lg mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [tab, setTab] = useState('orders')
  const [payFilter, setPayFilter] = useState<'all'|'promptpay'|'cod'|'card'>('all')
  const [role, setRole] = useState<'admin'|'kitchen'>('admin')

  // PromptPay settings state
  const [ppPhone, setPpPhone] = useState('0959505111')
  const [ppQrUrl, setPpQrUrl] = useState('')
  const [ppSaving, setPpSaving] = useState(false)
  const [ppSaved, setPpSaved] = useState(false)

  // Orders state
  const [orders, setOrders] = useState<Order[]>([])
  const [orderFilter, setOrderFilter] = useState('all')
  const [expanded, setExpanded] = useState<string|null>(null)
  const [loadingOrders, setLoadingOrders] = useState(false)

  // Menu state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [editItem, setEditItem] = useState<Partial<MenuItem>|null>(null)
  const [isNew, setIsNew] = useState(false)
  const [menuSaving, setMenuSaving] = useState(false)
  const [menuMsg, setMenuMsg] = useState('')

  // Customers
  const [customers, setCustomers] = useState<Customer[]>([])
  const [custSearch, setCustSearch] = useState('')
  const [custLoading, setCustLoading] = useState(false)

  // Loyalty management
  const [loyaltySearch, setLoyaltySearch] = useState('')
  const [editingPoints, setEditingPoints] = useState<string|null>(null)
  const [pointsInput, setPointsInput] = useState('')
  const [pointsMsg, setPointsMsg] = useState('')
  const [pointsSaving, setPointsSaving] = useState(false)

  // Analytics
  const [period, setPeriod] = useState('7')

  // Push Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [lastOrderId, setLastOrderId] = useState('')
  const [keepSessionAlive, setKeepSessionAlive] = useState(true)

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true)
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at',{ascending:false})

      if (error) {
        console.error('❌ Error fetching orders:', error)
        setOrders([])
        setLoadingOrders(false)
        return
      }

      // Send notification for new order
      if (data && data.length > 0 && notificationsEnabled) {
        const latestOrder = data[0]
        if (latestOrder.id !== lastOrderId) {
          setLastOrderId(latestOrder.id)

          // Show local notification
          sendOrderNotification({
            customerName: latestOrder.customer_name || 'Customer',
            total: latestOrder.total || 0,
            items: latestOrder.items || [],
            referenceId: latestOrder.reference_id,
          })

          // Trigger server-side Web Push to all subscribed devices
          try {
            const itemNames = (latestOrder.items || [])
              .slice(0, 2)
              .map((i: any) => i.name)
              .join(', ')
            const itemsSuffix = (latestOrder.items || []).length > 2 ? '...' : ''

            const response = await fetch('/api/send-push-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: `🎉 New Order from ${latestOrder.customer_name || 'Customer'}`,
                body: `${itemNames}${itemsSuffix} - ฿${latestOrder.total || 0}`,
                data: {
                  orderId: latestOrder.id,
                  referenceId: latestOrder.reference_id,
                },
              }),
            })

            if (response.ok) {
              const result = await response.json()
              console.log(`✅ Web Push sent to ${result.sent}/${result.total} subscribers`)
            }
          } catch (err: any) {
            console.error('❌ Failed to send Web Push:', err)
          }
        }
      }

      setOrders(data||[])
      console.log(`✅ Loaded ${data?.length || 0} orders`)
    } catch (err: any) {
      console.error('❌ Unexpected error in fetchOrders:', err)
      setOrders([])
    }
    setLoadingOrders(false)
  }, [notificationsEnabled, lastOrderId])

  const fetchMenu = useCallback(async () => {
    try {
      const { data } = await supabase.from('menu_items').select('*').order('name')
      setMenuItems(data||[])
    } catch { setMenuItems([]) }
  }, [])

  // ✅ FIXED: fetch from API endpoint that bypasses RLS
  const fetchCustomers = useCallback(async () => {
    setCustLoading(true)
    try {
      // Use API endpoint to bypass RLS and get ALL customers
      const response = await fetch('/api/admin/customers')

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ Error fetching customers from API:', error)
        setCustomers([])
        setCustLoading(false)
        return
      }

      const { customers: profiles, orders: orderData } = await response.json()
      console.log(`✅ Loaded ${profiles?.length || 0} profiles from API`)

      // Calculate spend per user
      const spendMap: Record<string, number> = {}
      ;(orderData||[]).forEach((o: any) => {
        if (o.user_id) spendMap[o.user_id] = (spendMap[o.user_id] || 0) + (o.total || 0)
      })

      const enriched = (profiles||[]).map((p: any) => ({
        ...p,
        tier: p.tier || getTierFromPoints(p.points || 0),
        total_spent: spendMap[p.id] || 0,
      }))
      setCustomers(enriched)
      console.log(`✅ Enriched ${enriched.length} customers with order data`)
    } catch (e) {
      console.error('❌ Unexpected error in fetchCustomers:', e)
      setCustomers([])
    }
    setCustLoading(false)
  }, [])

  // Load PromptPay phone from DB + generate QR
  useEffect(() => {
    if (!authed) return
    supabase.from('loyalty_config').select('promptpay_number').eq('id','singleton').single()
      .then(({ data }) => {
        const phone = (data as any)?.promptpay_number || '0959505111'
        setPpPhone(phone)
        const payload = generatePayload(phone, { amount: 0 })
        QRCode.toDataURL(payload, { width: 200, margin: 2 }).then(setPpQrUrl)
      })
  }, [authed])

  // Load authenticated state from localStorage on mount (persistent session)
  useEffect(() => {
    const storedAuth = localStorage.getItem('adminAuthed')
    if (storedAuth === 'true') {
      setAuthed(true)
    }
  }, [])

  // Save authenticated state to localStorage
  useEffect(() => {
    if (authed) {
      localStorage.setItem('adminAuthed', 'true')
    } else {
      localStorage.removeItem('adminAuthed')
    }
  }, [authed])

  // Load role from localStorage on mount (persistent role selection)
  useEffect(() => {
    const storedRole = localStorage.getItem('adminRole') as 'admin' | 'kitchen' | null
    if (storedRole === 'admin' || storedRole === 'kitchen') {
      setRole(storedRole)
    }
  }, [])

  // Save role to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('adminRole', role)
  }, [role])

  // Regenerate QR when phone changes
  useEffect(() => {
    if (!ppPhone) return
    const payload = generatePayload(ppPhone, { amount: 0 })
    QRCode.toDataURL(payload, { width: 200, margin: 2 }).then(setPpQrUrl)
  }, [ppPhone])

  useEffect(() => {
    if (!authed) return
    fetchOrders(); fetchMenu(); fetchCustomers()
    // Poll every 10 seconds for new orders (faster notification delivery)
    const t = setInterval(fetchOrders, 10000)
    return () => clearInterval(t)
  }, [authed, fetchOrders, fetchMenu, fetchCustomers])

  // Request notification permission and register service worker when admin logs in
  useEffect(() => {
    if (!authed) return

    // Register service worker for background notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => console.log('✅ Service Worker registered:', reg))
        .catch(err => console.error('❌ Service Worker registration failed:', err))
    }

    // Request notification permission and subscribe to Web Push
    requestNotificationPermission().then(granted => {
      setNotificationsEnabled(granted)
      if (granted) {
        console.log('✅ Notifications enabled')
        // Subscribe to Web Push for background notifications
        subscribeToPushNotifications()
          .then(success => {
            if (success) {
              console.log('✅ Successfully subscribed to Web Push notifications')
            } else {
              console.warn('⚠️ Failed to subscribe to Web Push')
            }
          })
          .catch(err => console.error('❌ Subscription error:', err))
      }
    })

    // Cleanup: unsubscribe when unmounting
    return () => {
      if (notificationsEnabled) {
        unsubscribeFromPushNotifications().catch(err => console.error('Unsubscribe error:', err))
      }
    }
  }, [authed, notificationsEnabled])

  const updateStatus = async (order: Order, newStatus: string) => {
    await supabase.from('orders').update({status:newStatus}).eq('id',order.id)
    setOrders(prev => prev.map(o => o.id===order.id ? {...o,status:newStatus} : o))
    if (newStatus==='preparing'||newStatus==='out_for_delivery') {
      const phone = order.customer_phone?.replace(/\D/g,'').replace(/^0/,'66')
      const msg = newStatus==='preparing'
        ? `Hi ${order.customer_name}! 👨‍🍳 Your Homie Clean Food order is being prepared. We'll notify you when it's on its way!`
        : `Hi ${order.customer_name}! 🚚 Your order is out for delivery! Should arrive soon. 🥗`
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank')
    }
  }

  const confirmPayment = async (orderId: string, confirmed: boolean) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_confirmed: confirmed } : o))
    await supabase.from('orders').update({ payment_confirmed: confirmed } as any).eq('id', orderId)
  }

  const saveMenuItem = async () => {
    if (!editItem?.name) return
    setMenuSaving(true)
    if (isNew) await supabase.from('menu_items').insert([editItem])
    else await supabase.from('menu_items').update(editItem).eq('id',editItem.id)
    setMenuMsg('Saved! ✅'); setTimeout(()=>setMenuMsg(''),2000)
    setEditItem(null); fetchMenu(); setMenuSaving(false)
  }

  const deleteMenuItem = async (id:string) => {
    if (!confirm('Delete this item?')) return
    await supabase.from('menu_items').delete().eq('id',id); fetchMenu()
  }

  // ✅ NEW: manually adjust points for a user
  const savePoints = async (customerId: string) => {
    const delta = parseInt(pointsInput)
    if (isNaN(delta)) return
    setPointsSaving(true)
    try {
      const { error } = await supabase.rpc('add_points', { user_id: customerId, points_to_add: delta })
      if (error) throw error
      setPointsMsg(delta > 0 ? `+${delta} pts added ✅` : `${delta} pts removed ✅`)
      setEditingPoints(null)
      setPointsInput('')
      fetchCustomers()
      setTimeout(() => setPointsMsg(''), 3000)
    } catch {
      setPointsMsg('❌ Failed to update points')
      setTimeout(() => setPointsMsg(''), 3000)
    }
    setPointsSaving(false)
  }

  // ✅ NEW: set points to absolute value
  const setAbsolutePoints = async (customerId: string, newTotal: number) => {
    const customer = customers.find(c => c.id === customerId)
    if (!customer) return
    const delta = newTotal - (customer.points || 0)
    setPointsSaving(true)
    try {
      await supabase.rpc('add_points', { user_id: customerId, points_to_add: delta })
      setPointsMsg(`Points set to ${newTotal} ✅`)
      setEditingPoints(null)
      setPointsInput('')
      fetchCustomers()
      setTimeout(() => setPointsMsg(''), 3000)
    } catch {
      setPointsMsg('❌ Failed')
      setTimeout(() => setPointsMsg(''), 3000)
    }
    setPointsSaving(false)
  }

  const exportCSV = () => {
    const rows = [
      ['Date','Customer','Phone','Items','Total','Status','Payment'],
      ...orders.map(o => [
        new Date(o.created_at).toLocaleDateString('th-TH'),
        o.customer_name||'', o.customer_phone||'',
        (o.items||[]).map((i:any)=>`${i.name} x${i.quantity}`).join('; '),
        o.total, o.status, o.payment_method,
      ])
    ]
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `homie-orders-${new Date().toISOString().split('T')[0]}.csv`; a.click()
  }

  // Analytics
  const filteredByPeriod = orders.filter(o => new Date(o.created_at) >= daysAgo(parseInt(period)))
  const totalRev = filteredByPeriod.reduce((s,o)=>s+(o.total||0),0)
  const avgOrder = filteredByPeriod.length ? totalRev/filteredByPeriod.length : 0
  const pendingCount = orders.filter(o=>o.status==='pending').length
  const todayOrders = orders.filter(o=>new Date(o.created_at).toDateString()===new Date().toDateString())
  const todayRev = todayOrders.reduce((s,o)=>s+(o.total||0),0)
  const topItems: Record<string,number> = {}
  filteredByPeriod.forEach(o=>{try{(o.items||[]).forEach((i:any)=>{if(i?.name)topItems[i.name]=(topItems[i.name]||0)+(i.quantity||1)})}catch{}})
  const topItemsSorted = Object.entries(topItems).sort((a,b)=>b[1]-a[1]).slice(0,5)
  const revenueByDay: Record<string,number> = {}
  filteredByPeriod.forEach(o=>{
    const d = new Date(o.created_at).toLocaleDateString('th-TH',{day:'2-digit',month:'short'})
    revenueByDay[d]=(revenueByDay[d]||0)+(o.total||0)
  })

  const filteredOrders = orders
    .filter(o => orderFilter==='all' || o.status===orderFilter)

  // ─── Login Screen ─────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, position: 'fixed', top: 0, left: 0, overflow: 'hidden' }} className="bg-gradient-to-br from-[#1a2e0f] via-[#2d5016] to-[#1a2e0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
            <span className="text-4xl">🥗</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Homie Clean Food</h1>
          <p className="text-green-300 text-sm mt-1">Admin Dashboard</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl">
          <label className="block text-white/70 text-sm mb-1.5">Password</label>
          <input
            type="password" value={pw} placeholder="Enter admin password"
            onChange={e=>{setPw(e.target.value);setPwErr(false)}}
            onKeyDown={e=>{if(e.key==='Enter'){if(pw===ADMIN_PASSWORD)setAuthed(true);else setPwErr(true)}}}
            className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm outline-none focus:ring-2 focus:ring-green-400 mb-1 ${pwErr?'border-red-400':'border-white/20'}`}
          />
          {pwErr && <p className="text-red-300 text-xs mb-3">Incorrect password</p>}
          <div className="flex gap-2 mt-3 mb-4">
            {(['admin','kitchen'] as const).map(r=>(
              <button key={r} onClick={()=>setRole(r)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${role===r?'bg-green-500 text-white':'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                {r==='admin'?'👑 Admin':'👨‍🍳 Kitchen'}
              </button>
            ))}
          </div>
          <button onClick={()=>{if(pw===ADMIN_PASSWORD)setAuthed(true);else setPwErr(true)}}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl py-3 font-semibold hover:opacity-90 transition-opacity shadow-lg">
            Sign In
          </button>
        </div>
      </div>
    </div>
  )

  // ─── Nav Items ────────────────────────────────────────────────────────────
  const unconfirmedPayments = orders.filter(o =>
    (o.payment_method === 'promptpay' || o.payment_method === 'card') && !o.payment_confirmed
  ).length

  const navItems = [
    {key:'orders', icon:'📦', label:'Orders & Payments', badge: pendingCount + unconfirmedPayments || undefined},
    ...(role==='admin' ? [
      {key:'menu', icon:'🍱', label:'Menu / Meals'},
      {key:'customers', icon:'👥', label:'Customers'},
      {key:'loyalty', icon:'⭐', label:'Loyalty Points'},
      {key:'referrals', icon:'🎁', label:'Referral System'},
      {key:'analytics', icon:'📊', label:'Analytics'},
      {key:'settings', icon:'⚙️', label:'Settings'},
    ] : []),
  ]

  const dm = darkMode
  const bg = dm ? 'bg-gray-950' : 'bg-gray-50'
  const card = dm ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
  const text = dm ? 'text-gray-100' : 'text-gray-900'
  const muted = dm ? 'text-gray-400' : 'text-gray-500'
  const sidebarBg = dm ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
  const inputCls = `w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 ${dm?'bg-gray-800 border-gray-700 text-gray-100':'border-gray-200'}`

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, position: 'fixed', top: 0, left: 0, overflow: 'hidden' }} className={`${bg} ${text} flex flex-col md:flex-row`}>

      {/* Mobile Overlay for Sidebar */}
      {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-10" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`${sidebarBg} border-r flex flex-col transition-all duration-300 fixed md:sticky md:w-56 top-0 h-screen z-30 overflow-hidden
        ${sidebarOpen ? 'w-56 left-0' : 'w-16 -left-full md:left-0 md:w-16'}`}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-inherit">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-700 rounded-lg flex items-center justify-center shrink-0 text-sm">🥗</div>
          {sidebarOpen && <span className="font-bold text-sm text-green-700 truncate">Homie Admin</span>}
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(item=>(
            <button key={item.key} onClick={()=>setTab(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all relative
                ${tab===item.key?'bg-green-50 text-green-700 border-r-2 border-green-600':`${muted} hover:bg-gray-50`}`}>
              <span className="text-base shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {item.badge ? <span className={`${sidebarOpen?'ml-auto':'absolute top-1.5 right-1.5'} bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold`}>{item.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="border-t border-inherit p-3 space-y-1">
          <button onClick={()=>setDarkMode(!dm)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${muted} hover:bg-gray-100 transition-all`}>
            <span>{dm?'☀️':'🌙'}</span>
            {sidebarOpen && <span>{dm?'Light Mode':'Dark Mode'}</span>}
          </button>
          <button onClick={()=>setAuthed(false)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all">
            <span>🚪</span>
            {sidebarOpen && <span>Checkout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 w-full md:w-auto">
        <header className={`${card} border-b sticky top-0 z-10 flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3`}>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} className={`${muted} p-1.5 rounded-lg hover:bg-gray-100`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 ml-auto">
            <div className={`hidden sm:flex items-center gap-2 text-xs ${muted} ${dm?'bg-gray-800':'bg-gray-100'} rounded-xl px-3 py-1.5`}>
              <span className="text-green-600 font-semibold">Today</span>
              <span>{todayOrders.length} orders</span>
              <span>·</span>
              <span className="font-semibold text-green-600">฿{fmt(todayRev)}</span>
            </div>
            <NotificationBell onSelectOrder={()=>setTab('orders')} darkMode={dm} />
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {role==='admin'?'A':'K'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">

          {/* ═══ ORDERS & PAYMENTS ════════════════════════════════════════════ */}
          {tab==='orders' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-2xl font-bold">Orders & Payments</h2>
                  <p className={`text-sm ${muted}`}>{filteredOrders.length} orders · {unconfirmedPayments} pending payment confirmation</p>
                </div>
                <button onClick={fetchOrders} className="text-sm border rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                  <span>↻</span> Refresh
                </button>
              </div>

              {/* Status & Payment Filter Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1 flex-wrap">
                {['all',...STATUS_STEPS].map(s=>(
                  <button key={s} onClick={()=>setOrderFilter(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border
                      ${orderFilter===s?'bg-green-600 text-white border-green-600':'bg-white text-gray-600 border-gray-200 hover:border-green-300'}`}>
                    {s==='all'?`All (${orders.length})`:STATUS_LABEL[s]}
                    {s!=='all' && orders.filter(o=>o.status===s).length>0 && ` (${orders.filter(o=>o.status===s).length})`}
                  </button>
                ))}
              </div>
              {loadingOrders && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/>
                </div>
              )}
              <div className="space-y-3">
                {filteredOrders.map(order=>{
                  const isPromptPay = order.payment_method === 'promptpay'
                  const isCard = order.payment_method === 'card'
                  const needsConfirm = (isPromptPay || isCard) && !order.payment_confirmed
                  const methodColor = isPromptPay ? 'bg-green-100 text-green-700' : order.payment_method === 'cod' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  const methodLabel = isPromptPay ? '🇹🇭 PromptPay' : order.payment_method === 'cod' ? '💵 COD' : '💳 Card'
                  return (
                  <div key={order.id} className={`${card} border-2 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${needsConfirm ? 'border-amber-200 bg-amber-50' : 'border-transparent'}`}>
                    <div className="p-4 cursor-pointer select-none" onClick={()=>setExpanded(expanded===order.id?null:order.id)}>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-lg shrink-0">
                          {order.status==='delivered'?'✅':order.status==='out_for_delivery'?'🚚':order.status==='preparing'?'👨‍🍳':'📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm">{order.customer_name||'Guest'}</span>
                            {order.reference_id && <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">#{order.reference_id}</span>}
                            <Badge s={order.status}/>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${methodColor}`}>{methodLabel}</span>
                            {order.payment_confirmed ? (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">✓ Paid</span>
                            ) : needsConfirm ? (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">⏳ Pending</span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">○ COD</span>
                            )}
                          </div>
                          <p className={`text-xs ${muted} mb-0.5`}>{order.customer_phone} · {fmtDate(order.created_at)}</p>
                          <p className={`text-xs ${muted} truncate`}>{order.delivery_address}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-green-600 text-lg">฿{fmt(order.total)}</p>
                          {order.payment_slip_url && (
                            <p className="text-xs text-blue-600 font-semibold mt-1">📎 Slip</p>
                          )}
                        </div>
                        <svg className={`w-4 h-4 ${muted} shrink-0 transition-transform mt-1 ${expanded===order.id?'rotate-180':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      </div>
                    </div>
                    {expanded===order.id && (
                      <div className={`border-t border-inherit px-4 pb-4 ${dm?'bg-gray-800/50':''}`}>
                        <div className="mt-3 mb-3">
                          <p className={`text-xs font-semibold uppercase tracking-wide ${muted} mb-2`}>Order Items</p>
                          <div className="space-y-1">
                            {(order.items||[]).map((item:any,i:number)=>(
                              <div key={i} className={`flex justify-between text-sm py-1.5 border-b border-dashed ${dm?'border-gray-700':'border-gray-100'} last:border-0`}>
                                <span>{item.name} <span className={`text-xs ${muted}`}>({item.portion})</span> × {item.quantity}</span>
                                <span className="font-medium">฿{fmt(item.price*item.quantity)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Payment Section */}
                        {(order.payment_method === 'promptpay' || order.payment_method === 'card') && (
                          <div className={`${dm?'bg-gray-800':'bg-blue-50'} border ${dm?'border-gray-700':'border-blue-100'} rounded-xl p-3 mb-3`}>
                            <p className={`text-xs font-semibold uppercase tracking-wide ${dm?'text-blue-300':'text-blue-700'} mb-2`}>💳 Payment</p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className={muted}>Method:</span>
                                <span className="font-medium">{order.payment_method === 'promptpay' ? '🇹🇭 PromptPay' : '💳 Card'}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className={muted}>Status:</span>
                                <span className={order.payment_confirmed ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>
                                  {order.payment_confirmed ? '✓ Confirmed' : '⏳ Pending'}
                                </span>
                              </div>
                              {order.payment_slip_url && (
                                <div className="mt-2 pt-2 border-t border-inherit">
                                  <img
                                    src={order.payment_slip_url}
                                    alt="Payment slip"
                                    className="w-24 h-24 object-cover rounded-xl border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(order.payment_slip_url, '_blank')}
                                  />
                                  <a href={order.payment_slip_url} target="_blank" rel="noreferrer"
                                    className="text-xs text-blue-600 underline mt-1 block">
                                    View full slip ↗
                                  </a>
                                </div>
                              )}
                            </div>
                            {!order.payment_confirmed && (order.payment_method === 'promptpay' || order.payment_method === 'card') && (
                              <button onClick={() => confirmPayment(order.id, true)}
                                className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                                ✓ Confirm Payment
                              </button>
                            )}
                            {order.payment_confirmed && (
                              <button onClick={() => confirmPayment(order.id, false)}
                                className="w-full mt-2 border text-xs font-semibold py-2 rounded-lg transition-colors border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-600">
                                ↩ Undo
                              </button>
                            )}
                          </div>
                        )}

                        {order.notes && (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 mb-3 text-sm text-amber-800 flex gap-2">
                            <span>📝</span><span>{order.notes}</span>
                          </div>
                        )}
                        <div className="mb-3">
                          <div className="flex justify-between mb-1.5">
                            {STATUS_STEPS.map((s,i)=>(
                              <div key={s} className="flex flex-col items-center text-center flex-1">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 transition-all
                                  ${STATUS_STEPS.indexOf(order.status)>=i?'bg-green-500 text-white':'bg-gray-200 text-gray-400'}`}>
                                  {STATUS_STEPS.indexOf(order.status)>i?'✓':(i+1)}
                                </div>
                                <span className={`text-xs hidden sm:block ${STATUS_STEPS.indexOf(order.status)>=i?'text-green-600 font-medium':muted}`}>
                                  {s==='out_for_delivery'?'Delivery':STATUS_LABEL[s]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {STATUS_STEPS.map(s=>(
                            <button key={s} onClick={()=>updateStatus(order,s)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                                ${order.status===s?'bg-green-600 text-white border-green-600':'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600'}`}>
                              {STATUS_LABEL[s]}{(s==='preparing'||s==='out_for_delivery')?' 💬':''}
                            </button>
                          ))}
                          <button onClick={()=>window.open(`https://wa.me/${order.customer_phone?.replace(/\D/g,'').replace(/^0/,'66')}?text=${encodeURIComponent(`Hi ${order.customer_name}! 🥗 Homie Clean Food here.`)}`,'_blank')}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-green-200 text-green-600 hover:bg-green-50 transition-all ml-auto">
                            📱 WhatsApp
                          </button>
                        </div>
                        <p className={`text-xs ${muted} mt-1.5`}>💬 = sends WhatsApp notification automatically</p>
                      </div>
                    )}
                  </div>
                )})}
                {filteredOrders.length===0 && !loadingOrders && (
                  <div className={`text-center py-16 ${muted}`}>
                    <p className="text-4xl mb-2">📭</p>
                    <p>No orders found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ MENU ═════════════════════════════════════════════════════ */}
          {tab==='menu' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold">Menu / Meals</h2>
                  <p className={`text-sm ${muted}`}>{menuItems.length} items</p>
                </div>
                <button onClick={()=>{setIsNew(true);setEditItem({available:true,category:'chicken',meal_type:'high-protein'})}}
                  className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                  + Add Meal
                </button>
              </div>
              {editItem && (
                <div className={`${card} border rounded-2xl p-5 mb-5 shadow-sm`}>
                  <h3 className="font-bold mb-4">{isNew?'Add New Meal':'Edit Meal'}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Meal Name *</label>
                      <input value={editItem.name||''} onChange={e=>setEditItem({...editItem,name:e.target.value})} className={inputCls} placeholder="e.g. Paprika Chicken"/>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Category</label>
                      <select value={editItem.category||'chicken'} onChange={e=>setEditItem({...editItem,category:e.target.value})} className={inputCls}>
                        <option value="chicken">🍗 Chicken</option>
                        <option value="beef">🥩 Beef</option>
                        <option value="fish">🐟 Fish</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Meal Type</label>
                      <select value={editItem.meal_type||'high-protein'} onChange={e=>setEditItem({...editItem,meal_type:e.target.value})} className={inputCls}>
                        <option value="high-protein">💪 High Protein</option>
                        <option value="slim">✨ Slim</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Availability</label>
                      <select value={editItem.available?'yes':'no'} onChange={e=>setEditItem({...editItem,available:e.target.value==='yes'})} className={inputCls}>
                        <option value="yes">✅ Available</option>
                        <option value="no">❌ Hidden</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Lean Price (฿)</label>
                      <input type="number" value={editItem.lean_price||''} onChange={e=>setEditItem({...editItem,lean_price:parseInt(e.target.value)})} className={inputCls} placeholder="215"/>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Bulk Price (฿)</label>
                      <input type="number" value={editItem.bulk_price||''} onChange={e=>setEditItem({...editItem,bulk_price:parseInt(e.target.value)})} className={inputCls} placeholder="250"/>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Calories (Lean)</label>
                      <input type="number" value={editItem.calories_lean||''} onChange={e=>setEditItem({...editItem,calories_lean:parseInt(e.target.value)})} className={inputCls} placeholder="450"/>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Protein (g)</label>
                      <input type="number" value={editItem.protein_lean||''} onChange={e=>setEditItem({...editItem,protein_lean:parseInt(e.target.value)})} className={inputCls} placeholder="40"/>
                    </div>
                    <div className="col-span-2">
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Description</label>
                      <textarea value={editItem.description||''} onChange={e=>setEditItem({...editItem,description:e.target.value})} className={inputCls} rows={2} placeholder="Short description..."/>
                    </div>
                    <div className="col-span-2">
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Image URL</label>
                      <input value={editItem.image_url||''} onChange={e=>setEditItem({...editItem,image_url:e.target.value})} className={inputCls} placeholder="https://..."/>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 items-center">
                    <button onClick={saveMenuItem} disabled={menuSaving} className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                      {menuSaving?'Saving...':'Save Meal'}
                    </button>
                    <button onClick={()=>setEditItem(null)} className="border px-5 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                    {menuMsg && <span className="text-green-600 text-sm font-medium">{menuMsg}</span>}
                  </div>
                </div>
              )}
              {menuItems.length===0 && !editItem && (
                <div className={`text-center py-16 ${muted}`}>
                  <p className="text-4xl mb-2">🍱</p>
                  <p className="mb-1">No menu items yet in database</p>
                  <p className="text-xs">Add meals using the button above</p>
                </div>
              )}
              <div className="grid gap-3">
                {menuItems.map(item=>(
                  <div key={item.id} className={`${card} border rounded-2xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow`}>
                    {item.image_url
                      ? <img src={item.image_url} className="w-14 h-14 rounded-xl object-cover shrink-0" alt={item.name}/>
                      : <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-2xl shrink-0">
                          {item.category==='chicken'?'🍗':item.category==='beef'?'🥩':'🐟'}
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{item.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-lg ${item.meal_type==='slim'?'bg-amber-100 text-amber-600':'bg-green-100 text-green-600'}`}>
                          {item.meal_type==='slim'?'✨ Slim':'💪 High Protein'}
                        </span>
                        {!item.available && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-lg">Hidden</span>}
                      </div>
                      <p className={`text-xs ${muted} mt-0.5`}>{item.category} · Lean ฿{item.lean_price} / Bulk ฿{item.bulk_price}</p>
                      {item.calories_lean && <p className={`text-xs ${muted}`}>{item.calories_lean} kcal · {item.protein_lean}g protein</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={()=>{setIsNew(false);setEditItem(item)}} className="text-xs border px-3 py-1.5 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-green-300">Edit</button>
                      <button onClick={()=>deleteMenuItem(item.id)} className="text-xs border px-3 py-1.5 rounded-xl text-red-500 hover:bg-red-50 hover:border-red-300">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ CUSTOMERS ════════════════════════════════════════════════ */}
          {tab==='customers' && (
            <div>
              <div className="mb-5">
                <h2 className="text-xl font-bold">Customers</h2>
                <p className={`text-sm ${muted}`}>{customers.length} registered users</p>
              </div>
              <input placeholder="Search by name..."
                value={custSearch} onChange={e=>setCustSearch(e.target.value)}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm mb-4 outline-none focus:ring-2 focus:ring-green-400 ${dm?'bg-gray-800 border-gray-700':'border-gray-200'}`}/>

              {custLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/>
                </div>
              )}

              {!custLoading && customers.length === 0 && (
                <div className={`text-center py-16 ${muted}`}>
                  <p className="text-4xl mb-2">👥</p>
                  <p>No customers yet</p>
                </div>
              )}

              <div className="grid gap-3">
                {customers
                  .filter(c=>!custSearch ||
                    c.full_name?.toLowerCase().includes(custSearch.toLowerCase()))
                  .map(c=>{
                    const tier = c.tier || getTierFromPoints(c.points || 0)
                    const badge = TIER_BADGE[tier] || TIER_BADGE['Homie']
                    return (
                      <div key={c.id} className={`${card} border rounded-2xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow`}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold shrink-0">
                          {(c.full_name||'?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{c.full_name||'Unknown'}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                          </div>
                          <p className={`text-xs ${muted}`}>Joined {new Date(c.created_at).toLocaleDateString('en-GB')}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-green-600 text-sm">{c.points||0} pts</p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

                    {tab==='loyalty' && (
            <AdminLoyaltyTab darkMode={dm} />
          )}

          {/* ═══ REFERRAL SYSTEM ════════════════════════════════════════════ */}
          {tab==='referrals' && (
            <div>
              <div className="mb-5">
                <h2 className="text-xl font-bold">🎁 Referral System</h2>
                <p className={`text-sm ${muted}`}>Manage customer referrals and rewards</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className={`${card} border rounded-2xl p-5`}>
                  <p className={`text-sm ${muted} mb-1`}>Total Referrals</p>
                  <p className="text-3xl font-bold text-green-600">0</p>
                  <p className={`text-xs ${muted} mt-1`}>Pending activation</p>
                </div>
                <div className={`${card} border rounded-2xl p-5`}>
                  <p className={`text-sm ${muted} mb-1`}>Active Referrals</p>
                  <p className="text-3xl font-bold text-emerald-600">0</p>
                  <p className={`text-xs ${muted} mt-1`}>Successfully referred customers</p>
                </div>
                <div className={`${card} border rounded-2xl p-5`}>
                  <p className={`text-sm ${muted} mb-1`}>Total Rewards Given</p>
                  <p className="text-3xl font-bold text-orange-600">฿0</p>
                  <p className={`text-xs ${muted} mt-1`}>Referral bonuses</p>
                </div>
              </div>

              <div className={`${card} border rounded-2xl p-6`}>
                <h3 className="font-bold mb-4">📋 Referral Codes</h3>
                <div className={`${dm?'bg-gray-800':'bg-gray-50'} rounded-xl p-4 text-center`}>
                  <p className={`text-sm ${muted} mb-3`}>No active referral codes</p>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700">
                    ➕ Create Referral Code
                  </button>
                </div>
              </div>

              <div className={`${card} border rounded-2xl p-6 mt-4`}>
                <h3 className="font-bold mb-4">📊 Recent Referrals</h3>
                <div className={`text-center py-12 ${muted}`}>
                  <p className="text-4xl mb-2">🎯</p>
                  <p>No referrals yet</p>
                  <p className="text-xs mt-2">Referrals will appear here once customers start using your referral codes</p>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ANALYTICS ════════════════════════════════════════════════ */}
          {tab==='analytics' && (
            <div>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold">Analytics</h2>
                  <p className={`text-sm ${muted}`}>Business performance overview</p>
                </div>
                <div className="flex gap-2">
                  <select value={period} onChange={e=>setPeriod(e.target.value)}
                    className={`border rounded-xl px-3 py-2 text-sm outline-none ${dm?'bg-gray-800 border-gray-700':'border-gray-200'}`}>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">All time</option>
                  </select>
                  <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700">
                    ⬇️ Export CSV
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <StatCard icon="💰" label="Total Revenue" value={`฿${fmt(totalRev)}`} color="green"/>
                <StatCard icon="📦" label="Total Orders" value={filteredByPeriod.length} color="blue"/>
                <StatCard icon="📈" label="Avg Order" value={`฿${fmt(Math.round(avgOrder))}`} color="orange"/>
                <StatCard icon="👥" label="Customers" value={customers.length} color="purple"/>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className={`${card} border rounded-2xl p-4`}>
                  <h3 className="font-bold mb-4 text-sm">🏆 Best Selling Items</h3>
                  {topItemsSorted.length===0
                    ? <p className={`text-sm ${muted} text-center py-4`}>No data yet</p>
                    : topItemsSorted.map(([name,count],i)=>(
                        <div key={name} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex gap-2"><span className={muted}>{i+1}.</span>{name}</span>
                            <span className="font-semibold">{count} sold</span>
                          </div>
                          <div className={`h-2 ${dm?'bg-gray-700':'bg-gray-100'} rounded-full overflow-hidden`}>
                            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                              style={{width:`${(count/(topItemsSorted[0]?.[1]||1))*100}%`}}/>
                          </div>
                        </div>
                      ))
                  }
                </div>
                <div className={`${card} border rounded-2xl p-4`}>
                  <h3 className="font-bold mb-4 text-sm">📅 Revenue by Day</h3>
                  {Object.keys(revenueByDay).length===0
                    ? <p className={`text-sm ${muted} text-center py-4`}>No data yet</p>
                    : Object.entries(revenueByDay).slice(-7).map(([date,rev])=>(
                        <div key={date} className="flex items-center gap-3 mb-2">
                          <span className={`text-xs ${muted} w-14 shrink-0`}>{date}</span>
                          <div className="flex-1 relative h-6">
                            <div className={`absolute inset-0 ${dm?'bg-gray-800':'bg-gray-100'} rounded-lg`}/>
                            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-600 to-emerald-500 rounded-lg flex items-center pl-2 transition-all"
                              style={{width:`${Math.max(8,(rev/Math.max(...Object.values(revenueByDay)))*100)}%`}}>
                              <span className="text-white text-xs font-medium whitespace-nowrap">฿{fmt(rev)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                  }
                </div>
                <div className={`${card} border rounded-2xl p-4`}>
                  <h3 className="font-bold mb-4 text-sm">📊 Orders by Status</h3>
                  {STATUS_STEPS.map(s=>{
                    const count = filteredByPeriod.filter(o=>o.status===s).length
                    const pct = filteredByPeriod.length ? (count/filteredByPeriod.length)*100 : 0
                    return (
                      <div key={s} className="flex items-center gap-3 mb-2">
                        <span className={`text-xs ${muted} w-24 shrink-0`}>{STATUS_LABEL[s]}</span>
                        <div className={`flex-1 h-5 ${dm?'bg-gray-700':'bg-gray-100'} rounded-lg overflow-hidden`}>
                          <div className={`h-full ${STATUS_DOT[s]} rounded-lg transition-all`} style={{width:`${Math.max(pct>0?4:0,pct)}%`}}/>
                        </div>
                        <span className="text-xs font-medium w-6 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
                <div className={`${card} border rounded-2xl p-4`}>
                  <h3 className="font-bold mb-4 text-sm">💳 Payment Methods</h3>
                  {(() => {
                    const pm: Record<string,number> = {}
                    filteredByPeriod.forEach(o=>{ pm[o.payment_method||'unknown']=(pm[o.payment_method||'unknown']||0)+1 })
                    return Object.entries(pm).sort((a,b)=>b[1]-a[1]).map(([method,count])=>(
                      <div key={method} className="flex justify-between items-center mb-2">
                        <span className="text-sm">{method==='promptpay'?'📱 PromptPay':method==='cash'?'💵 Cash':method==='cod'?'💵 Cash on Delivery':method==='transfer'?'🏦 Transfer':'💳 '+method}</span>
                        <span className="font-semibold text-sm">{count}</span>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ═══ SETTINGS ══════════════════════════════════════════════════ */}
          {tab==='settings' && (
            <div>
              <div className="mb-5">
                <h2 className="text-xl font-bold">Settings</h2>
                <p className={`text-sm ${muted}`}>Admin configuration</p>
              </div>
              <div className="space-y-4 max-w-lg">
                <div className={`${card} border rounded-2xl p-4`}>
                  <h3 className="font-semibold text-sm mb-3">Appearance</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Dark Mode</p>
                      <p className={`text-xs ${muted}`}>For late-night order checking</p>
                    </div>
                    <button onClick={()=>setDarkMode(!dm)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${dm?'bg-green-500':'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${dm?'left-5':'left-0.5'}`}/>
                    </button>
                  </div>
                </div>
                <div className={`${card} border rounded-2xl p-4`}>
                  <h3 className="font-semibold text-sm mb-3">Role / Access</h3>
                  <div className="flex gap-2">
                    {(['admin','kitchen'] as const).map(r=>(
                      <button key={r} onClick={()=>setRole(r)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${role===r?'bg-green-600 text-white border-green-600':'border-gray-200 text-gray-600 hover:border-green-300'}`}>
                        {r==='admin'?'👑 Admin (full access)':'👨‍🍳 Kitchen (orders only)'}
                      </button>
                    ))}
                  </div>
                  <p className={`text-xs ${muted} mt-2`}>Kitchen mode only shows orders tab</p>
                </div>
                <div className={`${card} border rounded-2xl p-4`}>
                  <h3 className="font-semibold text-sm mb-1">Business Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className={muted}>Name</span><span>Homie Clean Food</span></div>
                    <div className="flex justify-between"><span className={muted}>Phone</span><span>+66 95 950 5111</span></div>
                    <div className="flex justify-between"><span className={muted}>Hours</span><span>08:00–17:00 Daily</span></div>
                    <div className="flex justify-between"><span className={muted}>Location</span><span>Huai Kwang, Bangkok</span></div>
                  </div>
                </div>
                <div className={`${card} border rounded-2xl p-4`}>
                  <h3 className="font-semibold text-sm mb-3">Auto-refresh</h3>
                  <p className={`text-xs ${muted}`}>Orders auto-refresh every 30 seconds when admin panel is open.</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
                    <span className="text-xs text-green-600 font-medium">Active</span>
                  </div>
                </div>

                {/* PromptPay / Bank Settings */}
                <div className={`${card} border-2 border-green-200 rounded-2xl p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🇹🇭</span>
                    <h3 className="font-semibold text-sm">PromptPay / Bank Account</h3>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    {ppQrUrl && (
                      <div className="text-center">
                        <img src={ppQrUrl} alt="PromptPay QR" className="w-40 h-40 mx-auto rounded-xl border border-gray-200 mb-2" />
                        <p className={`text-xs ${muted}`}>QR preview (no amount — for display)</p>
                      </div>
                    )}
                    <div className="w-full space-y-2">
                      <label className={`text-xs font-medium ${muted}`}>PromptPay Phone / National ID</label>
                      <input
                        type="text"
                        value={ppPhone}
                        onChange={e => { setPpPhone(e.target.value); setPpSaved(false) }}
                        placeholder="e.g. 0959505111"
                        className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 ${dm ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                      />
                      <p className={`text-xs ${muted}`}>Customers will scan a QR with the exact order amount at checkout.</p>
                      <button
                        onClick={async () => {
                          setPpSaving(true)
                          await supabase.from('loyalty_config').update({ promptpay_number: ppPhone } as any).eq('id','singleton')
                          setPpSaving(false)
                          setPpSaved(true)
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                      >
                        {ppSaving ? 'Saving...' : ppSaved ? '✓ Saved!' : 'Save PromptPay Number'}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

