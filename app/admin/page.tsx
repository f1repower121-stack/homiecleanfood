'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import NotificationBell from '@/components/admin/NotificationBell'

const ADMIN_PASSWORD = 'homie2024'

// ─── Types ───────────────────────────────────────────────────────────────────
type Order = {
  id: string; customer_name: string; customer_phone: string
  delivery_address: string; items: any[]; total: number
  status: string; payment_method: string; notes: string; created_at: string
}
type MenuItem = {
  id: string; name: string; category: string; lean_price: number
  bulk_price: number; description: string; image_url: string
  calories_lean: number; protein_lean: number; carb_lean: number
  fat_lean: number; available: boolean
}
type Customer = {
  id: string; full_name: string; email: string; phone: string
  points: number; tier: string; total_spent: number; created_at: string
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
  homie:{label:'🥗 Homie',cls:'bg-gray-100 text-gray-600'},
  clean_eater:{label:'⭐ Clean Eater',cls:'bg-blue-100 text-blue-700'},
  protein_king:{label:'👑 Protein King',cls:'bg-amber-100 text-amber-700'},
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
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [role, setRole] = useState<'admin'|'kitchen'>('admin')

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

  // Analytics
  const [period, setPeriod] = useState('7')

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true)
    const { data } = await supabase.from('orders').select('*').order('created_at',{ascending:false})
    setOrders(data||[])
    setLoadingOrders(false)
  }, [])

  const fetchMenu = useCallback(async () => {
    try {
      const { data } = await supabase.from('menu_items').select('*').order('name')
      setMenuItems(data||[])
    } catch { setMenuItems([]) }
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      const { data } = await supabase.from('wix_customers').select('*').order('total_spent',{ascending:false})
      setCustomers(data||[])
    } catch { setCustomers([]) }
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchOrders(); fetchMenu(); fetchCustomers()
    const t = setInterval(fetchOrders, 30000)
    return () => clearInterval(t)
  }, [authed, fetchOrders, fetchMenu, fetchCustomers])

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
    .filter(o => !searchQuery ||
      o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_phone?.includes(searchQuery))

  // ─── Login Screen ─────────────────────────────────────────────────────────
  if (!authed) return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2e0f] via-[#2d5016] to-[#1a2e0f] flex items-center justify-center p-4">
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
  const navItems = [
    {key:'orders', icon:'📦', label:'Orders', badge:pendingCount},
    ...(role==='admin' ? [
      {key:'menu', icon:'🍱', label:'Menu / Meals'},
      {key:'customers', icon:'👥', label:'Customers'},
      {key:'loyalty', icon:'⭐', label:'Loyalty Points'},
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

  return (
    <div className={`min-h-screen ${bg} ${text} flex`}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`${sidebarBg} border-r flex flex-col transition-all duration-300 ${sidebarOpen?'w-56':'w-16'} shrink-0 sticky top-0 h-screen overflow-hidden z-20`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-inherit">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-700 rounded-lg flex items-center justify-center shrink-0 text-sm">🥗</div>
          {sidebarOpen && <span className="font-bold text-sm text-green-700 truncate">Homie Admin</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(item=>(
            <button key={item.key} onClick={()=>setTab(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all relative
                ${tab===item.key
                  ? 'bg-green-50 text-green-700 border-r-2 border-green-600'
                  : `${muted} hover:bg-gray-50 hover:${text}`}`}>
              <span className="text-base shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {item.badge ? <span className={`${sidebarOpen?'ml-auto':'absolute top-1.5 right-1.5'} bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold`}>{item.badge}</span> : null}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className={`border-t border-inherit p-3 space-y-1`}>
          <button onClick={()=>setDarkMode(!dm)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${muted} hover:bg-gray-100 transition-all`}>
            <span>{dm?'☀️':'🌙'}</span>
            {sidebarOpen && <span>{dm?'Light Mode':'Dark Mode'}</span>}
          </button>
          <button onClick={()=>setAuthed(false)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all`}>
            <span>🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Header */}
        <header className={`${card} border-b sticky top-0 z-10 flex items-center gap-3 px-4 py-3`}>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} className={`${muted} hover:${text} p-1.5 rounded-lg hover:bg-gray-100`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>

          {/* Search */}
          <div className="flex-1 max-w-sm relative">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${muted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input placeholder="Search orders, customers..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-green-400 ${dm?'bg-gray-800 border-gray-700 text-gray-100':'bg-gray-50 border-gray-200'}`}/>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Today stats pill */}
            <div className={`hidden sm:flex items-center gap-2 text-xs ${muted} ${dm?'bg-gray-800':'bg-gray-100'} rounded-xl px-3 py-1.5`}>
              <span className="text-green-600 font-semibold">Today</span>
              <span>{todayOrders.length} orders</span>
              <span>·</span>
              <span className="font-semibold text-green-600">฿{fmt(todayRev)}</span>
            </div>

            <NotificationBell onSelectOrder={()=>{setTab('orders');setNotifOpen(false)}} darkMode={dm} />

            {/* Avatar */}
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {role==='admin'?'A':'K'}
            </div>
          </div>
        </header>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">

          {/* ═══ ORDERS ═══════════════════════════════════════════════════ */}
          {tab==='orders' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold">Orders</h2>
                  <p className={`text-sm ${muted}`}>{filteredOrders.length} orders{orderFilter!=='all'?` · ${orderFilter}`:''}</p>
                </div>
                <button onClick={fetchOrders} className="text-sm border rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                  <span>↻</span> Refresh
                </button>
              </div>

              {/* Status filters */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
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
                {filteredOrders.map(order=>(
                  <div key={order.id} className={`${card} border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
                    <div className="p-4 cursor-pointer select-none" onClick={()=>setExpanded(expanded===order.id?null:order.id)}>
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-lg shrink-0`}>
                          {order.status==='delivered'?'✅':order.status==='out_for_delivery'?'🚚':order.status==='preparing'?'👨‍🍳':'📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{order.customer_name||'Guest'}</span>
                            <Badge s={order.status}/>
                          </div>
                          <p className={`text-xs ${muted} mt-0.5`}>{order.customer_phone} · {fmtDate(order.created_at)}</p>
                          <p className={`text-xs ${muted} truncate`}>{order.delivery_address}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-green-600">฿{fmt(order.total)}</p>
                          <p className={`text-xs ${muted}`}>{order.payment_method}</p>
                        </div>
                        <svg className={`w-4 h-4 ${muted} shrink-0 transition-transform mt-1 ${expanded===order.id?'rotate-180':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      </div>
                    </div>

                    {expanded===order.id && (
                      <div className={`border-t border-inherit px-4 pb-4 ${dm?'bg-gray-800/50':''}`}>
                        {/* Items list */}
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

                        {order.notes && (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 mb-3 text-sm text-amber-800 flex gap-2">
                            <span>📝</span><span>{order.notes}</span>
                          </div>
                        )}

                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="flex justify-between mb-1.5">
                            {STATUS_STEPS.map((s,i)=>(
                              <div key={s} className={`flex flex-col items-center text-center flex-1`}>
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

                        {/* Action buttons */}
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
                ))}
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
                <button onClick={()=>{setIsNew(true);setEditItem({available:true,category:'chicken'})}}
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
                      <input value={editItem.name||''} onChange={e=>setEditItem({...editItem,name:e.target.value})}
                        className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 ${dm?'bg-gray-800 border-gray-700':'border-gray-200'}`}
                        placeholder="e.g. Paprika Chicken"/>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Category</label>
                      <select value={editItem.category||'chicken'} onChange={e=>setEditItem({...editItem,category:e.target.value})}
                        className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none ${dm?'bg-gray-800 border-gray-700':'border-gray-200'}`}>
                        <option value="chicken">🍗 Chicken</option>
                        <option value="beef">🥩 Beef</option>
                        <option value="fish">🐟 Fish</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Availability</label>
                      <select value={editItem.available?'yes':'no'} onChange={e=>setEditItem({...editItem,available:e.target.value==='yes'})}
                        className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none ${dm?'bg-gray-800 border-gray-700':'border-gray-200'}`}>
                        <option value="yes">✅ Available</option>
                        <option value="no">❌ Hidden</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Lean Price (฿)</label>
                      <input type="number" value={editItem.lean_price||''} onChange={e=>setEditItem({...editItem,lean_price:parseInt(e.target.value)})}
                        className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 ${dm?'bg-gray-800 border-gray-700':'border-gray-200'}`}
                        placeholder="215"/>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Bulk Price (฿)</label>
                      <input type="number" value={editItem.bulk_price||''} onChange={e=>setEditItem({...editItem,bulk_price:parseInt(e.target.value)})}
                        className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 ${dm?'bg-gray-800 border-gray-700':'border-gray-200'}`}
                        placeholder="250"/>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Calories (Lean)</label>
                      <input type="number" value={editItem.calories_lean||''} onChange={e=>setEditItem({...editItem,calories_lean:parseInt(e.target.value)})}
                        className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 ${dm?'bg-gray-800 border-gray-700':'border-gray-200'}`}
                        placeholder="450"/>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Protein (g)</label>
                      <input type="number" value={editItem.protein_lean||''} onChange={e=>setEditItem({...editItem,protein_lean:parseInt(e.target.value)})}
                        className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 ${dm?'bg-gray-800 border-gray-700':'border-gray-200'}`}
                        placeholder="40"/>
                    </div>
                    <div className="col-span-2">
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Description</label>
                      <textarea value={editItem.description||''} onChange={e=>setEditItem({...editItem,description:e.target.value})}
                        className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 ${dm?'bg-gray-800 border-gray-700':'border-gray-200'}`}
                        rows={2} placeholder="Short description..."/>
                    </div>
                    <div className="col-span-2">
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Image URL</label>
                      <input value={editItem.image_url||''} onChange={e=>setEditItem({...editItem,image_url:e.target.value})}
                        className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 ${dm?'bg-gray-800 border-gray-700':'border-gray-200'}`}
                        placeholder="https://..."/>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 items-center">
                    <button onClick={saveMenuItem} disabled={menuSaving}
                      className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                      {menuSaving?'Saving...':'Save Meal'}
                    </button>
                    <button onClick={()=>setEditItem(null)} className="border px-5 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                      Cancel
                    </button>
                    {menuMsg && <span className="text-green-600 text-sm font-medium">{menuMsg}</span>}
                  </div>
                </div>
              )}

              {menuItems.length===0 && !editItem && (
                <div className={`text-center py-16 ${muted}`}>
                  <p className="text-4xl mb-2">🍱</p>
                  <p className="mb-1">No menu items yet</p>
                  <p className="text-xs">Run the SQL in Supabase first, then add your meals</p>
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
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{item.name}</span>
                        {!item.available && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-lg">Hidden</span>}
                      </div>
                      <p className={`text-xs ${muted} mt-0.5`}>{item.category} · Lean ฿{item.lean_price} / Bulk ฿{item.bulk_price}</p>
                      {item.calories_lean && <p className={`text-xs ${muted}`}>{item.calories_lean} kcal · {item.protein_lean}g protein</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={()=>{setIsNew(false);setEditItem(item)}}
                        className="text-xs border px-3 py-1.5 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-green-300">Edit</button>
                      <button onClick={()=>deleteMenuItem(item.id)}
                        className="text-xs border px-3 py-1.5 rounded-xl text-red-500 hover:bg-red-50 hover:border-red-300">Delete</button>
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
                <p className={`text-sm ${muted}`}>{customers.length} registered customers</p>
              </div>
              <input placeholder="Search by name, email or phone..."
                value={custSearch} onChange={e=>setCustSearch(e.target.value)}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm mb-4 outline-none focus:ring-2 focus:ring-green-400 ${dm?'bg-gray-800 border-gray-700':'border-gray-200'}`}/>
              <div className="grid gap-3">
                {customers
                  .filter(c=>!custSearch||
                    c.full_name?.toLowerCase().includes(custSearch.toLowerCase())||
                    c.email?.toLowerCase().includes(custSearch.toLowerCase())||
                    c.phone?.includes(custSearch))
                  .map(c=>(
                    <div key={c.id} className={`${card} border rounded-2xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow`}>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold shrink-0">
                        {(c.full_name||'G')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{c.full_name||'Unknown'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${(TIER_BADGE[c.tier]||TIER_BADGE.homie).cls}`}>
                            {(TIER_BADGE[c.tier]||TIER_BADGE.homie).label}
                          </span>
                        </div>
                        <p className={`text-xs ${muted}`}>{c.email}</p>
                        <p className={`text-xs ${muted}`}>{c.phone}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-green-600 text-sm">฿{fmt(c.total_spent||0)}</p>
                        <p className={`text-xs ${muted}`}>{c.points||0} pts</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ═══ LOYALTY ══════════════════════════════════════════════════ */}
          {tab==='loyalty' && (
            <div>
              <div className="mb-5">
                <h2 className="text-xl font-bold">Loyalty Points</h2>
                <p className={`text-sm ${muted}`}>Overview of tier distribution</p>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {(['homie','clean_eater','protein_king'] as const).map(tier=>{
                  const count = customers.filter(c=>c.tier===tier).length
                  const b = TIER_BADGE[tier]
                  return (
                    <div key={tier} className={`${card} border rounded-2xl p-4 text-center`}>
                      <p className="text-2xl mb-1">{tier==='protein_king'?'👑':tier==='clean_eater'?'⭐':'🥗'}</p>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className={`text-xs ${muted}`}>{b.label.replace(/^[^ ]+ /,'')}</p>
                    </div>
                  )
                })}
              </div>
              <div className={`${card} border rounded-2xl p-4 mb-4`}>
                <h3 className="font-semibold mb-3 text-sm">Tier Requirements</h3>
                <div className="space-y-3">
                  {[
                    {tier:'🥗 Homie',pts:'0+ pts',perks:'1pt per ฿10, birthday +50pts'},
                    {tier:'⭐ Clean Eater',pts:'200+ pts',perks:'1.5× multiplier, free delivery ฿500+'},
                    {tier:'👑 Protein King',pts:'500+ pts',perks:'2× multiplier, free meal every 10 orders'},
                  ].map(t=>(
                    <div key={t.tier} className={`flex items-start gap-3 p-3 rounded-xl ${dm?'bg-gray-800':'bg-gray-50'}`}>
                      <span className="text-lg">{t.tier.split(' ')[0]}</span>
                      <div>
                        <p className="text-sm font-semibold">{t.tier.slice(2)}</p>
                        <p className={`text-xs ${muted}`}>{t.pts} · {t.perks}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`${card} border rounded-2xl overflow-hidden`}>
                <div className={`px-4 py-3 border-b border-inherit flex items-center justify-between`}>
                  <p className="font-semibold text-sm">Top Point Holders</p>
                </div>
                {customers.sort((a,b)=>(b.points||0)-(a.points||0)).slice(0,10).map((c,i)=>(
                  <div key={c.id} className={`px-4 py-3 border-b border-inherit last:border-0 flex items-center gap-3`}>
                    <span className={`text-sm font-bold w-5 ${muted}`}>{i+1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{c.full_name||'Unknown'}</p>
                      <p className={`text-xs ${muted}`}>{c.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600 text-sm">{c.points||0} pts</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${(TIER_BADGE[c.tier]||TIER_BADGE.homie).cls}`}>
                        {(TIER_BADGE[c.tier]||TIER_BADGE.homie).label}
                      </span>
                    </div>
                  </div>
                ))}
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
                {/* Top items */}
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

                {/* Revenue by day */}
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

                {/* Order status breakdown */}
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
                        <span className={`text-xs font-medium w-6 text-right`}>{count}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Payment methods */}
                <div className={`${card} border rounded-2xl p-4`}>
                  <h3 className="font-bold mb-4 text-sm">💳 Payment Methods</h3>
                  {(() => {
                    const pm: Record<string,number> = {}
                    filteredByPeriod.forEach(o=>{ pm[o.payment_method||'unknown']=(pm[o.payment_method||'unknown']||0)+1 })
                    return Object.entries(pm).sort((a,b)=>b[1]-a[1]).map(([method,count])=>(
                      <div key={method} className="flex justify-between items-center mb-2">
                        <span className="text-sm">{method==='promptpay'?'📱 PromptPay':method==='cash'?'💵 Cash':method==='transfer'?'🏦 Transfer':'💳 '+method}</span>
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
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
