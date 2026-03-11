'use client'
import { useState } from 'react'
import Link from 'next/link'

const tiers = [
  { name: 'Homie', minPoints: 0, color: 'bg-gray-100 text-gray-600', emoji: '🌱', perks: ['1 point per ฿10 spent', 'Birthday bonus 50 pts', 'Member-only deals'] },
  { name: 'Clean Eater', minPoints: 200, color: 'bg-lime-100 text-lime-700', emoji: '🥗', perks: ['1.5x points multiplier', 'Free delivery on orders ฿500+', 'Early menu access'] },
  { name: 'Protein King', minPoints: 500, color: 'bg-green-100 text-green-700', emoji: '💪', perks: ['2x points multiplier', 'Free meal every 10 orders', 'Priority delivery', 'Exclusive monthly box'] },
]

const rewards = [
  { name: 'Free Drink', points: 100, emoji: '🥤', desc: 'Any drink from our menu' },
  { name: '฿50 Discount', points: 150, emoji: '💰', desc: 'Off your next order' },
  { name: 'Free Lean Meal', points: 300, emoji: '🍱', desc: 'Any chicken lean meal' },
  { name: 'Free Bulk Meal', points: 400, emoji: '💪', desc: 'Any meal, any protein' },
  { name: '฿200 Credit', points: 500, emoji: '🎁', desc: 'Credit added to account' },
  { name: 'VIP Box', points: 1000, emoji: '👑', desc: '5-meal weekly box, free delivery' },
]

export default function LoyaltyPage() {
  const [demo, setDemo] = useState(350)

  const currentTier = [...tiers].reverse().find(t => demo >= t.minPoints) || tiers[0]
  const nextTier = tiers.find(t => t.minPoints > demo)
  const progress = nextTier
    ? ((demo - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
    : 100

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">⭐</div>
        <h1 className="font-display text-4xl font-bold text-homie-green mb-2">Loyalty Program</h1>
        <p className="text-homie-gray">Earn points with every order. Redeem for free meals and exclusive rewards!</p>
      </div>

      {/* Points demo card */}
      <div className="bg-homie-green text-white rounded-3xl p-8 mb-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #7CB518 0%, transparent 60%)' }} />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-green-300 text-sm mb-1">Your Points Balance</p>
              <p className="font-display text-5xl font-bold">{demo.toLocaleString()}</p>
              <p className="text-green-200 text-sm mt-1">points</p>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-bold ${currentTier.color}`}>
              {currentTier.emoji} {currentTier.name}
            </div>
          </div>

          {nextTier && (
            <div>
              <div className="flex justify-between text-xs text-green-300 mb-1">
                <span>{currentTier.name}</span>
                <span>{nextTier.minPoints - demo} pts to {nextTier.emoji} {nextTier.name}</span>
              </div>
              <div className="bg-white/20 rounded-full h-2">
                <div className="bg-homie-lime h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          
          {/* Demo slider */}
          <div className="mt-4">
            <p className="text-xs text-green-300 mb-2">👆 Demo: drag to see tier changes</p>
            <input type="range" min="0" max="1000" value={demo} onChange={e => setDemo(+e.target.value)}
              className="w-full accent-lime-400" />
          </div>
        </div>
      </div>

      {/* How to earn */}
      <section className="mb-12">
        <h2 className="font-display text-2xl font-bold text-homie-green mb-6">How to Earn Points</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '🛒', label: 'Every Order', value: '1 pt / ฿10', desc: 'Automatically added' },
            { icon: '👤', label: 'First Order', value: '+50 pts', desc: 'One-time welcome bonus' },
            { icon: '🎂', label: 'Birthday', value: '+50 pts', desc: 'On your birthday month' },
            { icon: '📣', label: 'Refer a Friend', value: '+100 pts', desc: 'When they first order' },
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
            <div key={tier.name} className={`rounded-2xl p-6 border-2 transition-all ${
              currentTier.name === tier.name ? 'border-homie-lime shadow-lg shadow-lime-100' : 'border-gray-100 bg-white'
            }`}>
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
              {currentTier.name === tier.name && (
                <div className="mt-3 text-xs font-semibold text-homie-lime">← Your current tier</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Rewards catalog */}
      <section className="mb-12">
        <h2 className="font-display text-2xl font-bold text-homie-green mb-6">Redeem Rewards</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {rewards.map(r => (
            <div key={r.name} className="card p-5 flex items-center gap-4">
              <div className="text-3xl">{r.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-homie-dark">{r.name}</div>
                <div className="text-xs text-homie-gray">{r.desc}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-homie-lime text-sm">{r.points}</div>
                <div className="text-xs text-homie-gray">pts</div>
                <button
                  disabled={demo < r.points}
                  className="mt-1 text-xs px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-homie-lime text-white hover:bg-homie-green"
                >
                  Redeem
                </button>
              </div>
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
