'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import AdminLoyaltyTab from '@/components/admin/LoyaltyTab'
import NotificationBell from '@/components/admin/NotificationBell'
import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'
import { requestNotificationPermission, sendOrderNotification, subscribeToPushNotifications, unsubscribeFromPushNotifications } from '@/lib/pushNotifications'
import { LayoutDashboard, Package, UtensilsCrossed, Users, Star, Gift, BarChart3, Settings, Sun, Moon, LogOut, Menu, RefreshCw, ChevronDown, DollarSign, TrendingUp, CheckCircle, Truck, ChefHat, MoreHorizontal, X, Search, ChevronUp, FileDown, Upload, Copy, ImageIcon } from 'lucide-react'

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
  id: string; full_name: string; email: string; phone: string; address?: string
  points: number; tier: string; created_at: string; total_spent?: number
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
import { formatDateTimeICT, formatDateICT, formatDateThaiICT, formatDateShortICT, daysAgoICT, getTodayICT, toDateStringICT } from '@/lib/dateUtils'
const fmt = (n:number) => n?.toLocaleString('th-TH') ?? '0'
const fmtDate = (s:string) => formatDateTimeICT(s)

// ─── Mini Components ──────────────────────────────────────────────────────────
function Badge({s}:{s:string}) {
  const cls = STATUS_COLOR[s] || 'bg-gray-100 text-gray-600 border-gray-200'
  return <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s]||'bg-gray-400'}`}/>
    {STATUS_LABEL[s]||s}
  </span>
}

function StatCard({icon,label,value,sub,color='slate',darkMode}:{icon:React.ReactNode,label:string,value:string|number,sub?:string,color?:string,darkMode?:boolean}) {
  const accents:Record<string,string> = {
    slate:'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    blue:'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    emerald:'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
    amber:'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
  }
  const dm = darkMode ?? false
  return (
    <div className={`rounded-lg p-5 border transition-colors
      ${dm ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200/80'}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${accents[color]||accents.slate}`}>
        {icon}
      </div>
      <p className={`text-2xl font-semibold tracking-tight tabular-nums ${dm?'text-white':'text-slate-900'}`}>{value}</p>
      <p className={`text-sm mt-0.5 ${dm?'text-slate-400':'text-slate-500'}`}>{label}</p>
      {sub && <p className={`text-xs mt-1.5 ${dm?'text-slate-500':'text-slate-400'}`}>{sub}</p>}
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
  const [tab, setTab] = useState('dashboard')
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
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<'all'|'promptpay'|'cod'|'card'>('all')
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [orderDetailPanel, setOrderDetailPanel] = useState<Order|null>(null)
  const [bulkStatusSaving, setBulkStatusSaving] = useState(false)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [loadingOrders, setLoadingOrders] = useState(false)

  // Menu state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [editItem, setEditItem] = useState<Partial<MenuItem>|null>(null)
  const [isNew, setIsNew] = useState(false)
  const [menuImageUploading, setMenuImageUploading] = useState(false)
  const [menuItemIds, setMenuItemIds] = useState<Set<string>>(new Set())  // Bulk select for menu
  const [menuSaving, setMenuSaving] = useState(false)
  const [menuMsg, setMenuMsg] = useState('')

  // Customers
  const [customers, setCustomers] = useState<Customer[]>([])
  const [custSearch, setCustSearch] = useState('')
  const [custSortBy, setCustSortBy] = useState<'name'|'points'|'joined'>('joined')
  const [custSortDir, setCustSortDir] = useState<'asc'|'desc'>('desc')
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set())
  const [customerEditModal, setCustomerEditModal] = useState<Customer|null>(null)
  const [custLoading, setCustLoading] = useState(false)
  const [custError, setCustError] = useState<string | null>(null)

  // Loyalty management
  const [loyaltySearch, setLoyaltySearch] = useState('')
  const [editingPoints, setEditingPoints] = useState<string|null>(null)
  const [pointsInput, setPointsInput] = useState('')
  const [pointsMode, setPointsMode] = useState<'add'|'set'>('add')
  const [editingName, setEditingName] = useState<string|null>(null)
  const [nameInput, setNameInput] = useState('')
  const [editingPhone, setEditingPhone] = useState<string|null>(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [addressInput, setAddressInput] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string|null>(null)
  const [pointsMsg, setPointsMsg] = useState('')
  const [pointsSaving, setPointsSaving] = useState(false)

  // Analytics
  const [period, setPeriod] = useState('7')

  // Referrals
  const [referrals, setReferrals] = useState<any[]>([])
  const [referralCodes, setReferralCodes] = useState<any[]>([])
  const [referralStatusFilter, setReferralStatusFilter] = useState<'all'|'completed'|'pending'>('all')
  const [referralsLoading, setReferralsLoading] = useState(false)
  const [referralsStats, setReferralsStats] = useState({ total: 0, completed: 0, pending: 0 })

  // Push Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [lastOrderId, setLastOrderId] = useState('')
  const [keepSessionAlive, setKeepSessionAlive] = useState(true)

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true)
    try {
      // Use API to bypass RLS and get ALL orders
      const res = await fetch('/api/admin/orders')
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('❌ Error fetching orders:', err)
        setOrders([])
        setLoadingOrders(false)
        return
      }
      const { orders: data } = await res.json()

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
            // Build item list with size (Bulk/Lean)
            const itemNames = (latestOrder.items || [])
              .slice(0, 2)
              .map((i: any) => {
                const size = i.size === 'bulk' ? 'Bulk' : i.size === 'lean' ? 'Lean' : ''
                return `${i.name} ${size}`.trim()
              })
              .join(', ')
            const itemsSuffix = (latestOrder.items || []).length > 2 ? '...' : ''

            // Get delivery time and address from order
            const deliveryTime = latestOrder.delivery_time || 'ASAP'
            const customerName = latestOrder.customer_name || 'Customer'
            const deliveryAddr = latestOrder.delivery_address ? latestOrder.delivery_address.substring(0, 30) : 'Location TBD'

            const response = await fetch('/api/send-push-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: `🚀 DELIVER AT ${deliveryTime} | ${customerName}`,
                body: `${itemNames}${itemsSuffix}\n📍 ${deliveryAddr}\n💰 ฿${latestOrder.total || 0}`,
                data: {
                  orderId: latestOrder.id,
                  referenceId: latestOrder.reference_id,
                  deliveryTime: deliveryTime,
                  deliveryAddress: latestOrder.delivery_address,
                  customerName: customerName,
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
    setCustError(null)
    try {
      // Use API endpoint to bypass RLS and get ALL customers
      const response = await fetch('/api/admin/customers')

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const msg = error?.error || `API error ${response.status}`
        console.error('❌ Error fetching customers from API:', error)
        setCustError(msg)
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
      const msg = e instanceof Error ? e.message : 'Failed to load customers'
      console.error('❌ Unexpected error in fetchCustomers:', e)
      setCustError(msg)
      setCustomers([])
    }
    setCustLoading(false)
  }, [])

  const fetchReferrals = useCallback(async () => {
    setReferralsLoading(true)
    try {
      const res = await fetch('/api/admin/referrals')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setReferrals(data.referrals || [])
      setReferralCodes(data.referralCodes || [])
      setReferralsStats({
        total: data.totalReferrals ?? 0,
        completed: data.completedCount ?? 0,
        pending: data.pendingCount ?? 0,
      })
    } catch (e) {
      console.error('Failed to fetch referrals:', e)
      setReferrals([])
      setReferralCodes([])
    }
    setReferralsLoading(false)
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
    fetchOrders(); fetchMenu(); fetchCustomers(); fetchReferrals()
    // Poll every 10 seconds for new orders (faster notification delivery)
    const t = setInterval(fetchOrders, 10000)
    return () => clearInterval(t)
  }, [authed, fetchOrders, fetchMenu, fetchCustomers, fetchReferrals])

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

  const updateOrder = async (orderId: string, updates: { status?: string; payment_confirmed?: boolean }) => {
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, ...updates }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
    const { order } = await res.json()
    if (order) setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...order } : o))
  }

  const updateStatus = async (order: Order, newStatus: string) => {
    try {
      await updateOrder(order.id, { status: newStatus })
    if (newStatus==='preparing'||newStatus==='out_for_delivery') {
      const phone = order.customer_phone?.replace(/\D/g,'').replace(/^0/,'66')
      const msg = newStatus==='preparing'
        ? `Hi ${order.customer_name}! 👨‍🍳 Your Homie Clean Food order is being prepared. We'll notify you when it's on its way!`
        : `Hi ${order.customer_name}! 🚚 Your order is out for delivery! Should arrive soon. 🥗`
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank')
    }
    } catch (e) {
      console.error('Update status failed:', e)
    }
  }

  const confirmPayment = async (orderId: string, confirmed: boolean, alsoConfirmOrder = false) => {
    try {
      await updateOrder(orderId, {
        payment_confirmed: confirmed,
        ...(alsoConfirmOrder ? { status: 'confirmed' } : {}),
      })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_confirmed: confirmed, ...(alsoConfirmOrder ? { status: 'confirmed' } : {}) } : o))
    } catch (e) {
      console.error('Confirm payment failed:', e)
    }
  }

  const bulkUpdateOrderStatus = async (newStatus: string) => {
    if (selectedOrderIds.size === 0) return
    setBulkStatusSaving(true)
    try {
      for (const id of Array.from(selectedOrderIds)) {
        await updateOrder(id, { status: newStatus })
      }
      setSelectedOrderIds(new Set())
      fetchOrders()
    } finally {
      setBulkStatusSaving(false)
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

  const duplicateMenuItem = async (item: MenuItem) => {
    const { id, ...rest } = item
    const copy = { ...rest, name: `${item.name} (Copy)` }
    const { data, error } = await supabase.from('menu_items').insert([copy]).select().single()
    if (!error && data) {
      setEditItem(data)
      setIsNew(false)
      fetchMenu()
    }
  }

  const uploadMenuImage = async (file: File) => {
    if (!file?.type?.startsWith('image/')) return
    setMenuImageUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (editItem?.id) fd.append('menuItemId', editItem.id)
      const res = await fetch('/api/admin/upload-menu-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (data?.url) {
        setEditItem(prev => prev ? { ...prev, image_url: data.url } : null)
        setMenuMsg('Image uploaded ✅')
        setTimeout(() => setMenuMsg(''), 2000)
      } else throw new Error(data?.error || 'Upload failed')
    } catch (e) {
      setMenuMsg('❌ ' + (e instanceof Error ? e.message : 'Upload failed'))
      setTimeout(() => setMenuMsg(''), 4000)
    }
    setMenuImageUploading(false)
  }

  const bulkToggleMenuAvailability = async (available: boolean) => {
    if (menuItemIds.size === 0) return
    for (const id of Array.from(menuItemIds)) {
      await supabase.from('menu_items').update({ available }).eq('id', id)
    }
    setMenuItemIds(new Set())
    fetchMenu()
    setMenuMsg(`${menuItemIds.size} items ${available ? 'enabled' : 'hidden'} ✅`)
    setTimeout(() => setMenuMsg(''), 3000)
  }

  // ✅ NEW: manually adjust points for a user
  const savePoints = async (customerId: string) => {
    const delta = parseInt(pointsInput)
    if (isNaN(delta)) return
    setPointsSaving(true)
    try {
      const res = await fetch('/api/admin/add-points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: customerId, points_to_add: delta }) })
      if (!res.ok) throw new Error((await res.json()).error)
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
      const res = await fetch('/api/admin/add-points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: customerId, points_to_add: delta }) })
      if (!res.ok) throw new Error((await res.json()).error)
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

  const applyPoints = (customerId: string) => {
    if (pointsMode === 'set') {
      const val = parseInt(pointsInput)
      if (!isNaN(val)) setAbsolutePoints(customerId, Math.max(0, val))
    } else {
      savePoints(customerId)
    }
  }

  const exportCustomersCSV = (selectedOnly = false) => {
    const toExport = selectedOnly && selectedCustomerIds.size > 0
      ? customers.filter(c => selectedCustomerIds.has(c.id))
      : customers
    const cols = ['Name','Email','Phone','Address','Points','Tier','Total Spent','Join Date']
    const rows = toExport.map(c => [
      c.full_name || '',
      c.email || '',
      c.phone || '',
      c.address || '',
      String(c.points ?? 0),
      c.tier || getTierFromPoints(c.points || 0),
      String(c.total_spent ?? 0),
      c.created_at ? formatDateICT(c.created_at) : ''
    ])
    const csv = [cols.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `customers-${selectedOnly && selectedCustomerIds.size>0 ? 'selected-' : ''}${getTodayICT()}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const saveCustomerName = async (customerId: string) => {
    if (!nameInput.trim()) return
    setPointsSaving(true)
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, full_name: nameInput.trim() })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setPointsMsg('Name updated ✅')
      setEditingName(null)
      setNameInput('')
      fetchCustomers()
      setTimeout(() => setPointsMsg(''), 3000)
    } catch {
      setPointsMsg('❌ Failed to update name')
      setTimeout(() => setPointsMsg(''), 3000)
    }
    setPointsSaving(false)
  }

  const saveCustomerPhone = async (customerId: string) => {
    setPointsSaving(true)
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, phone: phoneInput.trim() })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setPointsMsg('Phone updated ✅')
      setEditingPhone(null)
      setPhoneInput('')
      fetchCustomers()
      setTimeout(() => setPointsMsg(''), 3000)
    } catch {
      setPointsMsg('❌ Failed to update phone')
      setTimeout(() => setPointsMsg(''), 3000)
    }
    setPointsSaving(false)
  }

  const deleteCustomer = async (customerId: string) => {
    setPointsSaving(true)
    try {
      const res = await fetch(`/api/admin/customers?customerId=${encodeURIComponent(customerId)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      setDeleteConfirmId(null)
      setPointsMsg('Customer deleted ✅')
      fetchCustomers()
      setTimeout(() => setPointsMsg(''), 3000)
    } catch (e) {
      setPointsMsg('❌ Failed to delete: ' + (e instanceof Error ? e.message : 'Error'))
      setTimeout(() => setPointsMsg(''), 4000)
    }
    setPointsSaving(false)
  }

  const exportCSV = () => {
    const rows = [
      ['Date','Customer','Phone','Items','Total','Status','Payment'],
      ...orders.map(o => [
        formatDateThaiICT(o.created_at),
        o.customer_name||'', o.customer_phone||'',
        (o.items||[]).map((i:any)=>`${i.name} x${i.quantity}`).join('; '),
        o.total, o.status, o.payment_method,
      ])
    ]
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `homie-orders-${getTodayICT()}.csv`; a.click()
  }

  // Analytics
  const filteredByPeriod = orders.filter(o => new Date(o.created_at) >= daysAgoICT(parseInt(period)))
  const totalRev = filteredByPeriod.reduce((s,o)=>s+(o.total||0),0)
  const avgOrder = filteredByPeriod.length ? totalRev/filteredByPeriod.length : 0
  const pendingCount = orders.filter(o=>o.status==='pending').length
  const todayOrders = orders.filter(o => toDateStringICT(o.created_at) === getTodayICT())
  const todayRev = todayOrders.reduce((s,o)=>s+(o.total||0),0)
  const topItems: Record<string,number> = {}
  filteredByPeriod.forEach(o=>{try{(o.items||[]).forEach((i:any)=>{if(i?.name)topItems[i.name]=(topItems[i.name]||0)+(i.quantity||1)})}catch{}})
  const topItemsSorted = Object.entries(topItems).sort((a,b)=>b[1]-a[1]).slice(0,5)
  const revenueByDay: Record<string,number> = {}
  filteredByPeriod.forEach(o=>{
    const d = formatDateShortICT(o.created_at)
    revenueByDay[d]=(revenueByDay[d]||0)+(o.total||0)
  })

  const newOrders = orders
    .filter(o => o.status === 'pending')
    .filter(o => orderPaymentFilter==='all' || o.payment_method===orderPaymentFilter)
  const recentOrders = orders
    .filter(o => o.status !== 'pending')
    .filter(o => orderFilter==='all' || o.status===orderFilter)
    .filter(o => orderPaymentFilter==='all' || o.payment_method===orderPaymentFilter)

  // ─── Login Screen ─────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, position: 'fixed', top: 0, left: 0, overflow: 'hidden' }} className="bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <span className="text-2xl font-bold text-slate-300">H</span>
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Homie Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to continue</p>
        </div>
        <div className="bg-slate-900/80 rounded-xl p-6 border border-slate-800">
          <label className="block text-slate-400 text-sm font-medium mb-1.5">Password</label>
          <input
            type="password" value={pw} placeholder="Enter admin password"
            onChange={e=>{setPw(e.target.value);setPwErr(false)}}
            onKeyDown={e=>{if(e.key==='Enter'){if(pw===ADMIN_PASSWORD)setAuthed(true);else setPwErr(true)}}}
            className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 mb-1 ${pwErr?'border-rose-500':'border-slate-700'}`}
          />
          {pwErr && <p className="text-rose-400 text-xs mb-3">Incorrect password</p>}
          <div className="flex gap-2 mt-3 mb-4">
            {(['admin','kitchen'] as const).map(r=>(
              <button key={r} onClick={()=>setRole(r)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${role===r?'bg-slate-700 text-white':'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                {r==='admin'?'Admin':'Kitchen'}
              </button>
            ))}
          </div>
          <button onClick={()=>{if(pw===ADMIN_PASSWORD)setAuthed(true);else setPwErr(true)}}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-3 font-medium transition-colors">
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
    {key:'dashboard', icon: LayoutDashboard, label:'Dashboard'},
    {key:'orders', icon: Package, label:'Orders & Payments', badge: pendingCount + unconfirmedPayments || undefined},
    ...(role==='admin' ? [
      {key:'menu', icon: UtensilsCrossed, label:'Menu'},
      {key:'customers', icon: Users, label:'Customers'},
      {key:'loyalty', icon: Star, label:'Loyalty'},
      {key:'referrals', icon: Gift, label:'Referrals'},
      {key:'analytics', icon: BarChart3, label:'Analytics'},
      {key:'settings', icon: Settings, label:'Settings'},
    ] : []),
  ]

  const dm = darkMode
  const bg = dm ? 'bg-slate-950' : 'bg-slate-50'
  const card = dm ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
  const text = dm ? 'text-slate-100' : 'text-slate-900'
  const muted = dm ? 'text-slate-400' : 'text-slate-500'
  const inputCls = `w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-400 transition-all ${dm?'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500':'border-slate-200 text-slate-900 placeholder-slate-400'}`

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, position: 'fixed', top: 0, left: 0, overflow: 'hidden' }} className={`${bg} ${text} flex flex-col md:flex-row transition-colors duration-300`}>

      {/* Mobile Overlay for Sidebar */}
      {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-10" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar (Enterprise dark sidebar) ──────────────────────────────────── */}
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ease-out fixed md:sticky top-0 h-screen z-30 overflow-hidden
        ${sidebarOpen ? 'w-60 left-0' : 'w-[72px] -left-full md:left-0 md:w-[72px]'}`}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800 shrink-0">
          <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 text-slate-300 font-semibold text-sm">H</div>
          {sidebarOpen && <span className="font-semibold text-sm text-white truncate">Homie Admin</span>}
        </div>
        <nav className="flex-1 py-4 overflow-y-auto px-3">
          {navItems.map(item=>{
            const Icon = item.icon
            return (
            <button key={item.key} onClick={()=>setTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative
                ${tab===item.key 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
              <Icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {item.badge ? <span className={`${sidebarOpen?'ml-auto':'absolute top-2 right-2'} bg-rose-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-semibold px-1`}>{item.badge}</span> : null}
            </button>
          )})}
        </nav>
        <div className="border-t border-slate-800 p-3 space-y-0.5 shrink-0">
          <button onClick={()=>setDarkMode(!dm)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors">
            {dm ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            {sidebarOpen && <span>{dm?'Light mode':'Dark mode'}</span>}
          </button>
          <button onClick={()=>setAuthed(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800/50 hover:text-rose-400 transition-colors">
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 w-full md:w-auto">
        <header className={`${card} border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3`}>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} className={`p-2 rounded-lg transition-colors ${muted} hover:bg-slate-100 dark:hover:bg-slate-800`}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className={`hidden sm:flex items-center gap-2.5 text-xs font-medium ${dm?'bg-slate-800 text-slate-300':'bg-slate-100 text-slate-600'} rounded-lg px-4 py-2`}>
              <span className="text-slate-500">Today</span>
              <span>{todayOrders.length} orders</span>
              <span className="text-slate-400">·</span>
              <span className="font-semibold text-slate-900 dark:text-white">฿{fmt(todayRev)}</span>
            </div>
            <NotificationBell onSelectOrder={()=>setTab('orders')} darkMode={dm} />
            <div className="w-9 h-9 bg-slate-800 dark:bg-slate-700 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {role==='admin'?'A':'K'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">

          {/* ═══ DASHBOARD (Overview) ═══════════════════════════════════════════ */}
          {tab==='dashboard' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
                <p className={`text-sm ${muted} mt-0.5`}>Overview of your business performance</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={<DollarSign className="w-5 h-5"/>} label="Today's Revenue" value={`฿${fmt(todayRev)}`} sub={`${todayOrders.length} orders`} color="emerald" darkMode={dm}/>
                <StatCard icon={<Package className="w-5 h-5"/>} label="Pending Orders" value={pendingCount} sub="Awaiting action" color="amber" darkMode={dm}/>
                <StatCard icon={<Users className="w-5 h-5"/>} label="Customers" value={customers.length} sub="Registered users" color="blue" darkMode={dm}/>
                <StatCard icon={<BarChart3 className="w-5 h-5"/>} label="7d Revenue" value={`฿${fmt(filteredByPeriod.reduce((s,o)=>s+(o.total||0),0))}`} sub="Last 7 days" color="slate" darkMode={dm}/>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className={`${card} border rounded-lg p-6`}>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Recent Orders</h3>
                  {orders.slice(0, 5).length === 0 ? (
                    <p className={`text-sm ${muted}`}>No orders yet</p>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 5).map(o=>(
                        <div key={o.id} className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                          <div>
                            <p className="font-medium text-sm">{o.customer_name||'Guest'}</p>
                            <p className={`text-xs ${muted}`}>{fmtDate(o.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-900 dark:text-white">฿{fmt(o.total)}</p>
                            <Badge s={o.status}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={()=>setTab('orders')} className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    View all orders →
                  </button>
                </div>
                <div className={`${card} border rounded-lg p-6`}>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={()=>setTab('orders')} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left">
                      <Package className="w-5 h-5 text-slate-500 mb-2"/>
                      <p className="font-medium text-sm">Orders</p>
                      <p className={`text-xs ${muted}`}>Manage orders</p>
                    </button>
                    <button onClick={()=>setTab('menu')} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left">
                      <UtensilsCrossed className="w-5 h-5 text-slate-500 mb-2"/>
                      <p className="font-medium text-sm">Menu</p>
                      <p className={`text-xs ${muted}`}>Edit meals</p>
                    </button>
                    <button onClick={()=>setTab('customers')} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left">
                      <Users className="w-5 h-5 text-slate-500 mb-2"/>
                      <p className="font-medium text-sm">Customers</p>
                      <p className={`text-xs ${muted}`}>Customer list</p>
                    </button>
                    <button onClick={()=>setTab('analytics')} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left">
                      <BarChart3 className="w-5 h-5 text-slate-500 mb-2"/>
                      <p className="font-medium text-sm">Analytics</p>
                      <p className={`text-xs ${muted}`}>View reports</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ORDERS & PAYMENTS ════════════════════════════════════════════ */}
          {tab==='orders' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Orders & Payments</h1>
                  <p className={`text-sm ${muted} mt-0.5`}>{newOrders.length} new · {recentOrders.length} recent · {unconfirmedPayments} pending payment</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedOrderIds.size > 0 && (
                    <div className="flex items-center gap-2 mr-2">
                      <span className="text-sm text-slate-500">{selectedOrderIds.size} selected</span>
                      <select onChange={e=>{const v=e.target.value;if(v)bulkUpdateOrderStatus(v);e.target.value=''}}
                        className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800"
                        disabled={bulkStatusSaving}>
                        <option value="">Bulk update status...</option>
                        {STATUS_STEPS.map(s=>(<option key={s} value={s}>{STATUS_LABEL[s]}</option>))}
                      </select>
                      <button onClick={()=>setSelectedOrderIds(new Set())} className="text-xs text-slate-500 hover:text-slate-700">Clear</button>
                    </div>
                  )}
                  <button onClick={fetchOrders} className="text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
                    <RefreshCw className="w-4 h-4"/> Refresh
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-xs font-medium text-slate-500">Payment:</span>
                <select value={orderPaymentFilter} onChange={e=>setOrderPaymentFilter(e.target.value as any)}
                  className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 min-w-[140px]">
                  <option value="all">All payment</option>
                  <option value="promptpay">PromptPay</option>
                  <option value="cod">COD</option>
                  <option value="card">Card</option>
                </select>
                <span className="text-xs font-medium text-slate-500 ml-2">Recent filter:</span>
                <div className="flex gap-1">
                  {['all',...STATUS_STEPS.filter(s=>s!=='pending')].map(s=>{
                    const count = orders.filter(o=>o.status!=='pending').filter(o=>orderPaymentFilter==='all'||o.payment_method===orderPaymentFilter).filter(o=>s==='all'||o.status===s).length
                    return (
                    <button key={s} onClick={()=>setOrderFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                        ${orderFilter===s ? 'bg-slate-900 dark:bg-slate-700 text-white' : dm ? 'bg-slate-800/50 text-slate-400 hover:bg-slate-800' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {s==='all'?'All':STATUS_LABEL[s]} ({count})
                    </button>
                  )})}
                </div>
              </div>

              {loadingOrders ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* New Orders table */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-500"/> New Orders
                        {newOrders.length > 0 && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">{newOrders.length}</span>}
                      </h2>
                    </div>
                    <div className={`${card} border rounded-lg overflow-hidden`}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className={`border-b ${dm?'border-slate-700 bg-slate-800/50':'border-slate-200 bg-slate-50'}`}>
                              <th className="text-left py-3 px-4 w-10"><input type="checkbox" checked={newOrders.length>0&&newOrders.every(o=>selectedOrderIds.has(o.id))} onChange={e=>{if(e.target.checked)setSelectedOrderIds(prev=>{const next=new Set(prev);newOrders.forEach(o=>next.add(o.id));return next});else setSelectedOrderIds(prev=>{const next=new Set(prev);newOrders.forEach(o=>next.delete(o.id));return next})}}/></th>
                              <th className="text-left py-3 px-4 font-medium">Date</th>
                              <th className="text-left py-3 px-4 font-medium">Customer</th>
                              <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">Items</th>
                              <th className="text-right py-3 px-4 font-medium">Total</th>
                              <th className="text-left py-3 px-4 font-medium">Status</th>
                              <th className="text-left py-3 px-4 font-medium">Payment</th>
                              <th className="w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {newOrders.map(order=>{
                              const isPP = order.payment_method==='promptpay'
                              const needsConfirm = (isPP||order.payment_method==='card')&&!order.payment_confirmed
                              const methodLabel = isPP?'PromptPay':order.payment_method==='cod'?'COD':'Card'
                              return (
                                <tr key={order.id} className={`border-b ${dm?'border-slate-800 hover:bg-slate-800/50':'border-slate-100 hover:bg-slate-50'} transition-colors ${needsConfirm?'bg-amber-50/30 dark:bg-amber-950/20':''}`}>
                                  <td className="py-3 px-4" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selectedOrderIds.has(order.id)} onChange={e=>{const next=new Set(selectedOrderIds);if(e.target.checked)next.add(order.id);else next.delete(order.id);setSelectedOrderIds(next)}}/></td>
                                  <td className="py-3 px-4 text-slate-500">{fmtDate(order.created_at)}</td>
                                  <td className="py-3 px-4"><span className="font-medium">{order.customer_name||'Guest'}</span>{order.reference_id && <span className="text-xs font-mono text-slate-400 ml-1">#{order.reference_id}</span>}</td>
                                  <td className="py-3 px-4 hidden sm:table-cell text-slate-500 max-w-[180px] truncate">{(order.items||[]).slice(0,2).map((i:any)=>i.name).join(', ')}{(order.items||[]).length>2?'...':''}</td>
                                  <td className="py-3 px-4 text-right font-semibold tabular-nums">฿{fmt(order.total)}</td>
                                  <td className="py-3 px-4"><Badge s={order.status}/></td>
                                  <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded ${needsConfirm?'bg-amber-100 text-amber-700':'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>{methodLabel} {order.payment_confirmed?'✓':'⏳'}</span></td>
                                  <td className="py-3 px-4"><button onClick={()=>setOrderDetailPanel(order)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronDown className="w-4 h-4 rotate-[-90deg]"/></button></td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      {newOrders.length===0 && <div className={`text-center py-12 ${muted}`}>No new orders</div>}
                    </div>
                  </div>

                  {/* Recent Orders table */}
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">Recent Orders</h2>
                    <div className={`${card} border rounded-lg overflow-hidden`}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className={`border-b ${dm?'border-slate-700 bg-slate-800/50':'border-slate-200 bg-slate-50'}`}>
                              <th className="text-left py-3 px-4 w-10"><input type="checkbox" checked={recentOrders.length>0&&recentOrders.every(o=>selectedOrderIds.has(o.id))} onChange={e=>{if(e.target.checked)setSelectedOrderIds(prev=>{const next=new Set(prev);recentOrders.forEach(o=>next.add(o.id));return next});else setSelectedOrderIds(prev=>{const next=new Set(prev);recentOrders.forEach(o=>next.delete(o.id));return next})}}/></th>
                              <th className="text-left py-3 px-4 font-medium">Date</th>
                              <th className="text-left py-3 px-4 font-medium">Customer</th>
                              <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">Items</th>
                              <th className="text-right py-3 px-4 font-medium">Total</th>
                              <th className="text-left py-3 px-4 font-medium">Status</th>
                              <th className="text-left py-3 px-4 font-medium">Payment</th>
                              <th className="w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentOrders.map(order=>{
                              const isPP = order.payment_method==='promptpay'
                              const needsConfirm = (isPP||order.payment_method==='card')&&!order.payment_confirmed
                              const methodLabel = isPP?'PromptPay':order.payment_method==='cod'?'COD':'Card'
                              return (
                                <tr key={order.id} className={`border-b ${dm?'border-slate-800 hover:bg-slate-800/50':'border-slate-100 hover:bg-slate-50'} transition-colors ${needsConfirm?'bg-amber-50/30 dark:bg-amber-950/20':''}`}>
                                  <td className="py-3 px-4" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selectedOrderIds.has(order.id)} onChange={e=>{const next=new Set(selectedOrderIds);if(e.target.checked)next.add(order.id);else next.delete(order.id);setSelectedOrderIds(next)}}/></td>
                                  <td className="py-3 px-4 text-slate-500">{fmtDate(order.created_at)}</td>
                                  <td className="py-3 px-4"><span className="font-medium">{order.customer_name||'Guest'}</span>{order.reference_id && <span className="text-xs font-mono text-slate-400 ml-1">#{order.reference_id}</span>}</td>
                                  <td className="py-3 px-4 hidden sm:table-cell text-slate-500 max-w-[180px] truncate">{(order.items||[]).slice(0,2).map((i:any)=>i.name).join(', ')}{(order.items||[]).length>2?'...':''}</td>
                                  <td className="py-3 px-4 text-right font-semibold tabular-nums">฿{fmt(order.total)}</td>
                                  <td className="py-3 px-4"><Badge s={order.status}/></td>
                                  <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded ${needsConfirm?'bg-amber-100 text-amber-700':'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>{methodLabel} {order.payment_confirmed?'✓':'⏳'}</span></td>
                                  <td className="py-3 px-4"><button onClick={()=>setOrderDetailPanel(order)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronDown className="w-4 h-4 rotate-[-90deg]"/></button></td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      {recentOrders.length===0 && <div className={`text-center py-12 ${muted}`}>No recent orders</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* Order Detail Slide-over Panel */}
              {orderDetailPanel && (
                <div className="fixed inset-0 z-50 flex justify-end">
                  <div className="absolute inset-0 bg-black/50" onClick={()=>setOrderDetailPanel(null)}/>
                  <div className={`relative w-full max-w-md ${card} border-l shadow-2xl overflow-y-auto flex flex-col`}>
                    <div className="sticky top-0 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-inherit">
                      <h3 className="font-semibold">Order #{orderDetailPanel.reference_id||orderDetailPanel.id.slice(0,8)}</h3>
                      <button onClick={()=>setOrderDetailPanel(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="p-4 space-y-4">
                      <div><p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Customer</p><p className="font-medium">{orderDetailPanel.customer_name} · {orderDetailPanel.customer_phone}</p><p className="text-sm text-slate-500 mt-0.5">{orderDetailPanel.delivery_address}</p></div>
                      <div><p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Items</p>{(orderDetailPanel.items||[]).map((item:any,i:number)=>(<div key={i} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm"><span>{item.name} ({item.portion}) ×{item.quantity}</span><span className="font-medium">฿{fmt(item.price*item.quantity)}</span></div>))}</div>
                      {orderDetailPanel.status==='pending' && (
                        <div className={`rounded-lg p-4 ${dm?'bg-emerald-900/30':'bg-emerald-50'} border border-emerald-200 dark:border-emerald-800`}>
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-2">Confirm this order → moves to Recent Orders</p>
                          {(orderDetailPanel.payment_method==='promptpay'||orderDetailPanel.payment_method==='card') ? (
                            <>
                              <p className="text-xs text-slate-500 mb-2">Payment · {orderDetailPanel.payment_confirmed?'✓ Confirmed':'⏳ Pending'}</p>
                              {orderDetailPanel.payment_slip_url&&(<img src={orderDetailPanel.payment_slip_url} alt="Slip" className="w-20 h-20 object-cover rounded cursor-pointer mb-2" onClick={()=>window.open(orderDetailPanel!.payment_slip_url,'_blank')}/>)}
                              {!orderDetailPanel.payment_confirmed?(<button onClick={()=>{confirmPayment(orderDetailPanel.id,true,true);setOrderDetailPanel(null)}} className="w-full py-2 bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium rounded-lg">Confirm Payment & Order</button>):(<button onClick={()=>{updateStatus(orderDetailPanel,'confirmed');setOrderDetailPanel(null)}} className="w-full py-2 bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium rounded-lg">Confirm Order → Recent</button>)}
                              {orderDetailPanel.payment_confirmed&&(<button onClick={()=>{confirmPayment(orderDetailPanel.id,false);setOrderDetailPanel({...orderDetailPanel,payment_confirmed:false})}} className="w-full mt-2 py-2 border text-sm font-medium rounded-lg">Undo Payment</button>)}
                            </>
                          ) : (
                            <button onClick={async()=>{await updateStatus(orderDetailPanel,'confirmed');setOrderDetailPanel(null)}} className="w-full py-2 bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium rounded-lg">Confirm Order (COD)</button>
                          )}
                        </div>
                      )}
                      {orderDetailPanel.notes&&<div className="rounded-lg p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm"><span className="font-medium">Note:</span> {orderDetailPanel.notes}</div>}
                      <div><p className="text-xs text-slate-500 mb-2">Update status</p><div className="flex flex-wrap gap-2">{STATUS_STEPS.map(s=>(<button key={s} onClick={async()=>{await updateStatus(orderDetailPanel,s); if(s==='confirmed')setOrderDetailPanel(null); else setOrderDetailPanel({...orderDetailPanel,status:s})}} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${orderDetailPanel.status===s?'bg-slate-900 dark:bg-slate-700 text-white':'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{STATUS_LABEL[s]}</button>))}</div></div>
                      <button onClick={()=>window.open(`https://wa.me/${orderDetailPanel.customer_phone?.replace(/\D/g,'').replace(/^0/,'66')}?text=${encodeURIComponent(`Hi ${orderDetailPanel.customer_name}! 🥗 Homie Clean Food here.`)}`,'_blank')} className="w-full py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2">WhatsApp</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ MENU ═════════════════════════════════════════════════════ */}
          {tab==='menu' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Menu / Meals</h1>
                  <p className={`text-sm ${muted} mt-0.5`}>{menuItems.length} items · Enterprise management</p>
                </div>
                <div className="flex items-center gap-2">
                  {menuItemIds.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">{menuItemIds.size} selected</span>
                      <button onClick={()=>bulkToggleMenuAvailability(true)} className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50">Enable</button>
                      <button onClick={()=>bulkToggleMenuAvailability(false)} className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50">Hide</button>
                      <button onClick={()=>setMenuItemIds(new Set())} className="text-xs text-slate-500 hover:text-slate-700">Clear</button>
                    </div>
                  )}
                  <button onClick={()=>{setIsNew(true);setEditItem({available:true,category:'chicken',meal_type:'high-protein'})}}
                    className="bg-slate-900 dark:bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors">
                    + Add Meal
                  </button>
                </div>
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
                      <label className={`text-xs font-medium ${muted} block mb-1`}>Meal Image</label>
                      <div className={`flex flex-col sm:flex-row gap-3`}>
                        <label className={`flex-1 min-h-[120px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors
                          ${dm?'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50':'border-slate-300 hover:border-slate-400 hover:bg-slate-50'} ${menuImageUploading?'opacity-60 pointer-events-none':''}`}>
                          <input type="file" accept="image/*" className="hidden"
                            onChange={e=>{const f=e.target.files?.[0];if(f)uploadMenuImage(f);e.target.value=''}} disabled={menuImageUploading}/>
                          {menuImageUploading ? (
                            <><div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"/><span className="text-xs">Uploading...</span></>
                          ) : (
                            <><Upload className="w-8 h-8 text-slate-400"/><span className="text-xs font-medium">Drop image or click to upload</span><span className="text-xs text-slate-400">JPG, PNG, WebP</span></>
                          )}
                        </label>
                        <div className="flex-1 flex flex-col gap-2">
                          {(editItem as any)?.image_url && (
                            <img src={(editItem as any).image_url} alt="" className="w-full h-24 object-cover rounded-xl border border-slate-200 dark:border-slate-700"/>
                          )}
                          <input value={editItem.image_url||''} onChange={e=>setEditItem({...editItem,image_url:e.target.value})} className={inputCls} placeholder="Or paste image URL"/>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 items-center">
                    <button onClick={saveMenuItem} disabled={menuSaving} className="bg-slate-900 dark:bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
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
                  <div key={item.id} className={`${card} border rounded-2xl p-4 flex items-center gap-3 transition-all duration-200`}>
                    <input type="checkbox" checked={menuItemIds.has(item.id)} onChange={e=>{const next=new Set(menuItemIds);if(e.target.checked)next.add(item.id);else next.delete(item.id);setMenuItemIds(next)}}
                      className="shrink-0 w-4 h-4 accent-slate-600" onClick={ev=>ev.stopPropagation()}/>
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
                      <button onClick={()=>duplicateMenuItem(item)} className="text-xs border px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1" title="Duplicate"><Copy className="w-3.5 h-3.5"/>Duplicate</button>
                      <button onClick={()=>{setIsNew(false);setEditItem(item)}} className="text-xs border px-3 py-1.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-emerald-300 transition-colors">Edit</button>
                      <button onClick={()=>deleteMenuItem(item.id)} className="text-xs border px-3 py-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 transition-colors">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ CUSTOMERS ════════════════════════════════════════════════ */}
          {tab==='customers' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Customers</h1>
                  <p className={`text-sm ${muted} mt-0.5`}>{customers.length} registered users</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedCustomerIds.size > 0 && (
                    <span className="text-sm text-slate-500 mr-2">{selectedCustomerIds.size} selected</span>
                  )}
                  <button onClick={()=>exportCustomersCSV(selectedCustomerIds.size>0)} disabled={custLoading || customers.length === 0} className="text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 transition-colors">
                    <FileDown className="w-4 h-4"/> Export{selectedCustomerIds.size>0?' Selected':' All'}
                  </button>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                <input placeholder="Search by name, email, or phone..."
                  value={custSearch} onChange={e=>setCustSearch(e.target.value)}
                  className={`${inputCls} pl-10`}/>
              </div>

              {custLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin"/>
                </div>
              )}

              {!custLoading && custError && (
                <div className="text-center py-12 px-4">
                  <p className="text-amber-600 font-medium">Could not load customers</p>
                  <p className={`text-sm ${muted} mt-1`}>{custError}</p>
                  <button onClick={() => fetchCustomers()} className="mt-4 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">Retry</button>
                </div>
              )}

              {pointsMsg && !custLoading && (
                <div className={`p-3 rounded-lg text-sm font-medium mb-4 ${pointsMsg.includes('✅')?'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700':'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'}`}>{pointsMsg}</div>
              )}

              {!custLoading && !custError && customers.length > 0 && (
                (()=>{
                  const q = custSearch.toLowerCase().trim()
                  const filtered = customers.filter(c=>!q || [c.full_name,c.email,c.phone,c.address].some(v=>String(v||'').toLowerCase().includes(q)))
                  const sorted = [...filtered].sort((a,b)=>{
                    const mult = custSortDir==='asc'?1:-1
                    if(custSortBy==='name') return mult*((a.full_name||'').localeCompare(b.full_name||''))
                    if(custSortBy==='points') return mult*((a.points||0)-(b.points||0))
                    return mult*(new Date(a.created_at).getTime()-new Date(b.created_at).getTime())
                  })
                  return (
                  <div className={`${card} border rounded-lg overflow-hidden`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={`border-b ${dm?'border-slate-700 bg-slate-800/50':'border-slate-200 bg-slate-50'}`}>
                            <th className="text-left py-3 px-4 w-10"><input type="checkbox" checked={sorted.length>0&&selectedCustomerIds.size===sorted.length} onChange={e=>{if(e.target.checked)setSelectedCustomerIds(new Set(sorted.map(c=>c.id)));else setSelectedCustomerIds(new Set())}}/></th>
                            <th className="text-left py-3 px-4 font-medium"><button onClick={()=>{setCustSortBy('name');setCustSortDir(custSortBy==='name'&&custSortDir==='asc'?'desc':'asc')}} className="flex items-center gap-1 hover:text-slate-900">Name {custSortBy==='name'&&<ChevronUp className={`w-4 h-4 ${custSortDir==='desc'?'rotate-180':''}`}/>}</button></th>
                            <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Email</th>
                            <th className="text-left py-3 px-4 font-medium">Phone</th>
                            <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Address</th>
                            <th className="text-left py-3 px-4 font-medium"><button onClick={()=>{setCustSortBy('points');setCustSortDir(custSortBy==='points'&&custSortDir==='asc'?'desc':'asc')}} className="flex items-center gap-1 hover:text-slate-900">Points {custSortBy==='points'&&<ChevronUp className={`w-4 h-4 ${custSortDir==='desc'?'rotate-180':''}`}/>}</button></th>
                            <th className="text-left py-3 px-4 font-medium">Tier</th>
                            <th className="text-left py-3 px-4 font-medium"><button onClick={()=>{setCustSortBy('joined');setCustSortDir(custSortBy==='joined'&&custSortDir==='asc'?'desc':'asc')}} className="flex items-center gap-1 hover:text-slate-900">Joined {custSortBy==='joined'&&<ChevronUp className={`w-4 h-4 ${custSortDir==='desc'?'rotate-180':''}`}/>}</button></th>
                            <th className="w-20"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map(c=>{
                            const tier = c.tier || getTierFromPoints(c.points || 0)
                            const badge = TIER_BADGE[tier] || TIER_BADGE['Homie']
                            return (
                              <tr key={c.id} className={`border-b ${dm?'border-slate-800 hover:bg-slate-800/50':'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                                <td className="py-3 px-4" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selectedCustomerIds.has(c.id)} onChange={e=>{const next=new Set(selectedCustomerIds);if(e.target.checked)next.add(c.id);else next.delete(c.id);setSelectedCustomerIds(next)}}/></td>
                                <td className="py-3 px-4"><span className="font-medium">{c.full_name||'Unknown'}</span></td>
                                <td className="py-3 px-4 hidden md:table-cell text-slate-500 max-w-[180px] truncate" title={c.email}>{c.email||'—'}</td>
                                <td className="py-3 px-4 text-slate-500">{c.phone||'—'}</td>
                                <td className="py-3 px-4 hidden lg:table-cell text-slate-500 max-w-[160px] truncate" title={c.address}>{c.address||'—'}</td>
                                <td className="py-3 px-4 font-semibold tabular-nums">{c.points||0}</td>
                                <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded ${badge.cls}`}>{badge.label}</span></td>
                                <td className="py-3 px-4 text-slate-500">{formatDateICT(c.created_at)}</td>
                                <td className="py-3 px-4">
                                  <div className="flex gap-1">
                                    <button onClick={()=>{setCustomerEditModal(c);setNameInput(c.full_name||'');setPhoneInput(c.phone||'');setAddressInput(c.address||'');setPointsInput('');setPointsMode('set')}} className="px-2 py-1 rounded text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">Edit</button>
                                    <button onClick={()=>setDeleteConfirmId(c.id)} className="px-2 py-1 rounded text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">Delete</button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {sorted.length===0 && <div className={`text-center py-12 ${muted}`}>No customers match your search</div>}
                  </div>
                  )
                })()
              )}

              {!custLoading && !custError && customers.length === 0 && (
                <div className={`text-center py-16 ${muted}`}>
                  <p>No customers yet</p>
                  <p className="text-sm mt-2">Run migration 005_backfill_profiles.sql in Supabase</p>
                </div>
              )}

              {/* Customer Edit Modal */}
              {customerEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className={`${card} rounded-lg p-6 max-w-md w-full shadow-xl`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Edit Customer</h3>
                      <button onClick={()=>setCustomerEditModal(null)} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="space-y-4">
                      <div><label className="block text-xs font-medium text-slate-500 mb-1">Name</label><input value={nameInput} onChange={e=>setNameInput(e.target.value)} className={inputCls} placeholder="Full name"/></div>
                      <div><label className="block text-xs font-medium text-slate-500 mb-1">Email</label><p className={`text-sm ${muted} py-2`}>{customerEditModal.email||'—'}</p></div>
                      <div><label className="block text-xs font-medium text-slate-500 mb-1">Phone</label><input value={phoneInput} onChange={e=>setPhoneInput(e.target.value)} className={inputCls} placeholder="Phone"/></div>
                      <div><label className="block text-xs font-medium text-slate-500 mb-1">Address</label><input value={addressInput} onChange={e=>setAddressInput(e.target.value)} className={inputCls} placeholder="Delivery address"/></div>
                      <div><label className="block text-xs font-medium text-slate-500 mb-1">Points</label><div className="flex gap-2 mb-2"><button onClick={()=>setPointsMode('add')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${pointsMode==='add'?'bg-slate-900 dark:bg-slate-700 text-white border-slate-900':'border-slate-200'}`}>Add/Remove</button><button onClick={()=>setPointsMode('set')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${pointsMode==='set'?'bg-slate-900 dark:bg-slate-700 text-white border-slate-900':'border-slate-200'}`}>Set</button></div><div className="flex gap-2"><input type="number" value={pointsInput} onChange={e=>setPointsInput(e.target.value)} placeholder={pointsMode==='add'?'e.g. 50 or -20':`Current: ${customerEditModal.points||0}`} className={inputCls}/><button onClick={async()=>{if(!pointsInput)return;setPointsSaving(true);try{const val=parseInt(pointsInput);if(isNaN(val))return;const delta=pointsMode==='set'?val-(customerEditModal.points||0):val;const res=await fetch('/api/admin/add-points',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:customerEditModal.id,points_to_add:delta})});if(!res.ok)throw new Error();const newPts=pointsMode==='set'?val:(customerEditModal.points||0)+delta;setPointsMsg('Points updated ✅');setPointsInput('');fetchCustomers();setCustomerEditModal(c=>c?{...c,points:newPts}:null);setTimeout(()=>setPointsMsg(''),2000)}catch{setPointsMsg('Failed')}setPointsSaving(false)}} disabled={pointsSaving||!pointsInput} className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">Apply</button></div></div>
                      <div className="flex gap-2 pt-4">
                        <button onClick={async()=>{if(nameInput.trim()){setPointsSaving(true);try{const res=await fetch('/api/admin/customers',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerId:customerEditModal.id,full_name:nameInput.trim(),phone:phoneInput.trim(),address:addressInput.trim()})});if(res.ok){setPointsMsg('Saved ✅');setCustomerEditModal(null);fetchCustomers();setTimeout(()=>setPointsMsg(''),2000)}else throw new Error()}catch{setPointsMsg('❌ Failed')}setPointsSaving(false)}}} disabled={pointsSaving||!nameInput.trim()} className="flex-1 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-lg font-medium disabled:opacity-50">Save</button>
                        <button onClick={()=>setCustomerEditModal(null)} className="flex-1 py-2.5 border rounded-lg font-medium">Cancel</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete customer confirmation modal */}
              {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className={`${card} border rounded-lg p-6 max-w-sm w-full shadow-xl`}>
                    <h3 className="font-semibold text-lg mb-2">Delete customer?</h3>
                    <p className={`text-sm ${muted} mb-4`}>
                      This will remove the customer account and profile. Orders will remain for records. This cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button onClick={()=>deleteCustomer(deleteConfirmId)} disabled={pointsSaving} className="flex-1 py-2.5 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors">
                        {pointsSaving ? 'Deleting...' : 'Delete'}
                      </button>
                      <button onClick={()=>setDeleteConfirmId(null)} disabled={pointsSaving} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

                    {tab==='loyalty' && (
            <AdminLoyaltyTab
              darkMode={dm}
              customers={customers.map(c => ({ id: c.id, full_name: c.full_name, points: c.points, tier: c.tier || getTierFromPoints(c.points || 0), created_at: c.created_at }))}
              customersLoading={custLoading}
            />
          )}

          {/* ═══ REFERRAL SYSTEM ════════════════════════════════════════════ */}
          {tab==='referrals' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Referral System</h1>
                  <p className={`text-sm ${muted} mt-0.5`}>Who referred who · referral codes · bonus tracking</p>
                </div>
                <button onClick={fetchReferrals} disabled={referralsLoading} className="text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4"/> Refresh
                </button>
              </div>
              {referralsLoading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin"/></div>
              ) : (
                <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className={`${card} border rounded-lg p-4`}>
                  <p className={`text-xs font-medium ${muted}`}>Total</p>
                  <p className="text-xl font-semibold tabular-nums">{referralsStats.total}</p>
                </div>
                <div className={`${card} border rounded-lg p-4`}>
                  <p className={`text-xs font-medium ${muted}`}>Completed</p>
                  <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{referralsStats.completed}</p>
                </div>
                <div className={`${card} border rounded-lg p-4`}>
                  <p className={`text-xs font-medium ${muted}`}>Pending</p>
                  <p className="text-xl font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{referralsStats.pending}</p>
                </div>
                <div className={`${card} border rounded-lg p-4`}>
                  <p className={`text-xs font-medium ${muted}`}>Bonus per referral</p>
                  <p className="text-xl font-semibold tabular-nums">+100 pts</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className={`${card} border rounded-lg overflow-hidden`}>
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold">Referral Codes</h3>
                    <p className={`text-xs ${muted} mt-0.5`}>Each customer has a unique code to share</p>
                  </div>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    {referralCodes.length === 0 ? (
                      <div className={`p-6 text-center ${muted} text-sm`}>No codes yet</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead><tr className={`border-b ${dm?'border-slate-700 bg-slate-800/50':'border-slate-200 bg-slate-50'}`}><th className="text-left py-2 px-4 font-medium">Customer</th><th className="text-left py-2 px-4 font-medium">Code</th></tr></thead>
                        <tbody>{referralCodes.map((p: any)=>(<tr key={p.id} className={`border-b ${dm?'border-slate-800':'border-slate-100'}`}><td className="py-2 px-4">{p.full_name||'Unknown'}</td><td className="py-2 px-4 font-mono font-semibold text-slate-600 dark:text-slate-400">{p.referral_code}</td></tr>))}</tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className={`${card} border rounded-lg overflow-hidden`}>
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div><h3 className="font-semibold">Who Referred Who</h3><p className={`text-xs ${muted} mt-0.5`}>Full referral audit trail</p></div>
                    <select value={referralStatusFilter} onChange={e=>setReferralStatusFilter(e.target.value as 'all'|'completed'|'pending')} className={`text-xs border rounded-lg px-2 py-1.5 ${dm?'bg-slate-800 border-slate-700':'border-slate-200'}`}>
                      <option value="all">All status</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    {referrals.filter((r:any)=>referralStatusFilter==='all'||r.status===referralStatusFilter).length === 0 ? (
                      <div className={`p-6 text-center ${muted} text-sm`}>No referrals yet</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead><tr className={`border-b ${dm?'border-slate-700 bg-slate-800/50':'border-slate-200 bg-slate-50'}`}><th className="text-left py-2 px-4 font-medium">Referrer</th><th className="text-left py-2 px-4 font-medium">Referred</th><th className="text-left py-2 px-4 font-medium">Date</th><th className="text-left py-2 px-4 font-medium">Status</th><th className="text-right py-2 px-4 font-medium">Bonus</th></tr></thead>
                        <tbody>
                          {referrals.filter((r:any)=>referralStatusFilter==='all'||r.status===referralStatusFilter).map((r: any)=>(
                            <tr key={r.id} className={`border-b ${dm?'border-slate-800 hover:bg-slate-800/50':'border-slate-100 hover:bg-slate-50'}`}>
                              <td className="py-2 px-4 font-medium">{r.referrer_name}</td>
                              <td className="py-2 px-4">{r.referred_user_name}</td>
                              <td className="py-2 px-4 text-slate-500">{formatDateICT(r.created_at)}</td>
                              <td className="py-2 px-4"><span className={`text-xs px-2 py-0.5 rounded font-medium ${r.status==='completed'?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400':'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{r.status}</span></td>
                              <td className="py-2 px-4 text-right font-semibold">{r.status==='completed'?'+100 pts':'—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
                </>
              )}
            </div>
          )}

          {/* ═══ ANALYTICS ════════════════════════════════════════════════ */}
          {tab==='analytics' && (
            <div>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Analytics</h1>
                  <p className={`text-sm ${muted} mt-0.5`}>Business performance overview</p>
                </div>
                <div className="flex gap-2">
                  <select value={period} onChange={e=>setPeriod(e.target.value)}
                    className={`border rounded-xl px-3 py-2 text-sm outline-none ${dm?'bg-gray-800 border-gray-700':'border-gray-200'}`}>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">All time</option>
                  </select>
                  <button onClick={exportCSV} className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                    ⬇️ Export CSV
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <StatCard icon={<DollarSign className="w-5 h-5"/>} label="Total Revenue" value={`฿${fmt(totalRev)}`} color="emerald" darkMode={dm}/>
                <StatCard icon={<Package className="w-5 h-5"/>} label="Total Orders" value={filteredByPeriod.length} color="blue" darkMode={dm}/>
                <StatCard icon={<TrendingUp className="w-5 h-5"/>} label="Avg Order" value={`฿${fmt(Math.round(avgOrder))}`} color="amber" darkMode={dm}/>
                <StatCard icon={<Users className="w-5 h-5"/>} label="Customers" value={customers.length} color="slate" darkMode={dm}/>
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
                          <div className={`h-2 ${dm?'bg-slate-700':'bg-slate-100'} rounded-full overflow-hidden`}>
                            <div className="h-full bg-slate-500 dark:bg-slate-600 rounded-full"
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
                            <div className="absolute inset-y-0 left-0 bg-slate-700 dark:bg-slate-600 rounded-lg flex items-center pl-2 transition-all"
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
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Settings</h1>
                <p className={`text-sm ${muted} mt-0.5`}>Admin configuration</p>
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

