'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
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
  Apple,
  ShoppingBag,
  Target,
  LogOut,
  Flame,
  Dumbbell,
  UtensilsCrossed,
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

// METs formula: calories = METs * weight(kg) * duration(hours)
// Default 70kg; METs: Walking 3, Running 10, Cycling 8, Gym 5, Yoga 3, Swimming 8, HIIT 8
const EXERCISE_METS: Record<string, number> = {
  Walking: 3,
  Running: 10,
  Cycling: 8,
  Swimming: 8,
  Gym: 5,
  Yoga: 3,
  HIIT: 8,
  Dancing: 5,
  Hiking: 6,
  Sports: 7,
  Other: 4,
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
  const [tab, setTab] = useState<'overview' | 'tracker' | 'exercise' | 'recommendations'>('overview')

  const today = new Date().toISOString().split('T')[0]

  const fetchData = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) {
      router.replace('/signin')
      return
    }
    setUser(u)

    const [profileRes, ordersRes, goalsRes, logsRes, exRes] = await Promise.allSettled([
      supabase.from('profiles').select('full_name, loyalty_points, points, daily_calorie_goal, weekly_calorie_goal').eq('id', u.id).single(),
      supabase.from('orders').select('*').eq('user_id', u.id).order('created_at', { ascending: false }),
      supabase.from('user_goals').select('calorie_target, weekly_calorie_goal').eq('user_id', u.id).maybeSingle(),
      supabase.from('calorie_logs').select('*').eq('user_id', u.id).order('log_date', { ascending: false }).limit(14),
      supabase.from('exercise_logs').select('*').eq('user_id', u.id).gte('log_date', getWeekStart()).order('log_date', { ascending: false }),
    ])

    const p = profileRes.status === 'fulfilled' ? profileRes.value.data : null
    const pts = (p as any)?.points ?? (p as any)?.loyalty_points ?? 0
    setProfile({
      full_name: (p as any)?.full_name ?? u.user_metadata?.full_name ?? null,
      points: pts,
    })

    const daily = (p as any)?.daily_calorie_goal ?? 2000
    const weekly = (p as any)?.weekly_calorie_goal ?? 14000
    const g = goalsRes.status === 'fulfilled' ? goalsRes.value.data : null
    setDailyGoal(g?.calorie_target ?? (p as any)?.daily_calorie_goal ?? daily)
    setWeeklyGoal(g?.weekly_calorie_goal ?? (p as any)?.weekly_calorie_goal ?? weekly)

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

  // Compute today's consumed from orders + aggregate from calorie_logs
  useEffect(() => {
    const ordersToday = orders.filter(o => new Date(o.created_at).toISOString().split('T')[0] === today)
    const consumedFromOrders = ordersToday.reduce((s, o) => s + getNutritionFromOrder(o), 0)
    const todayLog = logs.find(l => l.log_date === today)
    const consumed = todayLog?.calories_consumed ?? consumedFromOrders
    const burned = todayLog?.calories_burned ?? exercises.filter(e => e.log_date === today).reduce((s, e) => s + (e.calories_burned || 0), 0)
    setTodayCalories(consumed)
    setBurnedCalories(burned)
  }, [orders, logs, exercises, today])

  // Recommendations: meals that fit remaining calories
  useEffect(() => {
    const remaining = dailyGoal - todayCalories + burnedCalories
    const recs = menuItems
      .filter(m => m.leanCalories <= remaining * 1.2)
      .slice(0, 6)
    setRecommendations(recs)
  }, [dailyGoal, todayCalories, burnedCalories])

  const updateGoals = async () => {
    if (!user) return
    await supabase.from('profiles').update({
      daily_calorie_goal: dailyGoal,
      weekly_calorie_goal: weeklyGoal,
    }).eq('id', user.id)
    await supabase.from('user_goals').upsert({
      user_id: user.id,
      calorie_target: dailyGoal,
      weekly_calorie_goal: weeklyGoal,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    fetchData()
  }

  const logExercise = async () => {
    const duration = parseInt(exDuration) || 0
    if (!user || duration <= 0) return
    const burned = calcBurned(exName, duration)
    await supabase.from('exercise_logs').insert({
      user_id: user.id,
      log_date: today,
      activity_type: exName,
      duration_minutes: duration,
      calories_burned: burned,
    })
    await supabase.from('calorie_logs').upsert({
      user_id: user.id,
      log_date: today,
      calories_consumed: todayCalories,
      calories_burned: burnedCalories + burned,
    }, { onConflict: 'user_id,log_date' })
    setExDuration('')
    fetchData()
  }

  const logMeal = async (meal: MenuItem, cal: number) => {
    if (!user) return
    const newConsumed = todayCalories + cal
    const { error } = await supabase.from('calorie_logs').upsert({
      user_id: user.id,
      log_date: today,
      calories_consumed: newConsumed,
      calories_burned: burnedCalories,
    }, { onConflict: 'user_id,log_date' })
    if (!error) {
      setTodayCalories(newConsumed)
      fetchData()
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

  // Weekly chart data (last 7 days)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dayOrders = orders.filter(o => new Date(o.created_at).toISOString().split('T')[0] === dateStr)
    const dayLog = logs.find(l => l.log_date === dateStr)
    const consumed = dayLog?.calories_consumed ?? dayOrders.reduce((s, o) => s + getNutritionFromOrder(o), 0)
    return {
      day: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      consumed: Math.round(consumed),
      goal: dailyGoal,
    }
  })

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { key: 'tracker' as const, label: 'Tracker', icon: <Flame size={18} /> },
    { key: 'exercise' as const, label: 'Exercise', icon: <Dumbbell size={18} /> },
    { key: 'recommendations' as const, label: 'Recommend', icon: <UtensilsCrossed size={18} /> },
  ]

  return (
    <div className="min-h-screen bg-homie-cream">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-homie-green">Hi, {firstName} 👋</h1>
            <p className="text-homie-gray text-sm">{profile?.points ?? 0} loyalty pts</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut size={16} /> Logout
          </Button>
        </div>

        <div className="flex gap-1 p-1 bg-white rounded-xl shadow-sm mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-homie-green text-white' : 'text-homie-gray hover:bg-gray-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Calorie Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-homie-dark mb-1">Daily Goal (kcal)</label>
                  <Input
                    type="number"
                    value={dailyGoal}
                    onChange={e => setDailyGoal(+e.target.value)}
                    placeholder="2000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-homie-dark mb-1">Weekly Goal (kcal)</label>
                  <Input
                    type="number"
                    value={weeklyGoal}
                    onChange={e => setWeeklyGoal(+e.target.value)}
                    placeholder="14000"
                  />
                </div>
                <Button onClick={updateGoals}>Save Goals</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s Tracker</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-homie-dark font-medium">Consumed: {todayCalories} / {dailyGoal} kcal</p>
                <p className="text-homie-gray text-sm">Burned: {burnedCalories} kcal</p>
                <p className="text-homie-lime font-semibold mt-2">Remaining: {remaining} kcal</p>
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-homie-lime rounded-full transition-all"
                    style={{ width: `${Math.min(100, (todayCalories / dailyGoal) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Weekly Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        formatter={(value) => [`${value ?? 0} kcal`, 'Consumed']}
                        labelFormatter={(label) => `Day: ${label}`}
                      />
                      <Bar dataKey="consumed" fill="#7CB518" radius={[4, 4, 0, 0]} name="Consumed" />
                      <Bar dataKey="goal" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="Goal" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-homie-gray text-sm">No orders yet. <Link href="/order" className="text-homie-lime hover:underline">Order now</Link></p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Calories</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.slice(0, 5).map(o => (
                        <TableRow key={o.id}>
                          <TableCell>{new Date(o.created_at).toLocaleDateString('en-GB')}</TableCell>
                          <TableCell>฿{o.total}</TableCell>
                          <TableCell>{Math.round(getNutritionFromOrder(o))} kcal</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'tracker' && (
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Calorie Tracker</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-4 bg-homie-cream rounded-xl">
                  <p className="text-2xl font-bold text-homie-green">{todayCalories}</p>
                  <p className="text-xs text-homie-gray">Consumed</p>
                </div>
                <div className="text-center p-4 bg-homie-cream rounded-xl">
                  <p className="text-2xl font-bold text-homie-green">{burnedCalories}</p>
                  <p className="text-xs text-homie-gray">Burned</p>
                </div>
                <div className="text-center p-4 bg-homie-cream rounded-xl">
                  <p className="text-2xl font-bold text-homie-lime">{remaining}</p>
                  <p className="text-xs text-homie-gray">Remaining</p>
                </div>
                <div className="text-center p-4 bg-homie-cream rounded-xl">
                  <p className="text-2xl font-bold text-homie-green">{dailyGoal}</p>
                  <p className="text-xs text-homie-gray">Daily Goal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === 'exercise' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Log Exercise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Activity</label>
                  <select
                    value={exName}
                    onChange={e => setExName(e.target.value)}
                    className="w-full h-10 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime"
                  >
                    {Object.keys(EXERCISE_METS).map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (min)</label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={exDuration}
                    onChange={e => setExDuration(e.target.value)}
                  />
                </div>
                <Button onClick={logExercise} disabled={!exDuration}>
                  Log Exercise
                </Button>
                <p className="text-xs text-homie-gray">
                  Calories burned estimated via METs formula (≈{exDuration ? calcBurned(exName, parseInt(exDuration) || 0) : 0} kcal for {exDuration || 0} min)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s Workouts</CardTitle>
              </CardHeader>
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
                      <TableRow>
                        <TableCell colSpan={3} className="text-homie-gray text-center py-8">No workouts logged today</TableCell>
                      </TableRow>
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

        {tab === 'recommendations' && (
          <Card>
            <CardHeader>
              <CardTitle>Recommended Menus</CardTitle>
              <p className="text-sm text-homie-gray mt-1">Meals that fit your remaining {remaining} kcal</p>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <p className="text-homie-gray">You&apos;ve hit your goal! Or lower your intake to see suggestions.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {recommendations.map(meal => (
                    <div key={meal.id} className="flex justify-between items-center p-4 bg-homie-cream rounded-xl">
                      <div>
                        <p className="font-semibold text-homie-dark">{meal.name}</p>
                        <p className="text-sm text-homie-gray">Lean: {meal.leanCalories} kcal · Bulk: {meal.bulkCalories} kcal</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => logMeal(meal, meal.leanCalories)}>
                          Add Lean
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => logMeal(meal, meal.bulkCalories)}>
                          Add Bulk
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/menu" className="inline-block mt-4 text-homie-lime font-semibold text-sm hover:underline">
                Browse full menu →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
