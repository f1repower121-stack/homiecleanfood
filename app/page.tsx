import Link from 'next/link'
import { menuItems } from '@/lib/menuData'

export default function HomePage() {
  const featured = menuItems.slice(0, 4)

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-homie-green overflow-hidden min-h-[85vh] flex items-center">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #7CB518 0%, transparent 50%), radial-gradient(circle at 80% 20%, #7CB518 0%, transparent 40%)' }} />
        
        <div className="max-w-6xl mx-auto px-4 py-20 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fadeUp">
              <div className="inline-flex items-center gap-2 bg-homie-lime/20 text-homie-lime px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-homie-lime/30">
                🌿 Fresh Daily in Bangkok
              </div>
              <h1 className="font-display text-5xl md:text-6xl font-black text-white leading-tight mb-6">
                Clean Food.<br />
                <span className="text-homie-lime">Real Results.</span>
              </h1>
              <p className="text-green-200 text-lg leading-relaxed mb-8 max-w-md">
                Macro-balanced meals crafted fresh daily. Choose Lean or Bulk portions — chicken, fish & beef options. Order by 5 PM for same-day freshness.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/order" className="bg-homie-lime hover:bg-lime-500 text-white font-bold px-8 py-4 rounded-full transition-all hover:shadow-xl hover:shadow-lime-500/25 active:scale-95">
                  Order Now 🛒
                </Link>
                <Link href="/menu" className="border-2 border-white/30 text-white hover:bg-white hover:text-homie-green font-semibold px-8 py-4 rounded-full transition-all">
                  View Menu
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '🍽️', label: 'Menu Items', value: '25+' },
                { icon: '💪', label: 'Protein-First', value: '50g+' },
                { icon: '🏙️', label: 'Bangkok Delivery', value: 'Daily' },
                { icon: '⭐', label: 'Happy Customers', value: '1000+' },
              ].map((s, i) => (
                <div key={i} className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10">
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className="text-2xl font-display font-bold text-white">{s.value}</div>
                  <div className="text-green-300 text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Homie */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center text-homie-green mb-2">Why Choose Homie?</h2>
          <p className="text-center text-homie-gray mb-10">We make clean eating easy, delicious, and consistent</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: '🥗', title: 'Fresh Daily', desc: 'Prepared fresh every morning, never frozen' },
              { icon: '⚖️', title: 'Macro Tracked', desc: 'Exact calories, protein, carbs & fat listed' },
              { icon: '🎯', title: 'Lean or Bulk', desc: 'Two portion sizes for every goal' },
              { icon: '🚫', title: 'No Added Sugar', desc: 'Clean ingredients, no hidden nasties' },
            ].map((f, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-homie-cream hover:shadow-md transition-shadow">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-homie-green mb-1">{f.title}</h3>
                <p className="text-sm text-homie-gray">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Menu */}
      <section className="py-16 bg-homie-cream">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-homie-green">Featured Meals</h2>
              <p className="text-homie-gray mt-1">Customer favourites this week</p>
            </div>
            <Link href="/menu" className="text-homie-lime font-semibold text-sm hover:underline">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map(item => (
              <div key={item.id} className="card overflow-hidden group">
                <div className="bg-gradient-to-br from-homie-green/10 to-homie-lime/10 p-6 text-center text-5xl group-hover:scale-110 transition-transform duration-300">
                  {item.emoji.split('').slice(0, 2).join('')}
                </div>
                <div className="p-4">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    item.category === 'beef' ? 'bg-red-100 text-red-600' :
                    item.category === 'fish' ? 'bg-blue-100 text-blue-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                  </span>
                  <h3 className="font-semibold text-sm mt-2 leading-tight text-homie-dark">{item.name}</h3>
                  <p className="text-xs text-homie-gray mt-1 line-clamp-2">{item.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-bold text-homie-green">฿{item.leanPrice}</span>
                    <Link href="/order" className="text-xs bg-homie-lime text-white px-3 py-1.5 rounded-full hover:bg-homie-green transition-colors">
                      Add +
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Order */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold text-homie-green mb-2">How It Works</h2>
          <p className="text-homie-gray mb-12">Simple steps to your perfect clean meal</p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', icon: '🔍', title: 'Browse Menu', desc: 'Explore 25+ clean meal options' },
              { step: '2', icon: '⚖️', title: 'Pick Portion', desc: 'Choose Lean or Bulk size' },
              { step: '3', icon: '💳', title: 'Pay Securely', desc: 'Card or Cash on Delivery' },
              { step: '4', icon: '🚀', title: 'Enjoy Fresh', desc: 'Delivered same day by 17:00' },
            ].map((s, i) => (
              <div key={i} className="relative">
                {i < 3 && <div className="hidden md:block absolute top-8 left-full w-full h-px bg-homie-lime/30 z-0" />}
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-homie-lime rounded-full flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg shadow-lime-200">
                    {s.icon}
                  </div>
                  <div className="font-display font-bold text-homie-green text-lg">{s.title}</div>
                  <p className="text-sm text-homie-gray mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/order" className="inline-block mt-12 bg-homie-green text-white font-bold px-10 py-4 rounded-full hover:bg-homie-lime transition-colors hover:shadow-lg">
            Start Ordering →
          </Link>
        </div>
      </section>

      {/* Loyalty CTA */}
      <section className="py-16 bg-homie-orange">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <div className="text-5xl mb-4">⭐</div>
          <h2 className="font-display text-3xl font-bold mb-3">Join Our Loyalty Program</h2>
          <p className="text-orange-100 text-lg mb-8">Earn points with every order. Redeem for free meals and exclusive discounts!</p>
          <Link href="/loyalty" className="bg-white text-homie-orange font-bold px-8 py-4 rounded-full hover:shadow-xl transition-all hover:scale-105">
            Learn More 🎁
          </Link>
        </div>
      </section>
    </div>
  )
}
