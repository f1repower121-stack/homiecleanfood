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
    const { data: { session } } = await supabase.auth.getSession()
    const u = session?.user
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-homie-gray">Loading...</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Sidebar — desktop only */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white lg:shrink-0">
          <div className="p-5 border-b border-gray-100">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-homie-lime to-homie-green rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-lime-200/50">
                H
              </div>
              <div>
                <span className="font-display font-bold text-homie-green block leading-tight">Homie</span>
                <span className="text-[10px] text-homie-gray uppercase tracking-wider">Clean Food</span>
              </div>
            </Link>
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-lime-50 text-homie-green border border-lime-100'
                    : 'text-homie-gray hover:bg-gray-50 hover:text-homie-dark border border-transparent'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100">
            <div className="bg-lime-50 border border-lime-100 rounded-xl p-4">
              <p className="text-2xl font-bold text-homie-green">{userPoints.toLocaleString()} pts</p>
              <p className="text-xs font-semibold text-homie-gray mt-0.5">{currentTier.emoji} {currentTier.name}</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-4 py-6 lg:py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-homie-green">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName}</h1>
                <p className="text-homie-gray text-sm mt-0.5">Your wellness dashboard</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-homie-gray hover:text-homie-green">
                <LogOut size={16} /> Log out
              </Button>
            </div>

            {/* Mobile tabs */}
            <div className="lg:hidden flex gap-2 p-2 bg-white rounded-xl border border-gray-100 mb-6 overflow-x-auto">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    tab === t.key ? 'bg-homie-green text-white' : 'text-homie-gray hover:bg-gray-50'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-lime-200 hover:shadow-sm transition-all">
                <div className="text-2xl mb-2">🔥</div>
                <p className="text-xs font-semibold text-homie-gray uppercase tracking-wider">Consumed</p>
                <p className="text-2xl font-bold text-homie-green mt-0.5">{todayCalories} <span className="text-sm font-normal text-homie-gray">kcal</span></p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-lime-200 hover:shadow-sm transition-all">
                <div className="text-2xl mb-2">🎯</div>
                <p className="text-xs font-semibold text-homie-gray uppercase tracking-wider">Daily goal</p>
                <p className="text-2xl font-bold text-homie-green mt-0.5">{dailyGoal} <span className="text-sm font-normal text-homie-gray">kcal</span></p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-lime-200 hover:shadow-sm transition-all bg-lime-50/50">
                <div className="text-2xl mb-2">✨</div>
                <p className="text-xs font-semibold text-homie-gray uppercase tracking-wider">Remaining</p>
                <p className="text-2xl font-bold text-homie-lime mt-0.5">{remaining} kcal</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-lime-200 hover:shadow-sm transition-all">
                <div className="text-2xl mb-2">🏃</div>
                <p className="text-xs font-semibold text-homie-gray uppercase tracking-wider">Burned</p>
                <p className="text-2xl font-bold text-homie-green mt-0.5">{burnedCalories} <span className="text-sm font-normal text-homie-gray">kcal</span></p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-gray-100">
              <CardHeader><CardTitle>Calorie Goals</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-homie-dark mb-1">Daily Goal (kcal)</label>
                  <Input type="number" value={dailyGoal} onChange={e => setDailyGoal(+e.target.value)} placeholder="2000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-homie-dark mb-1">Weekly Goal (kcal)</label>
                  <Input type="number" value={weeklyGoal} onChange={e => setWeeklyGoal(+e.target.value)} placeholder="14000" />
                </div>
                <Button onClick={updateGoals}>Save Goals</Button>
              </CardContent>
            </Card>

            <Card className="border-gray-100">
              <CardHeader><CardTitle>Daily Progress</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-homie-gray">{todayCalories} / {dailyGoal} kcal consumed</span>
                  <span className="text-homie-lime font-semibold">{Math.round((todayCalories / dailyGoal) * 100)}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-homie-lime rounded-full transition-all" style={{ width: `${Math.min(100, (todayCalories / dailyGoal) * 100)}%` }} />
                </div>
                <p className="text-xs text-homie-gray mt-2">Burned: {burnedCalories} kcal today</p>
              </CardContent>
            </Card>
            </div>

            <Card className="border-gray-100 mt-6">
              <CardHeader><CardTitle>Weekly Progress</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} formatter={(value) => [`${value ?? 0} kcal`, 'Consumed']} labelFormatter={(label) => `Day: ${label}`} />
                      <Bar dataKey="consumed" fill="#7CB518" radius={[4, 4, 0, 0]} name="Consumed" />
                      <Bar dataKey="goal" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="Goal" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/menu" className="inline-flex items-center gap-2 px-4 py-2.5 bg-homie-lime text-white font-semibold rounded-xl hover:bg-homie-green transition-colors text-sm">
                Order again
              </Link>
            </div>
            <Card className="border-gray-100 mt-6">
              <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-homie-gray text-sm">No orders yet. <Link href="/menu" className="text-homie-lime hover:underline">Order now</Link></p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Calories</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedOrders.map(o => {
                          const tier = profile?.tier || getTierFromPoints(profile?.points ?? 0, loyaltyConfig) || 'Homie'
                          const pts = calcPointsEarned(o.total, loyaltyConfig, tier)
                          return (
                            <TableRow key={o.id} className="hover:bg-gray-50 cursor-pointer">
                              <TableCell>{formatDateICT(o.created_at)}</TableCell>
                              <TableCell>฿{o.total}</TableCell>
                              <TableCell>{Math.round(getNutritionFromOrder(o))} kcal</TableCell>
                              <TableCell className="text-yellow-500 font-medium">+{pts} ⭐</TableCell>
                              <TableCell>
                                <button
                                  onClick={() => {
                                    setSelectedOrder(o)
                                    setReorderItems(Object.fromEntries((o.items || []).map((item: any) => [`${item.id}_${item.portion || 'lean'}`, item.quantity ?? 1])))
                                  }}
                                  className="text-homie-lime hover:text-homie-green font-semibold text-sm"
                                >
                                  Reorder
                                </button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-gray-100">
                      <span className="text-sm text-homie-gray">{orders.length} order{orders.length !== 1 ? 's' : ''} total</span>
                      {orders.length > 0 && orders.length > ORDERS_PER_PAGE && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setOrdersShowAll(!ordersShowAll); setSelectedOrder(null) }}
                            className="text-sm font-medium text-homie-lime hover:text-homie-green"
                          >
                            {ordersShowAll ? 'Show pages' : 'Show all'}
                          </button>
                          {!ordersShowAll && (
                            <>
                              {Array.from({ length: Math.ceil(orders.length / ORDERS_PER_PAGE) }, (_, i) => i + 1).map(p => (
                                <button
                                  key={p}
                                  onClick={() => { setOrdersPage(p); setSelectedOrder(null) }}
                                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${safeOrdersPage === p ? 'bg-homie-green text-white' : 'bg-gray-100 text-homie-gray hover:bg-gray-200'}`}
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
                { label: 'Consumed', value: todayCalories, color: 'text-homie-green' },
                { label: 'Burned', value: burnedCalories, color: 'text-homie-green' },
                { label: 'Remaining', value: remaining, color: 'text-homie-lime' },
                { label: 'Daily Goal', value: dailyGoal, color: 'text-homie-green' },
              ].map(s => (
                <div key={s.label} className="text-center p-4 bg-white border border-gray-100 rounded-2xl">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-homie-gray">{s.label}</p>
                </div>
              ))}
            </div>
            {/* Log exercise */}
            <Card className="border-gray-100">
              <CardHeader><CardTitle>Log Exercise</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Activity</label>
                  <select value={exName} onChange={e => setExName(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime">
                    {Object.keys(EXERCISE_METS).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (min)</label>
                  <Input type="number" placeholder="30" value={exDuration} onChange={e => setExDuration(e.target.value)} />
                </div>
                <Button onClick={logExercise} disabled={!exDuration}>Log Exercise</Button>
                <p className="text-xs text-homie-gray">≈{exDuration ? calcBurned(exName, parseInt(exDuration) || 0) : 0} kcal burned</p>
              </CardContent>
            </Card>
            {/* Today's workouts */}
            <Card className="border-gray-100">
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
                      <TableRow><TableCell colSpan={3} className="text-homie-gray text-center py-8">No workouts logged today</TableCell></TableRow>
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
            <Card className="border-gray-100">
              <CardHeader>
                <CardTitle>Recommended Menus</CardTitle>
                <p className="text-sm text-homie-gray mt-1">Meals that fit your remaining {remaining} kcal</p>
              </CardHeader>
              <CardContent>
                {recommendations.length === 0 ? (
                  <p className="text-homie-gray">You&apos;ve hit your goal! Great work today 💪</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {recommendations.map(meal => (
                      <div key={meal.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-semibold text-homie-dark">{meal.name}</p>
                          <p className="text-sm text-homie-gray">Lean: {meal.leanCalories} kcal · Bulk: {meal.bulkCalories} kcal</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => logMeal(meal, meal.leanCalories)}>Lean</Button>
                          <Button size="sm" variant="secondary" onClick={() => logMeal(meal, meal.bulkCalories)}>Bulk</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/menu" className="inline-block mt-4 text-homie-lime font-semibold text-sm hover:underline">Browse full menu →</Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* LOYALTY TAB */}
        {tab === 'loyalty' && (
          <div className="space-y-6">

            {/* Points card */}
            <div className="bg-homie-green text-white rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #7CB518 0%, transparent 60%)' }} />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-green-300 text-sm mb-1">Your Points Balance</p>
                    <p className="font-display text-5xl font-bold">{userPoints.toLocaleString()}</p>
                    <p className="text-green-200 text-sm mt-1">points</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-bold ${currentTier.color}`}>
                    {currentTier.emoji} {currentTier.name}
                  </div>
                </div>
                {nextTier ? (
                  <div>
                    <div className="flex justify-between text-xs text-green-300 mb-1">
                      <span>{currentTier.name}</span>
                      <span>{nextTier.minPoints - userPoints} pts to {nextTier.emoji} {nextTier.name}</span>
                    </div>
                    <div className="bg-white/20 rounded-full h-2">
                      <div className="bg-homie-lime h-2 rounded-full transition-all duration-500" style={{ width: `${tierProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <p className="text-homie-lime font-semibold text-sm">🎉 You&apos;ve reached the highest tier!</p>
                )}
              </div>
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
                    <div key={e.label} className="text-center p-4 bg-gray-50 rounded-xl">
                      <div className="text-2xl mb-1">{e.icon}</div>
                      <div className="font-bold text-homie-lime text-sm">{e.value}</div>
                      <div className="text-xs text-homie-gray mt-0.5">{e.label}</div>
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
                    <div key={tier.name} className={`rounded-2xl p-5 border-2 transition-all ${currentTier.name === tier.name ? 'border-homie-lime shadow-lg shadow-lime-100' : 'border-gray-100 bg-white'}`}>
                      <div className="text-3xl mb-2">{tier.emoji}</div>
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${tier.color}`}>{tier.name}</div>
                      <div className="text-xs text-homie-gray mb-3">{tier.minPoints === 0 ? 'Starting tier' : `From ${tier.minPoints} points`}</div>
                      <ul className="space-y-1.5">
                        {tier.perks.map(perk => (
                          <li key={perk} className="text-sm text-homie-dark flex items-start gap-2">
                            <span className="text-homie-lime mt-0.5">✓</span> {perk}
                          </li>
                        ))}
                      </ul>
                      {currentTier.name === tier.name && (
                        <div className="mt-3 text-xs font-semibold text-homie-lime">← Your current tier</div>
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
            <Card className="border-gray-100">
              <CardHeader><CardTitle>Account Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-homie-dark mb-1">Name</label>
                  <Input
                    defaultValue={profile?.full_name || user?.user_metadata?.full_name || ''}
                    onBlur={e => { const v = e.target.value.trim(); if (v) updateProfileInfo({ full_name: v }) }}
                    placeholder="Your name"
                    className="border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-homie-dark mb-1">Email</label>
                  <Input value={user?.email || ''} disabled className="bg-gray-50 border-gray-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-homie-dark mb-1">Phone</label>
                  <Input
                    defaultValue={profile?.phone || user?.user_metadata?.phone || ''}
                    onBlur={e => updateProfileInfo({ phone: e.target.value.trim() })}
                    placeholder="+66 XX XXX XXXX"
                    className="border-gray-200"
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-100">
              <CardHeader><CardTitle>Saved Addresses</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-homie-gray mb-4">Use these addresses at checkout for faster ordering</p>
                {(profile?.saved_addresses ?? []).length === 0 ? (
                  <p className="text-homie-gray text-sm py-4">No saved addresses yet</p>
                ) : (
                  <div className="space-y-3">
                    {(profile?.saved_addresses ?? []).map((a: { address: string; label?: string }, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin size={16} className="text-homie-lime shrink-0" />
                          <div>
                            <p className="font-medium text-sm text-homie-dark">{a.label || 'Address'}</p>
                            <p className="text-xs text-homie-gray truncate">{a.address}</p>
                          </div>
                        </div>
                        <button onClick={() => removeAddress(i)} className="text-red-500 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-homie-dark mb-2">Add new address</label>
                  <Input
                    placeholder="Address label (e.g. Home, Office)"
                    value={newAddressLabel}
                    onChange={e => setNewAddressLabel(e.target.value)}
                    className="mb-2 border-gray-200"
                  />
                  <Input
                    placeholder="Full delivery address"
                    value={newAddress}
                    onChange={e => setNewAddress(e.target.value)}
                    className="mb-2 border-gray-200"
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
        <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center p-0 md:p-4 bg-black/50">
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full md:max-w-lg max-h-[90vh] md:max-h-[90vh] flex flex-col p-6 space-y-4 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h2 className="font-display text-2xl font-bold text-homie-green">Reorder</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-xl font-bold text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Order Date */}
            <p className="text-sm text-homie-gray">
              Order from {formatDateICT(selectedOrder.created_at)} • ฿{selectedOrder.total}
            </p>

            {/* Items with Quantity Editor - hide items with qty 0 (remove when decreased to zero) */}
            <div className="space-y-3">
              {selectedOrder.items
                .filter((item: any) => (reorderItems[itemKey(item)] ?? item.quantity ?? 1) > 0)
                .map((item: any) => {
                const key = itemKey(item)
                const menuItem = menuItems.find(m => m.id === item.id)
                return (
                <div key={key} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 relative bg-gray-200">
                    {menuItem?.image ? (
                      <Image src={menuItem.image} alt={item.name} fill className="object-cover" sizes="56px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-homie-dark">{item.name}</p>
                    <p className="text-xs text-homie-gray">฿{item.price} • {item.portion || 'lean'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReorderItems(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? item.quantity ?? 1) - 1) }))}
                      className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-homie-green font-bold hover:bg-gray-50"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={reorderItems[key] ?? item.quantity ?? 1}
                      onChange={e => setReorderItems(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                      className="w-12 text-center border border-gray-200 rounded-lg font-bold"
                      min="0"
                    />
                    <button
                      onClick={() => setReorderItems(prev => ({ ...prev, [key]: (prev[key] ?? item.quantity ?? 1) + 1 }))}
                      className="w-8 h-8 rounded-lg bg-homie-lime text-white font-bold hover:bg-lime-500"
                    >
                      +
                    </button>
                  </div>
                </div>
              )})}
            </div>

            {/* Total Price Preview */}
            <div className="p-4 bg-homie-green/10 rounded-xl">
              <p className="text-sm text-homie-gray mb-1">Estimated Total</p>
              <p className="text-2xl font-bold text-homie-green">
                ฿{(Object.entries(reorderItems).reduce((sum, [key, qty]) => {
                  const [id, portion] = key.includes('_') ? key.split('_') : [key, 'lean']
                  const item = selectedOrder.items.find((i: any) => (i.id === id) && ((i.portion || 'lean') === portion))
                  return sum + (item?.price ?? 0) * qty
                }, 0)).toFixed(2)}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 px-4 py-3 rounded-xl font-semibold text-homie-green border-2 border-homie-green hover:bg-green-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReorder}
                className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-homie-lime hover:bg-lime-500 transition-colors"
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

