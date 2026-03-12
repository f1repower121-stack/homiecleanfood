'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { menuItems, type MenuItem } from '@/lib/menuData'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  ShoppingBag,
  LogOut,
  Flame,
  Dumbbell,
  UtensilsCrossed,
  Star,
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
  { name: 'Homie', minPoints: 0, color: 'bg-gray-100 text-gray-600', emoji: '🌱', perks: ['1 point per ฿10 spent', 'Birthday bonus 50 pts', 'Member-only deals'] },
  { name: 'Clean Eater', minPoints: 200, color: 'bg-lime-100 text-lime-700', emoji: '🥗', perks: ['1.5x points multiplier', 'Free delivery on orders ฿500+', 'Early menu access'] },
  { name: 'Protein King', minPoints: 500, color: 'bg-green-100 text-green-700', emoji: '💪', perks: ['2x points multiplier', 'Free meal every 10 orders', 'Priority delivery', 'Exclusive monthly box'] },
]

const REWARDS = [
  { name: 'Free Drink', points: 100, emoji: '🥤', desc: 'Any drink from our menu' },
  { name: '฿50 Discount', points: 150, emoji: '💰', desc: 'Off your next order' },
  { name: 'Free Lean Meal', points: 300, emoji: '🍱', desc: 'Any chicken lean meal' },
  { name: 'Free Bulk Meal', points: 400, emoji: '💪', desc: 'Any meal, any protein' },
  { name: '฿200 Credit', points: 500, emoji: '🎁', desc: 'Credit added to account' },
  { name: 'VIP Box', points: 1000, emoji: '👑', desc: '5-meal weekly box, free delivery' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [dailyGoal, setDailyGoal] = useState(2000)
  const [weeklyGoal, setWeeklyGoal] = useState(14000)
  const [logs, setLogs] = useState<CalorieLog[]>([])
  const [exercises, setExercises] = useState<ExerciseLog[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [profile, setProfile] = useState<{ full_name: string | null; points: number } | null>(null)
  const [todayCalories, setTodayCalories] = useState(0)
  const [burnedCalories, setBurnedCalories] = useState(0)
  const [recommendations, setRecommendations] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [exName, setExName] = useState('Walking')
  const [exDuration, setExDuration] = useState('')
  const [tab, setTab] = useState<'overview' | 'tracker' | 'exercise' | 'recommendations' | 'loyalty'>('overview')
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null)
  const [redeemLoading, setRedeemLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const u = session?.user
    if (!u) {
      router.replace('/signin')
      return
    }
    setUser(u)

    const [profileRes, ordersRes, goalsRes, logsRes, exRes] = await Promise.allSettled([
      supabase.from('profiles').select('full_name, points, daily_calorie_goal, weekly_calorie_goal').eq('id', u.id).single(),
      supabase.from('orders').select('*').eq('user_id', u.id).order('created_at', { ascending: false }),
      supabase.from('user_goals').select('calorie_target, weekly_calorie_goal').eq('user_id', u.id).maybeSingle(),
      supabase.from('calorie_logs').select('*').eq('user_id', u.id).order('log_date', { ascending: false }).limit(14),
      supabase.from('exercise_logs').select('*').eq('user_id', u.id).gte('log_date', getWeekStart()).order('log_date', { ascending: false }),
    ])

    const p = profileRes.status === 'fulfilled' ? profileRes.value.data : null
    const pts = (p as any)?.points ?? 0
    setProfile({
      full_name: (p as any)?.full_name ?? u.user_metadata?.full_name ?? null,
      points: pts,
    })

    const daily = (p as any)?.daily_calorie_goal ?? 2000
    const weekly = (p as any)?.weekly_calorie_goal ?? 14000
    const g = goalsRes.status === 'fulfilled' ? goalsRes.value.data : null
    setDailyGoal(g?.calorie_target ?? daily)
    setWeeklyGoal(g?.weekly_calorie_goal ?? weekly)
    setOrders((ordersRes.status === 'fulfilled' ? ordersRes.value.data : null) as Order[] || [])
    setLogs((logsRes.status === 'fulfilled' ? logsRes.value.data : null) as CalorieLog[] || [])
    setExercises((exRes.status === 'fulfilled' ? exRes.value.data : null) as ExerciseLog[] || [])
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
    const ordersToday = orders.filter(o => new Date(o.created_at).toISOString().split('T')[0] === today)
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

  const handleRedeem = async (reward: typeof REWARDS[0]) => {
    if (!user || !profile) return
    if (profile.points < reward.points) {
      setRedeemMsg(`❌ Not enough points. You need ${reward.points - profile.points} more points.`)
      setTimeout(() => setRedeemMsg(null), 3000)
      return
    }
    setRedeemLoading(true)
    try {
      // Deduct points
      await supabase.rpc('add_points', { user_id: user.id, points_to_add: -reward.points })
      // Log redemption in orders as a note
      await supabase.from('orders').insert({
        user_id: user.id,
        items: [],
        total: 0,
        status: 'redeemed',
        notes: `Redeemed: ${reward.name} (${reward.points} pts)`,
        customer_name: profile.full_name || '',
        payment_method: 'points',
      })
      setRedeemMsg(`✅ ${reward.emoji} "${reward.name}" redeemed! We'll apply it to your next order.`)
      fetchData()
    } catch {
      setRedeemMsg('❌ Something went wrong. Please try again.')
    } finally {
      setRedeemLoading(false)
      setTimeout(() => setRedeemMsg(null), 5000)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/signin')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-homie-cream">
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
    const dateStr = d.toISOString().split('T')[0]
    const dayOrders = orders.filter(o => new Date(o.created_at).toISOString().split('T')[0] === dateStr)
    const dayLog = logs.find(l => l.log_date === dateStr)
    const consumed = dayLog?.calories_consumed ?? dayOrders.reduce((s, o) => s + getNutritionFromOrder(o), 0)
    return { day: d.toLocaleDateString('en-GB', { weekday: 'short' }), consumed: Math.round(consumed), goal: dailyGoal }
  })

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { key: 'tracker' as const, label: 'Tracker', icon: <Flame size={18} /> },
    { key: 'exercise' as const, label: 'Exercise', icon: <Dumbbell size={18} /> },
    { key: 'recommendations' as const, label: 'Recommend', icon: <UtensilsCrossed size={18} /> },
    { key: 'loyalty' as const, label: 'Loyalty', icon: <Star size={18} /> },
  ]

  return (
    <div className="min-h-screen bg-homie-cream">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-homie-green">Hi, {firstName} 👋</h1>
            <p className="text-homie-gray text-sm">
              <span className="text-yellow-500 font-semibold">{userPoints} pts</span>
              {' · '}{currentTier.emoji} {currentTier.name}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut size={16} /> Logout
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white rounded-xl shadow-sm mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.key ? 'bg-homie-green text-white' : 'text-homie-gray hover:bg-gray-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
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

            <Card>
              <CardHeader><CardTitle>Today&apos;s Tracker</CardTitle></CardHeader>
              <CardContent>
                <p className="text-homie-dark font-medium">Consumed: {todayCalories} / {dailyGoal} kcal</p>
                <p className="text-homie-gray text-sm">Burned: {burnedCalories} kcal</p>
                <p className="text-homie-lime font-semibold mt-2">Remaining: {remaining} kcal</p>
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-homie-lime rounded-full transition-all" style={{ width: `${Math.min(100, (todayCalories / dailyGoal) * 100)}%` }} />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
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

            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
              <CardContent>
                {orders.filter(o => o.status !== 'redeemed').length === 0 ? (
                  <p className="text-homie-gray text-sm">No orders yet. <Link href="/menu" className="text-homie-lime hover:underline">Order now</Link></p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Calories</TableHead>
                        <TableHead>Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.filter(o => o.status !== 'redeemed').slice(0, 5).map(o => (
                        <TableRow key={o.id}>
                          <TableCell>{new Date(o.created_at).toLocaleDateString('en-GB')}</TableCell>
                          <TableCell>฿{o.total}</TableCell>
                          <TableCell>{Math.round(getNutritionFromOrder(o))} kcal</TableCell>
                          <TableCell className="text-yellow-500 font-medium">+{Math.floor(o.total / 10)} ⭐</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TRACKER TAB */}
        {tab === 'tracker' && (
          <Card>
            <CardHeader><CardTitle>Today&apos;s Calorie Tracker</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[
                  { label: 'Consumed', value: todayCalories, color: 'text-homie-green' },
                  { label: 'Burned', value: burnedCalories, color: 'text-homie-green' },
                  { label: 'Remaining', value: remaining, color: 'text-homie-lime' },
                  { label: 'Daily Goal', value: dailyGoal, color: 'text-homie-green' },
                ].map(s => (
                  <div key={s.label} className="text-center p-4 bg-homie-cream rounded-xl">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-homie-gray">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* EXERCISE TAB */}
        {tab === 'exercise' && (
          <div className="space-y-6">
            <Card>
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
                <p className="text-xs text-homie-gray">≈{exDuration ? calcBurned(exName, parseInt(exDuration) || 0) : 0} kcal burned for {exDuration || 0} min</p>
              </CardContent>
            </Card>
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
          </div>
        )}

        {/* RECOMMENDATIONS TAB */}
        {tab === 'recommendations' && (
          <Card>
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
                    <div key={meal.id} className="flex justify-between items-center p-4 bg-homie-cream rounded-xl">
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
        )}

        {/* LOYALTY TAB */}
        {tab === 'loyalty' && (
          <div className="space-y-6">

            {/* Redeem message */}
            {redeemMsg && (
              <div className={`p-4 rounded-xl text-sm font-medium ${redeemMsg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                {redeemMsg}
              </div>
            )}

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
                    { icon: '🛒', label: 'Every Order', value: '1 pt / ฿10' },
                    { icon: '👤', label: 'First Order', value: '+50 pts' },
                    { icon: '🎂', label: 'Birthday', value: '+50 pts' },
                    { icon: '📣', label: 'Refer a Friend', value: '+100 pts' },
                  ].map(e => (
                    <div key={e.label} className="text-center p-4 bg-homie-cream rounded-xl">
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

            {/* Redeem rewards */}
            <Card>
              <CardHeader>
                <CardTitle>Redeem Rewards</CardTitle>
                <p className="text-sm text-homie-gray mt-1">You have <span className="font-bold text-yellow-500">{userPoints} pts</span> to spend</p>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {REWARDS.map(r => (
                    <div key={r.name} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${userPoints >= r.points ? 'border-gray-100 bg-white' : 'border-gray-50 bg-gray-50 opacity-60'}`}>
                      <div className="text-3xl">{r.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-homie-dark">{r.name}</div>
                        <div className="text-xs text-homie-gray">{r.desc}</div>
                        <div className="text-xs font-bold text-homie-lime mt-1">{r.points} pts</div>
                      </div>
                      <button
                        onClick={() => handleRedeem(r)}
                        disabled={userPoints < r.points || redeemLoading}
                        className="px-3 py-2 rounded-xl text-xs font-bold transition-colors bg-homie-lime text-white hover:bg-homie-green disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {redeemLoading ? '...' : 'Redeem'}
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Redemption history */}
            {orders.filter(o => o.status === 'redeemed').length > 0 && (
              <Card>
                <CardHeader><CardTitle>Redemption History</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {orders.filter(o => o.status === 'redeemed').map(o => (
                      <div key={o.id} className="flex justify-between items-center text-sm p-3 bg-homie-cream rounded-xl">
                        <span className="text-homie-dark">{o.notes?.replace('Redeemed: ', '') || 'Reward redeemed'}</span>
                        <span className="text-homie-gray text-xs">{new Date(o.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

