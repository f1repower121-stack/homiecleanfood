'use client'
import { useState } from 'react'
import { useCart } from '@/components/CartProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { menuItems } from '@/lib/menuData'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'

export default function OrderPage() {
  const { items, removeItem, updateQty, total, clearCart } = useCart()
  const [step, setStep] = useState<'cart'|'details'|'payment'|'success'>('cart')
  const [payMethod, setPayMethod] = useState<'card'|'cod'>('cod')
  const [form, setForm] = useState({ name:'', phone:'', address:'', note:'' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('orders').insert({
        user_id: user?.id || null,
        customer_name: form.name,
        customer_phone: form.phone,
        delivery_address: form.address,
        items: items,
        total: total,
        payment_method: payMethod,
        notes: form.note,
        status: 'pending'
      })
    } catch(e) { console.log(e) }
    clearCart(); setLoading(false); setStep('success')
  }

  if (step === 'success') return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">🎉</div>
        <h1 className="font-display text-3xl font-bold text-homie-green mb-3">Order Placed!</h1>
        <p className="text-homie-gray mb-8">We will confirm via WhatsApp shortly.</p>
        <div className="bg-homie-cream rounded-2xl p-4 mb-6 text-sm">
          📞 <a href="tel:0959505111" className="text-homie-green font-semibold">+66 95 950 5111</a>
        </div>
        <Link href="/" className="btn-primary inline-block">Back to Home</Link>
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-center gap-2 mb-10">
        {[{key:'cart',label:'🛒 Cart'},{key:'details',label:'📋 Details'},{key:'payment',label:'💳 Payment'}].map((s,i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`px-4 py-1.5 rounded-full text-sm font-medium ${step===s.key?'bg-homie-green text-white':['details','payment'].indexOf(step)>i?'bg-homie-lime text-white':'bg-gray-100 text-homie-gray'}`}>{s.label}</div>
            {i<2 && <div className="w-6 h-px bg-gray-200"/>}
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step==='cart' && (
            <div>
              <h2 className="font-display text-2xl font-bold text-homie-green mb-6">Your Cart</h2>
              {items.length===0 ? (
                <div className="text-center py-16">
                  <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4"/>
                  <p className="text-homie-gray mb-6">Your cart is empty</p>
                  <Link href="/menu" className="btn-primary">Browse Menu</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id+item.portion} className="card p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-homie-cream rounded-xl flex items-center justify-center text-2xl">🍽️</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-homie-gray capitalize">{item.portion}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={()=>updateQty(item.id,item.portion,item.quantity-1)} className="w-7 h-7 rounded-full bg-homie-cream hover:bg-homie-lime hover:text-white flex items-center justify-center"><Minus size={12}/></button>
                        <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                        <button onClick={()=>updateQty(item.id,item.portion,item.quantity+1)} className="w-7 h-7 rounded-full bg-homie-cream hover:bg-homie-lime hover:text-white flex items-center justify-center"><Plus size={12}/></button>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-homie-green">฿{item.price*item.quantity}</p>
                        <button onClick={()=>removeItem(item.id,item.portion)} className="text-red-400 mt-1"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>setStep('details')} className="w-full mt-4 bg-homie-lime text-white font-bold py-4 rounded-xl hover:bg-homie-green">Continue to Details →</button>
                </div>
              )}
            </div>
          )}
          {step==='details' && (
            <div>
              <h2 className="font-display text-2xl font-bold text-homie-green mb-6">Delivery Details</h2>
              <div className="space-y-4">
                {[{key:'name',label:'Full Name',type:'text',ph:'Your name'},{key:'phone',label:'Phone',type:'tel',ph:'+66 XX XXX XXXX'},{key:'address',label:'Address',type:'text',ph:'Full address'},{key:'note',label:'Notes (optional)',type:'text',ph:'Allergies...'}].map(f=>(
                  <div key={f.key}>
                    <label className="block text-sm font-medium mb-1">{f.label}</label>
                    <input type={f.type} placeholder={f.ph} value={form[f.key as keyof typeof form]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-homie-lime"/>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={()=>setStep('cart')} className="flex-1 border-2 border-gray-200 text-homie-gray font-semibold py-3 rounded-xl">← Back</button>
                <button onClick={()=>setStep('payment')} disabled={!form.name||!form.phone||!form.address} className="flex-1 bg-homie-lime text-white font-bold py-3 rounded-xl disabled:opacity-40">Continue →</button>
              </div>
            </div>
          )}
          {step==='payment' && (
            <div>
              <h2 className="font-display text-2xl font-bold text-homie-green mb-6">Payment</h2>
              <div className="space-y-3 mb-6">
                {[{key:'card',label:'Credit/Debit Card',icon:'💳'},{key:'cod',label:'Cash on Delivery',icon:'💵'}].map(m=>(
                  <button key={m.key} onClick={()=>setPayMethod(m.key as any)} className={`w-full text-left p-4 rounded-xl border-2 ${payMethod===m.key?'border-homie-lime bg-lime-50':'border-gray-100'}`}>
                    <span className="text-2xl mr-3">{m.icon}</span><span className="font-semibold">{m.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={()=>setStep('details')} className="flex-1 border-2 border-gray-200 text-homie-gray font-semibold py-3 rounded-xl">← Back</button>
                <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-homie-green text-white font-bold py-3 rounded-xl disabled:opacity-60">
                  {loading?'Placing...':'Confirm Order ฿'+total}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-24">
            <h3 className="font-semibold text-homie-green mb-4">Summary</h3>
            {items.map(item=>(
              <div key={item.id+item.portion} className="flex justify-between text-sm mb-2">
                <span className="text-homie-gray truncate mr-2">{item.name} x{item.quantity}</span>
                <span>฿{item.price*item.quantity}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-bold text-homie-green"><span>Total</span><span>฿{total}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}