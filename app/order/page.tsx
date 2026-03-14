'use client'
import { useState, useEffect, useRef } from 'react'
import { useCart } from '@/components/CartProvider'
import { supabase } from '@/lib/supabase/client'
import { sendOrderPushNotification } from '@/lib/sendOrderPushNotification'
import Link from 'next/link'
import Image from 'next/image'
import { menuItems, type MenuItem } from '@/lib/menuData'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { DEFAULT_LOYALTY, getTierFromPoints, calcPointsEarned } from '@/lib/loyalty'
import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'

const PROMPTPAY_PHONE_DEFAULT = '0959505111'

export default function OrderPage() {
  const { items, removeItem, updateQty, total, clearCart } = useCart()
  const [step, setStep] = useState<'cart' | 'details' | 'payment' | 'success'>('cart')
  const [payMethod, setPayMethod] = useState<'promptpay' | 'card' | 'cod'>('cod')
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
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrPaid, setQrPaid] = useState(false)
  const [promptpayPhone, setPromptpayPhone] = useState(PROMPTPAY_PHONE_DEFAULT)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string>('')
  const [slipUploading, setSlipUploading] = useState(false)

  // Loyalty state
  const [user, setUser] = useState<any>(null)
  const [userTier, setUserTier] = useState<string>('Homie')
  const [loyaltyConfig, setLoyaltyConfig] = useState(DEFAULT_LOYALTY)

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

  // Load loyalty config when user exists (for points earned calc)
  useEffect(() => {
    if (!user) return
    const loadLoyalty = async () => {
      try {
        const { data: cfg } = await supabase.from('loyalty_config').select('*').eq('id', 'singleton').single()
        const config = { ...DEFAULT_LOYALTY, ...cfg }
        setLoyaltyConfig(config)
        const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
        if (profile) {
          setUserTier(profile.tier || 'Homie')
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

  // Load PromptPay number from DB
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('loyalty_config').select('promptpay_number').eq('id','singleton').single()
        const phone = (data as any)?.promptpay_number
        if (phone) setPromptpayPhone(phone)
      } catch { }
    }
    load()
  }, [])

  // Generate PromptPay QR when method or total changes
  useEffect(() => {
    if (payMethod !== 'promptpay' || !total) return
    try {
      // Handle both CJS default and named export
      const genFn: (target: string, opts: { amount: number }) => string =
        (generatePayload as any).default ?? generatePayload
      const payload = genFn(promptpayPhone, { amount: total })
      ;(QRCode.toString as (text: string, opts: object) => Promise<string>)(
        payload, { type: 'svg', width: 280, margin: 2 }
      ).then(svg => {
        setQrDataUrl('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))
      }).catch(() => {})
    } catch { }
  }, [payMethod, total, promptpayPhone])

  const suggestedItems = menuItems.slice(0, 3).filter(m => !items.find(i => i.id === m.id))

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      const referenceId = 'HCF' + Date.now().toString().slice(-5)

      const { data, error } = await supabase.from('orders').insert({
        user_id: u?.id || null,
        reference_id: referenceId,
        items: items,
        total: total,
        payment_method: payMethod,
        status: 'pending',
        notes: form.note,
        customer_name: form.name,
        customer_phone: form.phone,
        delivery_address: form.address,
        delivery_date: form.deliveryDate,
        delivery_time: form.deliveryTime,
      }).select().single()

      if (error) throw error
      setOrderId(referenceId)

      // Upload payment slip if provided
      if (slipFile && data?.id) {
        setSlipUploading(true)
        try {
          const ext = slipFile.name.split('.').pop() || 'jpg'
          const path = `${data.id}.${ext}`

          console.log('Starting payment slip upload:', { fileName: slipFile.name, size: slipFile.size, path })

          // Upload file to storage - read file as Blob first to ensure proper format
          const fileBlob = new Blob([slipFile], { type: slipFile.type || 'image/jpeg' })

          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('payment-slips')
            .upload(path, fileBlob, { upsert: true, contentType: slipFile.type || 'image/jpeg' })

          if (uploadErr) {
            console.error('❌ Upload failed:', uploadErr)
            throw new Error(`Upload failed: ${uploadErr.message}`)
          }

          if (!uploadData) {
            throw new Error('Upload returned no data')
          }

          console.log('✅ File uploaded successfully:', uploadData)

          // IMPORTANT: The public URL needs to be constructed correctly for Supabase
          const publicUrl = `https://efvbudblbtayfszxgxhq.supabase.co/storage/v1/object/public/payment-slips/${path}`
          console.log('Public URL:', publicUrl)

          // Update database with the payment slip URL
          const { error: updateErr } = await supabase
            .from('orders')
            .update({ payment_slip_url: publicUrl })
            .eq('id', data.id)

          if (updateErr) {
            console.error('❌ Database update failed:', updateErr)
            throw new Error(`Database update failed: ${updateErr.message}`)
          }

          console.log('✅ Payment slip URL saved to database successfully')
          alert('✅ Payment slip uploaded successfully!')
        } catch (err: any) {
          console.error('❌ Payment slip error:', err)
          alert('Failed to upload payment slip: ' + (err?.message || 'Unknown error'))
        }
        setSlipUploading(false)
      }

      await sendOrderPushNotification({
        id: data?.id,
        customer_name: form.name,
        total: total,
        items: items,
        payment_method: payMethod,
      })

      // Add earned points — uses admin loyalty_config
      if (u) {
        const { data: cfg } = await supabase.from('loyalty_config').select('*').eq('id', 'singleton').single()
        const cfgMerged = { ...DEFAULT_LOYALTY, ...cfg }
        const { data: prof } = await supabase.from('profiles').select('points, tier').eq('id', u.id).single()
        const tier = prof?.tier || getTierFromPoints(prof?.points ?? 0, cfgMerged)
        const pts = calcPointsEarned(total, cfgMerged, tier)
        setPointsEarned(pts)

        try {
          await supabase.rpc('add_points', { user_id: u.id, points_to_add: pts })
        } catch { }

        // Process referral bonus if this is the user's first order
        try {
          await supabase.rpc('process_referral_bonus', { order_user_id: u.id })
        } catch { }
      }

      setOrderId(data?.id?.slice(0, 8).toUpperCase() || 'HCF001')
      clearCart()
      setStep('success')
    } catch (err) {
      const pts = calcPointsEarned(total, loyaltyConfig, userTier)
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
        <div className="text-center max-w-md w-full">
          <div className="w-24 h-24 bg-homie-lime rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-xl shadow-lime-200">🎉</div>
          <h1 className="font-display text-3xl font-bold text-homie-green mb-3">Order Placed!</h1>
          {orderId && <p className="text-sm text-homie-gray mb-3">Order ID: <span className="font-bold text-homie-green">#{orderId}</span></p>}
          {pointsEarned > 0 && (
            <div className="bg-lime-50 border border-lime-200 rounded-2xl p-4 mb-4">
              <p className="text-homie-green font-semibold text-lg">⭐ +{pointsEarned} loyalty points earned!</p>
            </div>
          )}
          <p className="text-homie-gray mb-2">Thank you for ordering from Homie Clean Food.</p>
          <p className="text-homie-gray mb-8">We'll confirm via WhatsApp shortly. Your fresh meal will be ready by 17:00.</p>
          <div className="card p-4 mb-6 text-sm text-homie-gray text-left">
            <p>📞 Questions? Call us: <a href="tel:0959505111" className="text-homie-green font-semibold">+66 95 950 5111</a></p>
            <p className="mt-1">💬 Line: <a href="https://line.me/R/ti/p/%40homiecleanfood" className="text-homie-green font-semibold">@homiecleanfood</a></p>
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
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden flex-shrink-0 relative bg-gray-50">
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
                          <button onClick={() => updateQty(item.id, item.portion, item.quantity - 1)} className="w-7 h-7 rounded-full bg-gray-50 hover:bg-homie-lime hover:text-white flex items-center justify-center transition-colors"><Minus size={12} /></button>
                          <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, item.portion, item.quantity + 1)} className="w-7 h-7 rounded-full bg-gray-50 hover:bg-homie-lime hover:text-white flex items-center justify-center transition-colors"><Plus size={12} /></button>
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
                      className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-homie-dark mb-1">Phone Number *</label>
                    <input type="tel" placeholder="+66 XX XXX XXXX" value={form.phone}
                      onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-homie-dark mb-1">Delivery Address *</label>
                  <input type="text" placeholder="Full address, building, floor, room" value={form.address}
                    onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime" />
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
                      className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-homie-dark mb-1">Delivery Time *</label>
                    <select
                      value={form.deliveryTime}
                      onChange={e => setForm(prev => ({ ...prev, deliveryTime: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime bg-white"
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
                    className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-homie-lime focus:ring-1 focus:ring-homie-lime" />
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
              <div className="card p-4 mb-6 text-sm text-homie-gray">
                <p>📦 Delivering to: <span className="text-homie-dark font-medium">{form.address}</span></p>
                <p className="mt-1">📅 {form.deliveryDate} at {form.deliveryTime}</p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { key: 'promptpay', label: 'PromptPay QR', desc: 'Scan with any Thai banking app — instant transfer', icon: '🇹🇭' },
                  { key: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives', icon: '💵' },
                  { key: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, JCB — Powered by Omise', icon: '💳' },
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

              {/* PromptPay QR Code */}
              {payMethod === 'promptpay' && (
                <div className="card p-5 mb-6 text-center border-2 border-homie-lime">
                  <p className="font-semibold text-homie-green mb-1">Scan to Pay via PromptPay</p>
                  <p className="text-xs text-homie-gray mb-4">Open your banking app → Scan QR → Amount is pre-filled</p>
                  {qrDataUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <img src={qrDataUrl} alt="PromptPay QR" className="w-52 h-52 mx-auto rounded-xl border border-gray-100" />
                      <div className="bg-homie-green text-white px-5 py-2 rounded-full font-bold text-lg">
                        ฿{total.toLocaleString()}
                      </div>
                      <p className="text-xs text-homie-gray">PromptPay: {promptpayPhone} · Homie Clean Food</p>
                      <button
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = qrDataUrl
                          link.download = `homie-promptpay-${total}.svg`
                          link.click()
                        }}
                        className="text-xs text-homie-lime font-semibold hover:text-homie-green transition-colors">
                        📥 Download QR Code
                      </button>
                      <label className="flex items-center gap-2 cursor-pointer mt-1">
                        <input type="checkbox" checked={qrPaid} onChange={e => setQrPaid(e.target.checked)}
                          className="w-4 h-4 accent-homie-lime" />
                        <span className="text-sm font-medium text-homie-dark">I have transferred the payment</span>
                      </label>

                      {/* Slip upload */}
                      {qrPaid && (
                        <div className="mt-3 w-full">
                          <p className="text-xs font-medium text-homie-dark mb-1.5">📎 Upload transfer slip <span className="text-homie-gray">(optional but recommended)</span></p>
                          {slipPreview ? (
                            <div className="relative inline-block">
                              <img src={slipPreview} alt="Transfer slip" className="w-32 h-32 object-cover rounded-xl border border-gray-200" />
                              <button
                                onClick={() => { setSlipFile(null); setSlipPreview('') }}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">✕</button>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 cursor-pointer w-full border-2 border-dashed border-gray-200 hover:border-homie-lime rounded-xl px-4 py-3 transition-colors">
                              <span className="text-xl">📷</span>
                              <span className="text-sm text-homie-gray">Tap to attach screenshot or photo</span>
                              <input type="file" accept="image/*" className="hidden"
                                onChange={e => {
                                  const f = e.target.files?.[0]
                                  if (!f) return
                                  setSlipFile(f)
                                  setSlipPreview(URL.createObjectURL(f))
                                }} />
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-52 h-52 mx-auto bg-gray-50 rounded-xl flex items-center justify-center">
                      <div className="text-homie-gray text-sm">Generating QR...</div>
                    </div>
                  )}
                </div>
              )}

              {/* Points earned preview — uses admin loyalty_config */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-sm text-yellow-700">
                ⭐ You&apos;ll earn <strong>{calcPointsEarned(total, loyaltyConfig, userTier)} points</strong> for this order{userTier !== 'Homie' && ` (${userTier} ${userTier === 'Protein King' ? '2x' : '1.5x'} bonus)`}!
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('details')} className="flex-1 border-2 border-gray-200 text-homie-gray font-semibold py-3 rounded-xl hover:border-homie-green hover:text-homie-green transition-colors">← Back</button>
                <button onClick={handleSubmit} disabled={loading || slipUploading || (payMethod === 'promptpay' && !qrPaid)}
                  className="flex-1 bg-homie-green text-white font-bold py-3 rounded-xl hover:bg-homie-lime transition-colors disabled:opacity-60">
                  {slipUploading ? 'Uploading slip...' : loading ? 'Placing Order...' : payMethod === 'promptpay' ? `Confirm Payment ฿${total}` : `Confirm Order ฿${total}`}
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
                  <div className="flex justify-between text-sm"><span className="text-homie-gray">Points earned</span><span className="text-yellow-600 font-medium">+{calcPointsEarned(total, loyaltyConfig, userTier)} ⭐</span></div>
                  <div className="flex justify-between font-bold text-homie-green text-lg pt-1 border-t"><span>Total</span><span>฿{total}</span></div>
                </div>
              </>
            )}
            <div className="mt-4 text-xs text-homie-gray bg-lime-50 rounded-xl p-3 border border-lime-100">
              🕐 Order by 5 PM for same-day delivery<br />
              📞 Questions: +66 95 950 5111
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}// Force redeploy
