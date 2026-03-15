'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { menuItems, type MenuItem } from '@/lib/menuData'
import { getTodayICT, formatDateICT, formatWeekdayICT, toDateStringICT } from '@/lib/dateUtils'
import { DEFAULT_LOYALTY, getTierFromPoints, calcPointsEarned } from '@/lib/loyalty'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCart } from '@/components/CartProvider'
import ReferralTab from '@/components/ReferralTab'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  LayoutDashboard,
  LogOut,
  Dumbbell,
  Star,
  Users,
  User,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface OrderItem {
  id: string
  name: string
  portion: 'lean' | 'bulk'
  price: number
  quantity: number
}

interface Order {
  id: string
  total: number
  status: string
  created_at: string
  items: OrderItem[]
  notes?: string
}

interface CalorieLog {
  log_date: string
  calories_consumed: number
  calories_burned: number
}

interface ExerciseLog {
  id: string
  log_date: string
  activity_type: string
  duration_minutes: number
  calories_burned: number | null
}

const EXERCISE_METS: Record<string, number> = {
  Walking: 3, Running: 10, Cycling: 8, Swimming: 8,
  Gym: 5, Yoga: 3, HIIT: 8, Dancing: 5, Hiking: 6, Sports: 7, Other: 4,
}
const DEFAULT_WEIGHT_KG = 70

function calcBurned(activity: string, durationMin: number): number {
  const met = EXERCISE_METS[activity] ?? 4
  return Math.round((met * DEFAULT_WEIGHT_KG * (durationMin / 60)))
}

function getNutritionFromOrder(order: Order) {
  let calories = 0
  if (!Array.isArray(order.items)) return calories
  for (const item of order.items) {
    const menuItem = menuItems.find(m => m.id === item.id)
    if (!menuItem) continue
    const qty = item.quantity || 1
    const isBulk = (item.portion || 'lean') === 'bulk'
    calories += (isBulk ? menuItem.bulkCalories : menuItem.leanCalories) * qty
  }
  return calories
}

// Loyalty config
const TIERS = [
  { name: 'Homie', minPoints: 0, color: 'bg-gray-100 text-gray-600', emoji: '🌱', perks: ['1 point per ฿100 spent', 'Birthday bonus 50 pts', 'Member-only deals'] },
  { name: 'Clean Eater', minPoints: 200, color: 'bg-lime-100 text-lime-700', emoji: '🥗', perks: ['1.5x points multiplier', 'Free delivery on orders ฿500+', 'Early menu access'] },
  { name: 'Protein King', minPoints: 500, color: 'bg-green-100 text-green-700', emoji: '💪', perks: ['2x points multiplier', 'Free meal every 10 orders', 'Priority delivery', 'Exclusive monthly box'] },
]

const MOCK_USER = { id: 'preview-user', email: 'preview@homiecleanfood.com', user_metadata: { full_name: 'Preview User' } }

export default function DashboardPage() {
  const router = useRouter()
  const { addItem } = useCart()
  const [user, setUser] = useState<any>(null)
  const [dailyGoal, setDailyGoal] = useState(2000)
  const [weeklyGoal, setWeeklyGoal] = useState(14000)
  const [logs, setLogs] = useState<CalorieLog[]>([])
  const [exercises, setExercises] = useState<ExerciseLog[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [profile, setProfile] = useState<{ full_name: string | null; points: number; tier?: string; referral_code?: string; phone?: string; saved_addresses?: { address: string; label?: string }[] } | null>(null)
  const [todayCalories, setTodayCalories] = useState(0)
  const [burnedCalories, setBurnedCalories] = useState(0)
  const [recommendations, setRecommendations] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [exName, setExName] = useState('Walking')
  const [exDuration, setExDuration] = useState('')
  const [tab, setTab] = useState<'overview' | 'exercise_tracker' | 'loyalty' | 'referrals' | 'profile'>('overview')
  const [previewMode, setPreviewMode] = useState(false)
  const [loyaltyConfig, setLoyaltyConfig] = useState(DEFAULT_LOYALTY)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [reorderItems, setReorderItems] = useState<{ [key: string]: number }>({})
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersShowAll, setOrdersShowAll] = useState(false)
  const [newAddress, setNewAddress] = useState('')
  const [newAddressLabel, setNewAddressLabel] = useState('')
  const ORDERS_PER_PAGE = 5
  const ordersTotalPages = Math.ceil(orders.length / ORDERS_PER_PAGE)
  const safeOrdersPage = Math.min(ordersPage, Math.max(1, ordersTotalPages))
  const displayedOrders = ordersShowAll
    ? orders
    : orders.slice((safeOrdersPage - 1) * ORDERS_PER_PAGE, safeOrdersPage * ORDERS_PER_PAGE)

  const today = getTodayICT()

  const fetchData = useCallback(async () => {
    const isPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1'
    const { data: { session } } = await supabase.auth.getSession()
    let u = session?.user
    if (!u && isPreview) {
      setPreviewMode(true)
      u = MOCK_USER as any
      setUser(u)
      setProfile({ full_name: 'Preview User', points: 150, tier: 'Homie', referral_code: 'PREVIEW1', phone: null, saved_addresses: [] })
      setDailyGoal(2000)
      setWeeklyGoal(14000)
      setOrders([])
      setLogs([])
      setExercises([])
      setLoading(false)
      return
    }
    if (!u) {
      router.replace('/signin')
      return
    }
    setUser(u)

    const [profileRes, ordersRes, goalsRes, logsRes, exRes, cfgRes] = await Promise.allSettled([
      supabase.from('profiles').select('full_name, points, tier, daily_calorie_goal, weekly_calorie_goal, referral_code, phone, saved_addresses').eq('id', u.id).single(),
      supabase.from('orders').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(200),
      supabase.from('user_goals').select('calorie_target, weekly_calorie_goal').eq('user_id', u.id).maybeSingle(),
      supabase.from('calorie_logs').select('*').eq('user_id', u.id).order('log_date', { ascending: false }).limit(14),
      supabase.from('exercise_logs').select('*').eq('user_id', u.id).gte('log_date', getWeekStart()).order('log_date', { ascending: false }),
      supabase.from('loyalty_config').select('*').eq('id', 'singleton').single(),
    ])

    const p = profileRes.status === 'fulfilled' ? profileRes.value.data : null
    const pts = (p as any)?.points ?? 0
    const configForTier = cfgRes.status === 'fulfilled' ? (cfgRes.value.data as any) : null
    const mergedCfg = { ...DEFAULT_LOYALTY, ...configForTier }
    const tier = (p as any)?.tier || getTierFromPoints(pts, mergedCfg)
    setProfile({
      full_name: (p as any)?.full_name ?? u.user_metadata?.full_name ?? null,
      points: pts,
      tier,
      referral_code: (p as any)?.referral_code ?? null,
      phone: (p as any)?.phone ?? u.user_metadata?.phone ?? null,
      saved_addresses: Array.isArray((p as any)?.saved_addresses) ? (p as any).saved_addresses : [],
    })

    const daily = (p as any)?.daily_calorie_goal ?? 2000
    const weekly = (p as any)?.weekly_calorie_goal ?? 14000
    const g = goalsRes.status === 'fulfilled' ? goalsRes.value.data : null
    setDailyGoal(g?.calorie_target ?? daily)
    setWeeklyGoal(g?.weekly_calorie_goal ?? weekly)
    setOrders((ordersRes.status === 'fulfilled' ? ordersRes.value.data : null) as Order[] || [])
    setLogs((logsRes.status === 'fulfilled' ? logsRes.value.data : null) as CalorieLog[] || [])
    setExercises((exRes.status === 'fulfilled' ? exRes.value.data : null) as ExerciseLog[] || [])
    const cfg = cfgRes.status === 'fulfilled' ? cfgRes.value.data : null
    if (cfg) setLoyaltyConfig(c => ({ ...DEFAULT_LOYALTY, ...c, ...cfg }))
  }, [router])

  function getWeekStart() {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  }

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  useEffect(() => {
    const ordersToday = orders.filter(o => toDateStringICT(o.created_at) === today)
    const consumedFromOrders = ordersToday.reduce((s, o) => s + getNutritionFromOrder(o), 0)
    const todayLog = logs.find(l => l.log_date === today)
    const consumed = todayLog?.calories_consumed ?? consumedFromOrders
    const burned = todayLog?.calories_burned ?? exercises.filter(e => e.log_date === today).reduce((s, e) => s + (e.calories_burned || 0), 0)
    setTodayCalories(consumed)
    setBurnedCalories(burned)
  }, [orders, logs, exercises, today])

  useEffect(() => {
    const remaining = dailyGoal - todayCalories + burnedCalories
    const recs = menuItems.filter(m => m.leanCalories <= remaining * 1.2).slice(0, 6)
    setRecommendations(recs)
  }, [dailyGoal, todayCalories, burnedCalories])

  const updateGoals = async () => {
    if (!user) return
    await supabase.from('profiles').update({ daily_calorie_goal: dailyGoal, weekly_calorie_goal: weeklyGoal }).eq('id', user.id)
    await supabase.from('user_goals').upsert({ user_id: user.id, calorie_target: dailyGoal, weekly_calorie_goal: weeklyGoal, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    fetchData()
  }

  const logExercise = async () => {
    const duration = parseInt(exDuration) || 0
    if (!user || duration <= 0) return
    const burned = calcBurned(exName, duration)
    await supabase.from('exercise_logs').insert({ user_id: user.id, log_date: today, activity_type: exName, duration_minutes: duration, calories_burned: burned })
    await supabase.from('calorie_logs').upsert({ user_id: user.id, log_date: today, calories_consumed: todayCalories, calories_burned: burnedCalories + burned }, { onConflict: 'user_id,log_date' })
    setExDuration('')
    fetchData()
  }

  const logMeal = async (meal: MenuItem, cal: number) => {
    if (!user) return
    const newConsumed = todayCalories + cal
    const { error } = await supabase.from('calorie_logs').upsert({ user_id: user.id, log_date: today, calories_consumed: newConsumed, calories_burned: burnedCalories }, { onConflict: 'user_id,log_date' })
    if (!error) { setTodayCalories(newConsumed); fetchData() }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/signin')
  }

  const saveAddress = async () => {
    if (!user || !newAddress.trim()) return
    const addrs = profile?.saved_addresses ?? []
    const updated = [...addrs, { address: newAddress.trim(), label: newAddressLabel.trim() || 'Address' }]
    await supabase.from('profiles').update({ saved_addresses: updated }).eq('id', user.id)
    setProfile(p => p ? { ...p, saved_addresses: updated } : null)
    setNewAddress('')
    setNewAddressLabel('')
    fetchData()
  }

  const removeAddress = async (idx: number) => {
    if (!user || !profile?.saved_addresses) return
    const updated = profile.saved_addresses.filter((_, i) => i !== idx)
    await supabase.from('profiles').update({ saved_addresses: updated }).eq('id', user.id)
    setProfile(p => p ? { ...p, saved_addresses: updated } : null)
    fetchData()
  }

  const updateProfileInfo = async (updates: { full_name?: string; phone?: string }) => {
    if (!user) return
    await supabase.from('profiles').update(updates).eq('id', user.id)
    setProfile(p => p ? { ...p, ...updates } : null)
    fetchData()
  }

  const itemKey = (item: { id: string; portion?: string }) => `${item.id}_${(item.portion || 'lean')}`

  const handleReorder = () => {
    if (!selectedOrder) return
    selectedOrder.items.forEach((item: any) => {
      const key = itemKey(item)
      const qty = reorderItems[key] ?? item.quantity ?? 1
      if (qty > 0) {
        const menuItem = menuItems.find(m => m.id === item.id)
        addItem({
          id: item.id,
          name: item.name,
          portion: (item.portion as 'lean' | 'bulk') || 'lean',
          price: item.price,
          quantity: qty,
          image: menuItem?.image,
        })
      }
    })
    setSelectedOrder(null)
    setReorderItems({})
    router.push('/order')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-homie-cream">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-stone-200 border-t-homie-green rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-stone-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }
  if (!user) return null

  const remaining = dailyGoal - todayCalories + burnedCalories
  const firstName = (profile?.full_name || user.email?.split('@')[0] || 'Customer').split(' ')[0]
  const userPoints = profile?.points ?? 0

  // Loyalty computed values
  const currentTier = [...TIERS].reverse().find(t => userPoints >= t.minPoints) || TIERS[0]
  const nextTier = TIERS.find(t => t.minPoints > userPoints)
  const tierProgress = nextTier
    ? ((userPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
    : 100

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    const dayOrders = orders.filter(o => toDateStringICT(o.created_at) === dateStr)
    const dayLog = logs.find(l => l.log_date === dateStr)
    const consumed = dayLog?.calories_consumed ?? dayOrders.reduce((s, o) => s + getNutritionFromOrder(o), 0)
    return { day: formatWeekdayICT(d), consumed: Math.round(consumed), goal: dailyGoal }
  })

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { key: 'exercise_tracker' as const, label: 'Exercise Tracker', icon: <Dumbbell size={18} /> },
    { key: 'loyalty' as const, label: 'Loyalty', icon: <Star size={18} /> },
    { key: 'referrals' as const, label: 'Referrals', icon: <Users size={18} /> },
    { key: 'profile' as const, label: 'Account', icon: <User size={18} /> },
  ]

  return (
    <div className="min-h-screen bg-homie-cream">
      {previewMode && (
        <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium">
          Dev preview — mock data • <Link href="/signin?redirect=/dashboard" className="underline font-semibold">Sign in to see real data</Link>
        </div>
      )}
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-stone-200 lg:bg-white lg:shrink-0">
          <div className="p-5 border-b border-stone-100">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-homie-green rounded-xl flex items-center justify-center text-white font-display font-bold">
                H
              </div>
              <div>
                <span className="font-display font-semibold text-homie-green block">Homie</span>
                <span className="text-[10px] text-stone-500 uppercase tracking-wider">Clean Food</span>
              </div>
            </Link>
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  tab === t.key ? 'bg-stone-100 text-homie-green' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-stone-100">
            <div className="rounded-xl bg-homie-green/10 border border-homie-green/20 px-4 py-3">
              <p className="text-xl font-display font-bold text-homie-green tabular-nums">{userPoints.toLocaleString()}</p>
              <p className="text-xs font-medium text-stone-600 mt-0.5">{currentTier.emoji} {currentTier.name}</p>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-homie-green">Hey, {firstName}</h1>
                <p className="text-stone-500 text-sm mt-0.5">Your clean eating hub</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-stone-600">
                <LogOut size={16} /> Log out
              </Button>
            </div>

            <div className="lg:hidden flex gap-2 p-2 bg-white rounded-2xl border border-stone-200 mb-6 overflow-x-auto">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap ${
                    tab === t.key ? 'bg-homie-green text-white' : 'text-stone-600 bg-stone-50'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW — Action-first like Factor */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Hero CTA: Order again */}
            <Link href="/menu" className="block rounded-2xl overflow-hidden shadow-lg group">
              <div className="bg-homie-green p-8 text-white">
                <p className="text-amber-200/90 text-sm font-semibold uppercase tracking-wider mb-2">Ready for your next meal?</p>
                <h2 className="font-display text-2xl font-bold mb-2">Order Again</h2>
                <p className="text-stone-200/90 text-sm mb-4">Browse 25+ chef-crafted meals. Same-day delivery.</p>
                <span className="inline-flex items-center gap-2 font-semibold text-amber-300 group-hover:text-amber-200">
                  Browse Menu →
                </span>
              </div>
            </Link>

            {/* Quick stats — simplified */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Today', value: todayCalories, unit: 'kcal' },
                { label: 'Goal', value: dailyGoal, unit: 'kcal' },
                { label: 'Left', value: remaining, unit: 'kcal' },
                { label: 'Burned', value: burnedCalories, unit: 'kcal' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-stone-200 p-4 text-center">
                  <p className="text-2xl font-display font-bold text-homie-green tabular-nums">{s.value}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Calorie Goals</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Daily Goal (kcal)</label>
                  <Input type="number" value={dailyGoal} onChange={e => setDailyGoal(+e.target.value)} placeholder="2000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Weekly Goal (kcal)</label>
                  <Input type="number" value={weeklyGoal} onChange={e => setWeeklyGoal(+e.target.value)} placeholder="14000" />
                </div>
                <Button onClick={updateGoals}>Save Goals</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Daily Progress</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-stone-600">{todayCalories} / {dailyGoal} kcal</span>
                  <span className="font-semibold text-stone-900 tabular-nums">{Math.round((todayCalories / dailyGoal) * 100)}%</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-homie-green rounded-full transition-all" style={{ width: `${Math.min(100, (todayCalories / dailyGoal) * 100)}%` }} />
                </div>
                <p className="text-xs text-stone-500 mt-2">Burned: {burnedCalories} kcal today</p>
              </CardContent>
            </Card>
            </div>

            <Card className="mt-6">
              <CardHeader><CardTitle>Weekly Progress</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4', background: 'white' }} formatter={(value) => [`${value ?? 0} kcal`, 'Consumed']} labelFormatter={(label) => `Day: ${label}`} />
                      <Bar dataKey="consumed" fill="#2d5a3d" radius={[4, 4, 0, 0]} name="Consumed" />
                      <Bar dataKey="goal" fill="#e7e5e4" radius={[4, 4, 0, 0]} name="Goal" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-stone-500 text-sm">No orders yet. <Link href="/menu" className="text-homie-green font-medium hover:underline">Order now</Link></p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Date</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Calories</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedOrders.map(o => {
                          const tier = profile?.tier || getTierFromPoints(profile?.points ?? 0, loyaltyConfig) || 'Homie'
                          const pts = calcPointsEarned(o.total, loyaltyConfig, tier)
                          return (
                            <TableRow key={o.id} className="cursor-pointer">
                              <TableCell>{formatDateICT(o.created_at)}</TableCell>
                              <TableCell className="font-medium tabular-nums">฿{o.total}</TableCell>
                              <TableCell className="tabular-nums">{Math.round(getNutritionFromOrder(o))} kcal</TableCell>
                              <TableCell className="font-medium text-amber-600">+{pts}</TableCell>
                              <TableCell>
                                <button
                                  onClick={() => {
                                    setSelectedOrder(o)
                                    setReorderItems(Object.fromEntries((o.items || []).map((item: any) => [`${item.id}_${item.portion || 'lean'}`, item.quantity ?? 1])))
                                  }}
                                  className="text-sm font-medium text-homie-green hover:text-homie-green/80"
                                >
                                  Reorder
                                </button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-stone-100">
                      <span className="text-sm text-stone-500">{orders.length} order{orders.length !== 1 ? 's' : ''} total</span>
                      {orders.length > 0 && orders.length > ORDERS_PER_PAGE && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setOrdersShowAll(!ordersShowAll); setSelectedOrder(null) }}
                            className="text-sm font-medium text-stone-600 hover:text-stone-900"
                          >
                            {ordersShowAll ? 'Show pages' : 'Show all'}
                          </button>
                          {!ordersShowAll && (
                            <>
                              {Array.from({ length: Math.ceil(orders.length / ORDERS_PER_PAGE) }, (_, i) => i + 1).map(p => (
                                <button
                                  key={p}
                                  onClick={() => { setOrdersPage(p); setSelectedOrder(null) }}
                                  className={`w-8 h-8 rounded-xl text-sm font-medium transition-colors ${safeOrdersPage === p ? 'bg-homie-green text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                                >
                                  {p}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* EXERCISE TRACKER TAB — combines Tracker, Exercise, Recommend */}
        {tab === 'exercise_tracker' && (
          <div className="space-y-6">
            {/* Calorie stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Consumed', value: todayCalories },
                { label: 'Burned', value: burnedCalories },
                { label: 'Remaining', value: remaining },
                { label: 'Daily Goal', value: dailyGoal },
              ].map(s => (
                <div key={s.label} className="text-center p-5 bg-white border border-stone-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-2xl font-semibold text-stone-900 tabular-nums">{s.value}</p>
                  <p className="text-xs text-stone-500 mt-1 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
            {/* Log exercise */}
            <Card>
              <CardHeader><CardTitle>Log Exercise</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Activity</label>
                  <select value={exName} onChange={e => setExName(e.target.value)} className="w-full h-10 rounded-lg border border-stone-200 px-3.5 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime">
                    {Object.keys(EXERCISE_METS).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (min)</label>
                  <Input type="number" placeholder="30" value={exDuration} onChange={e => setExDuration(e.target.value)} />
                </div>
                <Button onClick={logExercise} disabled={!exDuration}>Log Exercise</Button>
                <p className="text-xs text-stone-500">≈{exDuration ? calcBurned(exName, parseInt(exDuration) || 0) : 0} kcal burned</p>
              </CardContent>
            </Card>
            {/* Today's workouts */}
            <Card>
              <CardHeader><CardTitle>Today&apos;s Workouts</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Burned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exercises.filter(e => e.log_date === today).length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-stone-500 text-center py-8">No workouts logged today</TableCell></TableRow>
                    ) : (
                      exercises.filter(e => e.log_date === today).map(ex => (
                        <TableRow key={ex.id}>
                          <TableCell>{ex.activity_type}</TableCell>
                          <TableCell>{ex.duration_minutes} min</TableCell>
                          <TableCell>{ex.calories_burned ?? '-'} kcal</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            {/* Recommended meals */}
            <Card>
              <CardHeader>
                <CardTitle>Recommended Menus</CardTitle>
                <p className="text-sm text-stone-500 mt-1">Meals that fit your remaining {remaining} kcal</p>
              </CardHeader>
              <CardContent>
                {recommendations.length === 0 ? (
                  <p className="text-stone-500">You&apos;ve hit your goal! Great work today.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {recommendations.map(meal => (
                      <div key={meal.id} className="flex justify-between items-center p-4 bg-stone-50 rounded-lg border border-stone-100">
                        <div>
                          <p className="font-medium text-stone-900">{meal.name}</p>
                          <p className="text-sm text-stone-500">Lean: {meal.leanCalories} · Bulk: {meal.bulkCalories} kcal</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => logMeal(meal, meal.leanCalories)}>Lean</Button>
                          <Button size="sm" variant="secondary" onClick={() => logMeal(meal, meal.bulkCalories)}>Bulk</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/menu" className="inline-block mt-4 text-homie-green font-medium text-sm hover:underline">Browse full menu →</Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* LOYALTY TAB */}
        {tab === 'loyalty' && (
          <div className="space-y-6">

            {/* Points card */}
            <div className="bg-homie-green text-white rounded-xl p-6 md:p-8 border border-homie-green/90 shadow-lg">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-emerald-200/90 text-xs font-medium uppercase tracking-wider mb-1">Points Balance</p>
                  <p className="text-4xl md:text-5xl font-semibold tabular-nums tracking-tight">{userPoints.toLocaleString()}</p>
                  <p className="text-emerald-200/80 text-sm mt-0.5">points</p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${currentTier.color}`}>
                  {currentTier.emoji} {currentTier.name}
                </div>
              </div>
              {nextTier ? (
                <div>
                  <div className="flex justify-between text-xs text-emerald-200/80 mb-1.5">
                    <span>{currentTier.name}</span>
                    <span>{nextTier.minPoints - userPoints} pts to {nextTier.emoji} {nextTier.name}</span>
                  </div>
                  <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                    <div className="bg-white/90 h-2 rounded-full transition-all duration-500" style={{ width: `${tierProgress}%` }} />
                  </div>
                </div>
              ) : (
                <p className="text-emerald-200 font-medium text-sm">You&apos;ve reached the highest tier!</p>
              )}
            </div>

            {/* How to earn */}
            <Card>
              <CardHeader><CardTitle>How to Earn Points</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: '🛒', label: 'Every Order', value: `${Math.round(loyaltyConfig.points_per_baht * 100)} pt / ฿100` },
                    { icon: '👤', label: 'First Order', value: `+${(loyaltyConfig as any).first_order_bonus ?? 50} pts` },
                    { icon: '🎂', label: 'Birthday', value: `+${(loyaltyConfig as any).birthday_bonus ?? 50} pts` },
                    { icon: '📣', label: 'Refer a Friend', value: `+${(loyaltyConfig as any).referral_bonus ?? 50} pts` },
                  ].map(e => (
                    <div key={e.label} className="text-center p-4 bg-stone-50 rounded-lg border border-stone-100">
                      <div className="text-2xl mb-1.5">{e.icon}</div>
                      <div className="font-semibold text-stone-900 text-sm">{e.value}</div>
                      <div className="text-xs text-stone-500 mt-0.5 font-medium">{e.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Member tiers */}
            <Card>
              <CardHeader><CardTitle>Member Tiers</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {TIERS.map(tier => (
                    <div key={tier.name} className={`rounded-xl p-5 border transition-all ${currentTier.name === tier.name ? 'border-homie-green shadow-md bg-homie-lime/5' : 'border-stone-200 bg-white'}`}>
                      <div className="text-2xl mb-2">{tier.emoji}</div>
                      <div className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold mb-2 ${tier.color}`}>{tier.name}</div>
                      <div className="text-xs text-stone-500 mb-3">{tier.minPoints === 0 ? 'Starting tier' : `From ${tier.minPoints} points`}</div>
                      <ul className="space-y-1.5">
                        {tier.perks.map(perk => (
                          <li key={perk} className="text-sm text-stone-700 flex items-start gap-2">
                            <span className="text-homie-green mt-0.5 font-bold">✓</span> {perk}
                          </li>
                        ))}
                      </ul>
                      {currentTier.name === tier.name && (
                        <div className="mt-3 text-xs font-medium text-homie-green">Your current tier</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        )}

        {/* REFERRALS TAB */}
        {tab === 'referrals' && (
          <ReferralTab profile={profile} user={user} />
        )}

        {/* PROFILE / ACCOUNT TAB */}
        {tab === 'profile' && (
          <div className="space-y-6">
            {/* Points & Tier */}
            <div className="bg-homie-green text-white rounded-xl p-6 border border-homie-green/90 shadow-lg">
              <p className="text-emerald-200/90 text-xs font-medium uppercase tracking-wider mb-1">Loyalty Points</p>
              <p className="text-4xl font-semibold tabular-nums">{userPoints.toLocaleString()}</p>
              <p className="text-emerald-200/80 text-sm mt-0.5">points</p>
              <div className="mt-5 flex items-center gap-3 pt-4 border-t border-white/20">
                <span className="text-2xl">{currentTier.emoji}</span>
                <div>
                  <p className="text-emerald-200/80 text-xs font-medium">Your tier</p>
                  <p className="text-white font-semibold text-lg">{currentTier.name}</p>
                </div>
              </div>
            </div>
            <Card>
              <CardHeader><CardTitle>Account Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Name</label>
                  <Input
                    defaultValue={profile?.full_name || user?.user_metadata?.full_name || ''}
                    onBlur={e => { const v = e.target.value.trim(); if (v) updateProfileInfo({ full_name: v }) }}
                    placeholder="Your name"
                    className="border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
                  <Input value={user?.email || ''} disabled className="bg-stone-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Phone</label>
                  <Input
                    defaultValue={profile?.phone || user?.user_metadata?.phone || ''}
                    onBlur={e => updateProfileInfo({ phone: e.target.value.trim() })}
                    placeholder="+66 XX XXX XXXX"
                    className="border-gray-200"
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Saved Addresses</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-stone-500 mb-4">Use these addresses at checkout for faster ordering</p>
                {(profile?.saved_addresses ?? []).length === 0 ? (
                  <p className="text-stone-500 text-sm py-4">No saved addresses yet</p>
                ) : (
                  <div className="space-y-3">
                    {(profile?.saved_addresses ?? []).map((a: { address: string; label?: string }, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin size={16} className="text-homie-green shrink-0" />
                          <div>
                            <p className="font-medium text-sm text-stone-900">{a.label || 'Address'}</p>
                            <p className="text-xs text-stone-500 truncate">{a.address}</p>
                          </div>
                        </div>
                        <button onClick={() => removeAddress(i)} className="text-red-500 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <label className="block text-sm font-medium text-stone-700 mb-2">Add new address</label>
                  <Input
                    placeholder="Address label (e.g. Home, Office)"
                    value={newAddressLabel}
                    onChange={e => setNewAddressLabel(e.target.value)}
                    className="mb-2"
                  />
                  <Input
                    placeholder="Full delivery address"
                    value={newAddress}
                    onChange={e => setNewAddress(e.target.value)}
                    className="mb-2"
                  />
                  <Button onClick={saveAddress} disabled={!newAddress.trim()} size="sm" className="gap-1">
                    <Plus size={14} /> Save Address
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* REORDER MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center p-0 md:p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-xl md:rounded-xl shadow-xl w-full md:max-w-lg max-h-[90vh] flex flex-col p-6 space-y-4 overflow-y-auto border border-stone-200">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-stone-900">Reorder</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                ✕
              </button>
            </div>

            {/* Order Date */}
            <p className="text-sm text-stone-500">
              Order from {formatDateICT(selectedOrder.created_at)} • ฿{selectedOrder.total}
            </p>

            {/* Items with Quantity Editor */}
            <div className="space-y-2">
              {selectedOrder.items
                .filter((item: any) => (reorderItems[itemKey(item)] ?? item.quantity ?? 1) > 0)
                .map((item: any) => {
                const key = itemKey(item)
                const menuItem = menuItems.find(m => m.id === item.id)
                return (
                <div key={key} className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg border border-stone-100">
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 relative bg-gray-200">
                    {menuItem?.image ? (
                      <Image src={menuItem.image} alt={item.name} fill className="object-cover" sizes="56px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900 text-sm">{item.name}</p>
                    <p className="text-xs text-stone-500">฿{item.price} • {item.portion || 'lean'}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setReorderItems(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? item.quantity ?? 1) - 1) }))}
                      className="w-8 h-8 rounded-md bg-white border border-stone-200 text-stone-700 font-medium hover:bg-stone-50"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={reorderItems[key] ?? item.quantity ?? 1}
                      onChange={e => setReorderItems(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                      className="w-11 text-center border border-stone-200 rounded-md font-medium text-sm"
                      min="0"
                    />
                    <button
                      onClick={() => setReorderItems(prev => ({ ...prev, [key]: (prev[key] ?? item.quantity ?? 1) + 1 }))}
                      className="w-8 h-8 rounded-md bg-homie-green text-white font-medium hover:bg-homie-green/90"
                    >
                      +
                    </button>
                  </div>
                </div>
              )})}
            </div>

            {/* Total Price Preview */}
            <div className="p-4 bg-stone-50 rounded-lg border border-stone-100">
              <p className="text-sm text-stone-500 mb-1">Estimated Total</p>
              <p className="text-xl font-semibold text-stone-900 tabular-nums">
                ฿{(Object.entries(reorderItems).reduce((sum, [key, qty]) => {
                  const [id, portion] = key.includes('_') ? key.split('_') : [key, 'lean']
                  const item = selectedOrder.items.find((i: any) => (i.id === id) && ((i.portion || 'lean') === portion))
                  return sum + (item?.price ?? 0) * qty
                }, 0)).toFixed(2)}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-stone-700 border border-stone-300 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReorder}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-white bg-homie-green hover:bg-homie-green/90"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

