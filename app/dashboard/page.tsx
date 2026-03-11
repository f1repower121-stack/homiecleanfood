'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { menuItems } from '@/lib/menuData'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Apple, ShoppingBag, Target, LogOut } from 'lucide-react'

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

interface Profile {
  full_name: string | null
  points: number
  tier: string
}

type Tab = 'overview' | 'nutrition' | 'orders' | 'goals'

const TIERS = [
  { name: 'Homie', minPoints: 0, emoji: '🌱' },
  { name: 'Clean Eater', minPoints: 200, emoji: '🥗' },
  { name: 'Protein King', minPoints: 500, emoji: '💪' },
]

function getNutritionFromOrder(order: Order) {
  let calories = 0
  let protein = 0
  let carbs = 0
  let fat = 0
  if (!Array.isArray(order.items)) return { calories, protein, carbs, fat }
  for (const item of order.items) {
    const menuItem = menuItems.find(m => m.id === item.id)
    if (!menuItem) continue
    const qty = item.quantity || 1
    const portion = item.portion || 'lean'
    const isBulk = portion === 'bulk'
    calories += (isBulk ? menuItem.bulkCalories : menuItem.leanCalories) * qty
    protein += (isBulk ? menuItem.bulkProtein : menuItem.leanProtein) * qty
    carbs += (isBulk ? menuItem.bulkCarb : menuItem.leanCarb) * qty
    fat += (isBulk ? menuItem.bulkFat : menuItem.leanFat) * qty
  }
  return { calories, protein, carbs, fat }
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')

  const fetchData = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) {
      router.replace('/signin')
      return
    }
    setUser(u)

    const [profileRes, ordersRes] = await Promise.all([
      supabase.from('profiles').select('full_name, points, tier').eq('id', u.id).single(),
      supabase.from('orders').select('*').eq('user_id', u.id).order('created_at', { ascending: false }),
    ])

    const p = profileRes.data as Profile | null
    setProfile({
      full_name: p?.full_name ?? u.user_metadata?.full_name ?? null,
      points: p?.points ?? 0,
      tier: p?.tier ?? 'Homie',
    })

    setOrders((ordersRes.data as Order[]) || [])
  }, [router])

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

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

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Customer'
  const firstName = displayName.split(' ')[0]
  const points = profile?.points ?? 0
  const tierInfo = TIERS.find(t => t.name === profile?.tier) || TIERS[0]

  const totalNutrition = orders.reduce(
    (acc, o) => {
      const n = getNutritionFromOrder(o)
      return {
        calories: acc.calories + n.calories,
        protein: acc.protein + n.protein,
        carbs: acc.carbs + n.carbs,
        fat: acc.fat + n.fat,
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { key: 'nutrition', label: 'Nutrition', icon: <Apple size={18} /> },
    { key: 'orders', label: 'Orders', icon: <ShoppingBag size={18} /> },
    { key: 'goals', label: 'Goals', icon: <Target size={18} /> },
  ]

  return (
    <div className="min-h-screen bg-homie-cream">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-homie-green">
              Hi, {firstName} 👋
            </h1>
            <p className="text-homie-gray text-sm mt-0.5">
              {tierInfo.emoji} {profile?.tier} · {points.toLocaleString()} pts
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-homie-gray hover:text-homie-green"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        <div className="flex gap-1 p-1 bg-white rounded-xl shadow-sm mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key ? 'bg-homie-green text-white' : 'text-homie-gray hover:bg-gray-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-sm text-homie-gray">Points</p>
                <p className="text-2xl font-bold text-homie-green">{points.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-sm text-homie-gray">Orders</p>
                <p className="text-2xl font-bold text-homie-green">{orders.length}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-semibold text-homie-green mb-3">Nutrition Summary (All Orders)</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-homie-lime">{Math.round(totalNutrition.calories).toLocaleString()}</p>
                  <p className="text-xs text-homie-gray">Calories</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-homie-lime">{Math.round(totalNutrition.protein)}g</p>
                  <p className="text-xs text-homie-gray">Protein</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-homie-lime">{Math.round(totalNutrition.carbs)}g</p>
                  <p className="text-xs text-homie-gray">Carbs</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-homie-lime">{Math.round(totalNutrition.fat)}g</p>
                  <p className="text-xs text-homie-gray">Fat</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'nutrition' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold text-homie-green mb-4">Total Nutrition</h2>
            <p className="text-sm text-homie-gray mb-6">From all your orders (calculated from menu macros)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-homie-cream rounded-xl">
                <p className="text-3xl font-bold text-homie-green">{Math.round(totalNutrition.calories).toLocaleString()}</p>
                <p className="text-sm text-homie-gray mt-1">Calories (kcal)</p>
              </div>
              <div className="text-center p-4 bg-homie-cream rounded-xl">
                <p className="text-3xl font-bold text-homie-green">{Math.round(totalNutrition.protein)}</p>
                <p className="text-sm text-homie-gray mt-1">Protein (g)</p>
              </div>
              <div className="text-center p-4 bg-homie-cream rounded-xl">
                <p className="text-3xl font-bold text-homie-green">{Math.round(totalNutrition.carbs)}</p>
                <p className="text-sm text-homie-gray mt-1">Carbs (g)</p>
              </div>
              <div className="text-center p-4 bg-homie-cream rounded-xl">
                <p className="text-3xl font-bold text-homie-green">{Math.round(totalNutrition.fat)}</p>
                <p className="text-sm text-homie-gray mt-1">Fat (g)</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-homie-gray">
                <ShoppingBag size={48} className="mx-auto mb-3 text-gray-200" />
                <p className="font-medium">No orders yet</p>
                <p className="text-sm mt-1">Place an order while logged in to see it here</p>
                <Link href="/order" className="inline-block mt-4 btn-primary">Order Now</Link>
              </div>
            ) : (
              orders.map(order => {
                const n = getNutritionFromOrder(order)
                return (
                  <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-homie-dark">
                          ฿{order.total} · {new Date(order.created_at).toLocaleDateString('en-GB')}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'cancelled' ? 'bg-gray-100 text-gray-600' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-homie-gray flex flex-wrap gap-3">
                      <span>{Math.round(n.calories)} cal</span>
                      <span>{Math.round(n.protein)}g protein</span>
                      <span>{Math.round(n.carbs)}g carbs</span>
                      <span>{Math.round(n.fat)}g fat</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === 'goals' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold text-homie-green mb-4">Loyalty Goals</h2>
            <p className="text-sm text-homie-gray mb-6">Earn points to unlock higher tiers</p>
            <div className="space-y-4">
              {TIERS.map(t => {
                const nextTier = TIERS.find(x => x.minPoints > t.minPoints)
                const progress = nextTier
                  ? Math.min(100, ((points - t.minPoints) / (nextTier.minPoints - t.minPoints)) * 100)
                  : 100
                return (
                  <div
                    key={t.name}
                    className={`p-4 rounded-xl border-2 ${
                      t.name === profile?.tier ? 'border-homie-lime bg-lime-50' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">{t.emoji} {t.name}</span>
                      {t.name === profile?.tier && (
                        <span className="text-xs bg-homie-lime text-white px-2 py-0.5 rounded-full">Current</span>
                      )}
                    </div>
                    {nextTier && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-homie-gray mb-1">
                          <span>{t.minPoints} pts</span>
                          <span>{nextTier.minPoints - points} pts to {nextTier.name}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-homie-lime rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <Link href="/loyalty" className="inline-block mt-6 text-homie-lime font-semibold text-sm hover:underline">
              View all rewards →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
