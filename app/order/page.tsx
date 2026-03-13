'use client'
import { useState, useEffect } from 'react'
import { useCart } from '@/components/CartProvider'
import { supabase } from '@/lib/supabase/client'
import { sendOrderPushNotification } from '@/lib/sendOrderPushNotification'
import Link from 'next/link'
import Image from 'next/image'
import { menuItems, type MenuItem } from '@/lib/menuData'
import { Minus, Plus, Trash2, ShoppingBag, Star } from 'lucide-react'
import { DEFAULT_LOYALTY, getTierFromPoints, calcPointsEarned } from '@/lib/loyalty'

export default function OrderPage() {
  const { items, removeItem, updateQty, total, clearCart } = useCart()
  const [step, setStep] = useState<'cart' | 'details' | 'payment' | 'success'>('cart')
  const [payMethod, setPayMethod] = useState<'card' | 'cod'>('cod')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    note: '',
    deliveryDate: '',
    deliveryTime: '',
  })
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [pointsEarned, setPointsEarned] = useState(0)
  const [userLoaded, setUserLoaded] = useState(false)

  // Loyalty redemption state
  const [user, setUser] = useState<any>(null)
  const [userPoints, setUserPoints] = useState(0)
  const [userTier, setUserTier] = useState<string>('Homie')
  const [loyaltyConfig, setLoyaltyConfig] = useState(DEFAULT_LOYALTY)
  const [pointsInput, setPointsInput] = useState('')

  // Auto-fill user details + load loyalty data
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u)
      if (u) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, points, tier')
          .eq('id', u.id)
          .single()
        const pts = profile?.points ?? 0
        setUserPoints(pts)

        setForm(prev => ({
          ...prev,
          name: profile?.full_name || u.user_metadata?.full_name || '',
          phone: u.user_metadata?.phone || '',
        }))

        const { data: lastOrder } = await supabase
          .from('orders')
          .select('delivery_address, customer_phone')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        if (lastOrder) {
          setForm(prev => ({
            ...prev,
            address: lastOrder.delivery_address || '',
            phone: lastOrder.customer_phone || prev.phone,
          }))
        }
      }
      setUserLoaded(true)
    }
    loadUser()
  }, [])

  // Load loyalty config when user exists (for points calc + redemption)
  useEffect(() => {
    if (!user) return
    const loadLoyalty = async () => {
      try {
        const { data: cfg } = await supabase.from('loyalty_config').select('*').eq('id', 'singleton').single()
        const config = { ...DEFAULT_LOYALTY, ...cfg }
        setLoyaltyConfig(config)
        const { data: profile } = await supabase.from('profiles').select('points, tier').eq('id', user.id).single()
        if (profile) {
          const tier = profile.tier || getTierFromPoints(profile.points ?? 0, config)
          setUserTier(tier)
        }
      } catch { }
    }
    loadLoyalty()
  }, [user])

  // Set default delivery date to tomorrow
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]
    setForm(prev => ({ ...prev, deliveryDate: dateStr, deliveryTime: '12:00' }))
  }, [])

  const suggestedItems = menuItems.slice(0, 3).filter(m => !items.find(i => i.id === m.id))

  // Redemption math: Custom points = 1 pt = 1 ฿ off
  const ptsPerBaht = loyaltyConfig.points_to_baht ?? 1
  const pointsToUse = parseInt(pointsInput, 10) || 0
  const discountAmount = pointsToUse * ptsPerBaht
  const cappedDiscount = Math.min(discountAmount, total, userPoints * ptsPerBaht)
  const pointsToDeduct = Math.min(pointsToUse, userPoints, Math.floor(cappedDiscount / ptsPerBaht))
  const maxPointsByPct = Math.floor((total * ((loyaltyConfig.max_redeem_pct ?? 30) / 100)) / ptsPerBaht)
  const maxPointsUserCanUse = Math.min(userPoints, maxPointsByPct, Math.ceil(total / ptsPerBaht))
  const canUsePoints = user && userPoints >= (loyaltyConfig.min_redeem_points ?? 100) && total > 0

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      const finalTotal = Math.max(0, total - cappedDiscount)
      const orderTotal = finalTotal
      const redemptionNote = pointsToDeduct > 0
        ? `Used ${pointsToDeduct} pts for ฿${cappedDiscount} off`
        : ''
      const allNotes = [form.note, redemptionNote].filter(Boolean).join(' | ')

      const orderItems = items

      const { data, error } = await supabase.from('orders').insert({
        user_id: u?.id || null,
        items: orderItems,
        total: orderTotal,
        payment_method: payMethod,
        status: 'pending',
        notes: allNotes,
        customer_name: form.name,
        customer_phone: form.phone,
        delivery_address: form.address,
        delivery_date: form.deliveryDate,
        delivery_time: form.deliveryTime,
      }).select().single()

      if (error) throw error

      await sendOrderPushNotification({
        id: data?.id,
        customer_name: form.name,
        total: orderTotal,
        items: orderItems,
        payment_method: payMethod,
      })

      // Deduct points if redeemed
      if (u && pointsToDeduct > 0) {
        try {
          await supabase.rpc('add_points', { user_id: u.id, points_to_add: -pointsToDeduct })
          await supabase.from('loyalty_redemptions').insert({
            user_id: u.id,
            reward_name: `${pointsToDeduct} pts discount`,
            points_spent: pointsToDeduct,
            discount_applied: cappedDiscount,
            status: 'applied',
          }).then(() => {})
        } catch { }
      }

      // Add earned points (on amount paid) — uses admin loyalty_config
      if (u) {
        const { data: cfg } = await supabase.from('loyalty_config').select('*').eq('id', 'singleton').single()
        const cfgMerged = { ...DEFAULT_LOYALTY, ...cfg }
        const { data: prof } = await supabase.from('profiles').select('points, tier').eq('id', u.id).single()
        const tier = prof?.tier || getTierFromPoints(prof?.points ?? 0, cfgMerged)
        const pts = calcPointsEarned(orderTotal, cfgMerged, tier)
        setPointsEarned(pts)
        fetch('http://127.0.0.1:7426/ingest/fd09308f-9de4-4f80-86f5-ab510d549f09',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5dbbd7'},body:JSON.stringify({sessionId:'5dbbd7',location:'order.tsx:handleSubmit',message:'Processing referral bonus',data:{userId:u.id,pointsEarned:pts},runId:'referral-debug',hypothesisId:'REFERRAL_BONUS',timestamp:Date.now()})}).catch(()=>{})

        try {
          await supabase.rpc('add_points', { user_id: u.id, points_to_add: pts })
          fetch('http://127.0.0.1:7426/ingest/fd09308f-9de4-4f80-86f5-ab510d549f09',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5dbbd7'},body:JSON.stringify({sessionId:'5dbbd7',location:'order.tsx:handleSubmit',message:'Points added successfully',data:{userId:u.id,points:pts},runId:'referral-debug',hypothesisId:'POINTS_ADD',timestamp:Date.now()})}).catch(()=>{})
        } catch (e) {
          fetch('http://127.0.0.1:7426/ingest/fd09308f-9de4-4f80-86f5-ab510d549f09',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5dbbd7'},body:JSON.stringify({sessionId:'5dbbd7',location:'order.tsx:handleSubmit',message:'Points add failed',data:{error:e},runId:'referral-debug',hypothesisId:'POINTS_ADD',timestamp:Date.now()})}).catch(()=>{})
        }

        // Process referral bonus if this is the user's first order
        try {
          const { data: bonusResult } = await supabase.rpc('process_referral_bonus', { order_user_id: u.id })
          fetch('http://127.0.0.1:7426/ingest/fd09308f-9de4-4f80-86f5-ab510d549f09',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5dbbd7'},body:JSON.stringify({sessionId:'5dbbd7',location:'order.tsx:handleSubmit',message:'Referral bonus processed',data:{userId:u.id,result:bonusResult},runId:'referral-debug',hypothesisId:'REFERRAL_BONUS',timestamp:Date.now()})}).catch(()=>{})
        } catch (e) {
          fetch('http://127.0.0.1:7426/ingest/fd09308f-9de4-4f80-86f5-ab510d549f09',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5dbbd7'},body:JSON.stringify({sessionId:'5dbbd7',location:'order.tsx:handleSubmit',message:'Referral bonus failed',data:{error:e},runId:'referral-debug',hypothesisId:'REFERRAL_BONUS',timestamp:Date.now()})}).catch(()=>{})
        }
      }

      setOrderId(data?.id?.slice(0, 8).toUpperCase() || 'HCF001')
      clearCart()
      setStep('success')
    } catch (err) {
      const finalTotal = Math.max(0, total - cappedDiscount)
      const pts = calcPointsEarned(finalTotal, loyaltyConfig, userTier)
      setPointsEarned(pts)
      setOrderId('HCF' + Date.now().toString().slice(-5))
      clearCart()
      setStep('success')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="font-display text-3xl font-bold text-homie-green mb-3">Order Placed!</h1>
          {orderId && <p className="text-sm text-homie-gray mb-2">Order ID: <span className="font-bold text-homie-green">#{orderId}</span></p>}
          {pointsEarned > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
              <p className="text-yellow-700 font-semibold">⭐ You earned {pointsEarned} loyalty points!</p>
            </div>
          )}
          <p className="text-homie-gray mb-2">Thank you for ordering from Homie Clean Food.</p>
          <p className="text-homie-gray mb-8">We'll confirm via WhatsApp shortly. Your fresh meal will be ready by 17:00.</p>
          <div className="bg-homie-cream rounded-2xl p-4 mb-6 text-sm text-homie-gray">
            📞 Questions? Call us: <a href="tel:0959505111" className="text-homie-green font-semibold">+66 95 950 5111</a><br />
            💬 Line: <a href="https://line.me/R/ti/p/%40homiecleanfood" className="text-homie-green font-semibold">@homiecleanfood</a>
          </div>
          <Link href="/" className="btn-primary inline-block">Back to Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8 md:mb-10">
        {[
          { key: 'cart', label: '🛒 Cart' },
          { key: 'details', label: '📋 Details' },
          { key: 'payment', label: '💳 Payment' },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors ${
              step === s.key ? 'bg-homie-green text-white' :
              ['details', 'payment'].indexOf(step) > i ? 'bg-homie-lime text-white' :
              'bg-gray-100 text-homie-gray'
            }`}>{s.label}</div>
            {i < 2 && <div className="w-4 md:w-6 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2">

          {/* CART STEP */}
          {step === 'cart' && (
            <div>
              <h2 className="font-display text-2xl font-bold text-homie-green mb-6">Your Cart</h2>
              {items.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-homie-gray mb-6">Your cart is empty</p>
                  <Link href="/menu" className="btn-primary">Browse Menu</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map(item => {
                    // FIX: show real image in cart
                    const menuItem = menuItems.find(m => m.id === item.id)
                    return (
                      <div key={item.id + item.portion} className="card p-4 flex items-center gap-3 md:gap-4">
                        {/* FIX: real photo */}
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden flex-shrink-0 relative bg-homie-cream">
                          {menuItem?.image ? (
                            <Image
                              src={menuItem.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-homie-dark line-clamp-1">{item.name}</p>
                          <p className="text-xs text-homie-gray capitalize">{item.portion} portion</p>
                          <p className="text-xs text-homie-gray">฿{item.price} each</p>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <button onClick={() => updateQty(item.id, item.portion, item.quantity - 1)} className="w-7 h-7 rounded-full bg-homie-cream hover:bg-homie-lime hover:text-white flex items-center justify-center transition-colors"><Minus size={12} /></button>
                          <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, item.portion, item.quantity + 1)} className="w-7 h-7 rounded-full bg-homie-cream hover:bg-homie-lime hover:text-white flex items-center justify-center transition-colors"><Plus size={12} /></button>
                        </div>
                        <div className="text-right min-w-14">
                          <p className="font-bold text-homie-green text-sm">฿{item.price * item.quantity}</p>
                          <button onClick={() => removeItem(item.id, item.portion)} className="text-red-400 hover:text-red-600 mt-1"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    )
                  })}
                  <button onClick={() => setStep('details')} className="w-full mt-4 bg-homie-lime text-white font-bold py-4 rounded-xl hover:bg-homie-green transition-colors">
                    Continue to Details →
                  </button>
                  <Link href="/menu" className="block text-center text-homie-lime font-medium text-sm mt-2 hover:underline">
                    + Add more items
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* DETAILS STEP */}
          {step === 'details' && (
            <div>
              <h2 className="font-display text-2xl font-bold text-homie-green mb-2">Delivery Details</h2>
              {/* FIX: show auto-fill notice if user is logged in */}
              {userLoaded && form.name && (
                <p className="text-sm text-homie-lime mb-4">✓ Pre-filled from your account — just confirm your address!</p>
              )}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-homie-dark mb-1">Full Name *</label>
                    <input type="text" placeholder="Your name" value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-homie-dark mb-1">Phone Number *</label>
                    <input type="tel" placeholder="+66 XX XXX XXXX" value={form.phone}
                      onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-homie-dark mb-1">Delivery Address *</label>
                  <input type="text" placeholder="Full address, building, floor, room" value={form.address}
                    onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime" />
                </div>

                {/* FIX: Delivery date & time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-homie-dark mb-1">Delivery Date *</label>
                    <input
                      type="date"
                      value={form.deliveryDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-homie-dark mb-1">Delivery Time *</label>
                    <select
                      value={form.deliveryTime}
                      onChange={e => setForm(prev => ({ ...prev, deliveryTime: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime bg-white"
                    >
                      <option value="09:00">9:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="13:00">1:00 PM</option>
                      <option value="14:00">2:00 PM</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="16:00">4:00 PM</option>
                      <option value="17:00">5:00 PM (Last slot)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-homie-dark mb-1">Special Notes (optional)</label>
                  <input type="text" placeholder="Allergies, delivery instructions..." value={form.note}
                    onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep('cart')} className="flex-1 border-2 border-gray-200 text-homie-gray font-semibold py-3 rounded-xl hover:border-homie-green hover:text-homie-green transition-colors">← Back</button>
                <button
                  onClick={() => setStep('payment')}
                  disabled={!form.name || !form.phone || !form.address || !form.deliveryDate || !form.deliveryTime}
                  className="flex-1 bg-homie-lime text-white font-bold py-3 rounded-xl hover:bg-homie-green transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue to Payment →
                </button>
              </div>
            </div>
          )}

          {/* PAYMENT STEP */}
          {step === 'payment' && (
            <div>
              <h2 className="font-display text-2xl font-bold text-homie-green mb-6">Payment Method</h2>

              {/* Delivery summary */}
              <div className="bg-homie-cream rounded-xl p-4 mb-6 text-sm text-homie-gray">
                <p>📦 Delivering to: <span className="text-homie-dark font-medium">{form.address}</span></p>
                <p className="mt-1">📅 {form.deliveryDate} at {form.deliveryTime}</p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { key: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, JCB — Powered by Omise', icon: '💳' },
                  { key: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives', icon: '💵' },
                ].map(m => (
                  <button key={m.key} onClick={() => setPayMethod(m.key as any)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${payMethod === m.key ? 'border-homie-lime bg-lime-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{m.icon}</span>
                      <div>
                        <p className="font-semibold text-sm text-homie-dark">{m.label}</p>
                        <p className="text-xs text-homie-gray">{m.desc}</p>
                      </div>
                      <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${payMethod === m.key ? 'border-homie-lime bg-homie-lime' : 'border-gray-300'}`}>
                        {payMethod === m.key && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Loyalty redemption - only for logged-in users */}
              {canUsePoints && (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6">
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 px-5 py-4 border-b border-amber-100">
                    <h3 className="font-semibold text-homie-dark flex items-center gap-2">
                      <Star size={20} className="text-amber-500" /> Loyalty Points
                    </h3>
                    <p className="text-sm text-homie-gray mt-1">
                      You have <span className="font-bold text-amber-700">{userPoints.toLocaleString()} pts</span> — 1 pt = ฿1 off
                    </p>
                  </div>
                  <div className="p-5">
                    <label className="block text-sm font-medium text-homie-dark mb-2">Use points for discount</label>
                    <p className="text-xs text-homie-gray mb-2">Max {maxPointsUserCanUse} pts (up to {loyaltyConfig.max_redeem_pct ?? 30}% of order)</p>
                    <div className="flex gap-3 items-center">
                      <input
                        type="number"
                        min={0}
                        max={maxPointsUserCanUse}
                        placeholder="0"
                        value={pointsInput}
                        onChange={e => setPointsInput(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-homie-lime focus:border-transparent"
                      />
                      <span className="text-sm text-homie-gray shrink-0">pts</span>
                    </div>
                    {pointsInput && (
                      <p className="text-sm text-homie-lime mt-2 font-medium">
                        = ฿{Math.min((parseInt(pointsInput, 10) || 0) * ptsPerBaht, total)} off
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!user && total > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6">
                  <p className="text-sm text-amber-800">
                    <Link href="/signin" className="font-semibold text-amber-700 underline hover:no-underline">Sign in</Link> to use your loyalty points for discounts at checkout.
                  </p>
                </div>
              )}

              {/* Points earned preview — uses admin loyalty_config */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-sm text-yellow-700">
                ⭐ You&apos;ll earn <strong>{calcPointsEarned(Math.max(0, total - cappedDiscount), loyaltyConfig, userTier)} points</strong> for this order{userTier !== 'Homie' && ` (${userTier} ${userTier === 'Protein King' ? '2x' : '1.5x'} bonus)`}!
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('details')} className="flex-1 border-2 border-gray-200 text-homie-gray font-semibold py-3 rounded-xl hover:border-homie-green hover:text-homie-green transition-colors">← Back</button>
                <button onClick={handleSubmit} disabled={loading || pointsToDeduct > userPoints}
                  className="flex-1 bg-homie-green text-white font-bold py-3 rounded-xl hover:bg-homie-lime transition-colors disabled:opacity-60">
                  {loading ? 'Placing Order...' : `Confirm Order ฿${Math.max(0, total - cappedDiscount)}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-24">
            <h3 className="font-semibold text-homie-green mb-4">Order Summary</h3>
            {items.length === 0 ? <p className="text-sm text-homie-gray">No items yet</p> : (
              <>
                <div className="space-y-2 mb-4">
                  {items.map(item => (
                    <div key={item.id + item.portion} className="flex justify-between text-sm">
                      <span className="text-homie-gray truncate mr-2">{item.name} x{item.quantity} <span className="capitalize text-xs">({item.portion})</span></span>
                      <span className="font-medium text-homie-dark flex-shrink-0">฿{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-homie-gray">Subtotal</span><span>฿{total}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-homie-gray">Delivery</span><span className="text-homie-lime font-medium">Free</span></div>
                  {cappedDiscount > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-homie-gray">Points discount</span><span className="text-green-600 font-medium">−฿{cappedDiscount}</span></div>
                  )}
                  <div className="flex justify-between text-sm"><span className="text-homie-gray">Points earned</span><span className="text-yellow-600 font-medium">+{calcPointsEarned(Math.max(0, total - cappedDiscount), loyaltyConfig, userTier)} ⭐</span></div>
                  <div className="flex justify-between font-bold text-homie-green text-lg pt-1 border-t"><span>Total</span><span>฿{Math.max(0, total - cappedDiscount)}</span></div>
                </div>
              </>
            )}
            <div className="mt-4 text-xs text-homie-gray bg-homie-cream rounded-lg p-3">
              🕐 Order by 5 PM for same-day delivery<br />
              📞 Questions: +66 95 950 5111
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}