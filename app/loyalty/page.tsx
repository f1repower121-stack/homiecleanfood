'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { DEFAULT_LOYALTY } from '@/lib/loyalty'

const tiers = [
  { name: 'Homie', minPoints: 0, color: 'bg-gray-100 text-gray-600', emoji: '🌱', perks: ['1 point per ฿10 spent', 'Birthday bonus 50 pts', 'Member-only deals'] },
  { name: 'Clean Eater', minPoints: 200, color: 'bg-lime-100 text-lime-700', emoji: '🥗', perks: ['1.5x points multiplier', 'Free delivery on orders ฿500+', 'Early menu access'] },
  { name: 'Protein King', minPoints: 500, color: 'bg-green-100 text-green-700', emoji: '💪', perks: ['2x points multiplier', 'Free meal every 10 orders', 'Priority delivery', 'Exclusive monthly box'] },
]

export default function LoyaltyPage() {
  const [config, setConfig] = useState<typeof DEFAULT_LOYALTY & Record<string, any>>(DEFAULT_LOYALTY as any)

  useEffect(() => {
    supabase.from('loyalty_config').select('*').eq('id', 'singleton').single().then(({ data }) => {
      if (data) setConfig({ ...DEFAULT_LOYALTY, ...data })
    })
  }, [])

  const ptsPerBaht10 = Math.round((config as any).points_per_baht * 10)
  const firstOrderBonus = (config as any).first_order_bonus ?? 50
  const birthdayBonus = (config as any).birthday_bonus ?? 50
  const referralBonus = (config as any).referral_bonus ?? 50

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">⭐</div>
        <h1 className="font-display text-4xl font-bold text-homie-green mb-2">Loyalty Program</h1>
        <p className="text-homie-gray">Earn points with every order and unlock exclusive member benefits!</p>
      </div>

      {/* How to earn */}
      <section className="mb-12">
        <h2 className="font-display text-2xl font-bold text-homie-green mb-6">How to Earn Points</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '🛒', label: 'Every Order', value: `${ptsPerBaht10} pt / ฿10`, desc: 'Automatically added' },
            { icon: '👤', label: 'First Order', value: `+${firstOrderBonus} pts`, desc: 'One-time welcome bonus' },
            { icon: '🎂', label: 'Birthday', value: `+${birthdayBonus} pts`, desc: 'On your birthday month' },
            { icon: '📣', label: 'Refer a Friend', value: `+${referralBonus} pts`, desc: 'When they first order' },
          ].map(e => (
            <div key={e.label} className="card p-5 text-center">
              <div className="text-3xl mb-2">{e.icon}</div>
              <div className="font-bold text-homie-lime text-lg">{e.value}</div>
              <div className="font-semibold text-sm text-homie-dark">{e.label}</div>
              <div className="text-xs text-homie-gray mt-0.5">{e.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tiers */}
      <section className="mb-12">
        <h2 className="font-display text-2xl font-bold text-homie-green mb-6">Member Tiers</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {tiers.map(tier => (
            <div key={tier.name} className="rounded-2xl p-6 border-2 border-gray-100 bg-white">
              <div className="text-3xl mb-2">{tier.emoji}</div>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${tier.color}`}>
                {tier.name}
              </div>
              <div className="text-xs text-homie-gray mb-3">
                {tier.minPoints === 0 ? 'Starting tier' : `From ${tier.minPoints} points`}
              </div>
              <ul className="space-y-1.5">
                {tier.perks.map(perk => (
                  <li key={perk} className="text-sm text-homie-dark flex items-start gap-2">
                    <span className="text-homie-lime mt-0.5">✓</span> {perk}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="bg-homie-cream rounded-2xl p-8 text-center">
        <h3 className="font-display text-2xl font-bold text-homie-green mb-2">Start Earning Today!</h3>
        <p className="text-homie-gray mb-6">Create a free account to track your points and unlock rewards.</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/signin" className="bg-homie-green text-white font-bold px-8 py-3 rounded-full hover:bg-homie-lime transition-colors">
            Create Account
          </Link>
          <Link href="/order" className="border-2 border-homie-green text-homie-green font-semibold px-8 py-3 rounded-full hover:bg-homie-green hover:text-white transition-colors">
            Order Now
          </Link>
        </div>
      </div>
    </div>
  )
}
