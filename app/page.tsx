import Link from 'next/link'
import Image from 'next/image'
import { menuItems } from '@/lib/menuData'

export default function HomePage() {
  const featured = menuItems.slice(0, 4)

  return (
    <div>
      {/* Hero — Factor/Trifecta style: aspirational, benefit-first */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-homie-green via-[#2d5a3d] to-[#1e3d2a]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />

        <div className="max-w-6xl mx-auto px-4 py-20 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="animate-fadeUp text-center lg:text-left">
              <p className="text-amber-200/90 text-sm font-semibold uppercase tracking-widest mb-4">Fresh Daily · Bangkok</p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
                Eat Clean.<br />
                <span className="text-amber-200">Feel Strong.</span>
              </h1>
              <p className="text-stone-200/90 text-lg max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
                Chef-crafted, macro-balanced meals delivered same day. No prep, no cleanup—just heat and eat.
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <Link href="/menu" className="font-display font-semibold px-8 py-4 rounded-2xl bg-amber-400 text-stone-900 hover:bg-amber-300 transition-colors shadow-lg">
                  Get Started
                </Link>
                <Link href="/menu" className="font-semibold px-8 py-4 rounded-2xl border-2 border-white/40 text-white hover:bg-white/10 transition-colors">
                  View Menu
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-6 justify-center lg:justify-start text-stone-300 text-sm">
                <span>✓ Ready in 3 min</span>
                <span>✓ 50g+ protein/meal</span>
                <span>✓ Same-day delivery</span>
              </div>
            </div>

            {/* Featured meals as hero visual */}
            <div className="grid grid-cols-2 gap-3 animate-fadeUp" style={{ animationDelay: '0.15s' }}>
              {featured.map((item, i) => (
                <Link key={item.id} href="/menu" className={`rounded-2xl overflow-hidden shadow-xl ring-2 ring-white/20 transition-transform hover:scale-[1.02] ${i === 0 ? 'col-span-2' : ''}`}>
                  <div className={`relative overflow-hidden bg-stone-800 ${i === 0 ? 'aspect-[2/1]' : 'aspect-square'}`}>
                    <Image src={item.image} alt={item.name} fill className="object-cover opacity-90" sizes={i === 0 ? '100vw' : '50vw'} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <span className="text-amber-300 text-xs font-semibold uppercase">{item.category}</span>
                      <p className="text-white font-display font-semibold">{item.name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social proof — like Factor's "97% agree" */}
      <section className="py-12 bg-white/80 border-y border-stone-200/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-stone-600 text-sm font-medium">Join 1,000+ Bangkok customers eating cleaner</p>
          <div className="mt-4 flex flex-wrap justify-center gap-8 text-homie-green font-display font-semibold">
            <span>Fresh Daily</span>
            <span>Macro Tracked</span>
            <span>Lean or Bulk</span>
          </div>
        </div>
      </section>

      {/* How it works — HelloFresh/Factor 4-step */}
      <section className="py-20 bg-homie-cream">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-homie-green text-center mb-3">Here&apos;s How Homie Works</h2>
          <p className="text-stone-600 text-center mb-14">Four simple steps to cleaner eating</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { n: '1', title: 'Pick Your Meals', desc: 'Choose from 25+ chef-crafted options. Lean or Bulk portion.' },
              { n: '2', title: 'Order Anytime', desc: 'Order by 5 PM for same-day delivery across Bangkok.' },
              { n: '3', title: 'Fresh to Your Door', desc: 'Meals prepared that morning. Never frozen.' },
              { n: '4', title: 'Heat & Eat', desc: '3 minutes in microwave. No prep, no cleanup.' },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-homie-green text-white font-display font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {s.n}
                </div>
                <h3 className="font-display font-semibold text-homie-green mb-2">{s.title}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/menu" className="inline-block font-display font-semibold px-8 py-4 rounded-2xl bg-homie-green text-white hover:bg-homie-lime transition-colors">
              Start Ordering →
            </Link>
          </div>
        </div>
      </section>

      {/* Featured meals grid — larger, more appetizing */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="font-display text-3xl font-bold text-homie-green">Customer Favourites</h2>
              <p className="text-stone-600 mt-1">Fresh daily · Chef-crafted · Macro-balanced</p>
            </div>
            <Link href="/menu" className="font-semibold text-homie-green hover:text-homie-lime transition-colors">
              See Full Menu →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map(item => (
              <Link key={item.id} href="/menu" className="group block">
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-stone-100 mb-4 shadow-md group-hover:shadow-xl transition-shadow">
                  <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="25vw" />
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                  item.category === 'beef' ? 'bg-red-100 text-red-700' :
                  item.category === 'fish' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {item.category}
                </span>
                <h3 className="font-display font-semibold text-homie-green mt-2">{item.name}</h3>
                <p className="text-stone-500 text-sm mt-1">฿{item.leanPrice} · Lean · {item.leanCalories} kcal</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials — transformation angle like Trifecta */}
      <section className="py-20 bg-homie-cream">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-homie-green text-center mb-3">Real Results</h2>
          <p className="text-stone-600 text-center mb-12">What our customers say</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Preeyaporn S.', outcome: 'Husband lost 8kg in 3 months', text: 'อาหารอร่อย ราคาคุ้มมาก แนะนำสำหรับคนอยากดูแลสุขภาพ', color: 'from-emerald-500 to-teal-600' },
              { name: 'James T.', outcome: 'Gained 3kg muscle in 2 months', text: 'Best meal prep in Bangkok. Bulk portions are massive, macros spot on.', color: 'from-amber-500 to-orange-600' },
              { name: 'Natthida P.', outcome: 'Helps with fat loss', text: 'Order every day! Delicious, clean, high protein. Must recommend!', color: 'from-rose-500 to-pink-600' },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
                <div className={`w-10 h-1 rounded-full bg-gradient-to-r ${t.color} mb-4`} />
                <p className="font-display font-semibold text-homie-green">{t.outcome}</p>
                <p className="text-stone-600 text-sm mt-2">&quot;{t.text}&quot;</p>
                <p className="text-stone-500 text-xs mt-4">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — Loyalty */}
      <section className="py-20 bg-homie-green">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="font-display text-3xl font-bold mb-3">Start Earning Rewards</h2>
          <p className="text-stone-200 text-lg mb-8">1 point per ฿100 spent. Unlock free meals, delivery, and more.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/loyalty" className="font-display font-semibold px-8 py-4 rounded-2xl bg-amber-400 text-stone-900 hover:bg-amber-300 transition-colors">
              Learn More
            </Link>
            <Link href="/signin" className="font-semibold px-8 py-4 rounded-2xl border-2 border-white/40 hover:bg-white/10 transition-colors">
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
