import Link from 'next/link'
import Image from 'next/image'
import { menuItems } from '@/lib/menuData'

export default function HomePage() {
  const featured = menuItems.slice(0, 4)

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-homie-green overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(ellipse at 10% 60%, rgba(124,181,24,0.3) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(124,181,24,0.2) 0%, transparent 50%)' }} />

        <div className="max-w-6xl mx-auto px-4 py-16 relative z-10 w-full">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="animate-fadeUp">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-white/20 backdrop-blur">
                🌿 Fresh Daily in Bangkok
              </div>
              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-6">
                Clean Food.<br />
                <span className="text-homie-lime">Real Results.</span>
              </h1>
              <p className="text-green-200 text-lg leading-relaxed mb-8 max-w-md">
                Macro-balanced meals crafted fresh daily. Lean or Bulk portions — chicken, fish &amp; beef. Order by 5 PM for same-day delivery.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/menu" className="bg-homie-lime hover:bg-lime-500 text-white font-bold px-8 py-4 rounded-full transition-all hover:shadow-xl hover:shadow-lime-500/30 active:scale-95 text-base">
                  Order Now 🛒
                </Link>
                <Link href="/menu" className="border-2 border-white/30 text-white hover:bg-white hover:text-homie-green font-semibold px-8 py-4 rounded-full transition-all text-base">
                  View Menu
                </Link>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '🍽️', label: 'Menu Items', value: '25+' },
                { icon: '💪', label: 'Protein-First', value: '50g+' },
                { icon: '🏙️', label: 'Bangkok Delivery', value: 'Daily' },
                { icon: '⭐', label: 'Happy Customers', value: '1000+' },
              ].map((s, i) => (
                <div key={i} className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className="text-2xl font-display font-bold text-white">{s.value}</div>
                  <div className="text-green-300 text-sm font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Homie — white */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-homie-green mb-3">Why Choose Homie?</h2>
            <p className="text-homie-gray text-lg">We make clean eating easy, delicious, and consistent</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { icon: '🥗', title: 'Fresh Daily', desc: 'Prepared every morning, never frozen' },
              { icon: '⚖️', title: 'Macro Tracked', desc: 'Exact calories, protein, carbs & fat' },
              { icon: '🎯', title: 'Lean or Bulk', desc: 'Two portion sizes for every goal' },
              { icon: '🚫', title: 'No Added Sugar', desc: 'Clean ingredients, no hidden nasties' },
            ].map((f, i) => (
              <div key={i} className="card p-6 text-center">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-homie-green mb-1.5 text-base">{f.title}</h3>
                <p className="text-sm text-homie-gray leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Meals — gray-50 */}
      <section className="py-16 section-alt">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-homie-green">Featured Meals</h2>
              <p className="text-homie-gray mt-1">Customer favourites this week</p>
            </div>
            <Link href="/menu" className="text-homie-lime font-semibold text-sm hover:underline shrink-0 ml-4">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {featured.map(item => (
              <Link key={item.id} href="/menu" className="card overflow-hidden group block">
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    item.category === 'beef' ? 'bg-red-50 text-red-600' :
                    item.category === 'fish' ? 'bg-blue-50 text-blue-600' :
                    'bg-lime-50 text-homie-lime'
                  }`}>
                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                  </span>
                  <h3 className="font-semibold text-sm mt-2 leading-tight text-homie-dark">{item.name}</h3>
                  <p className="text-xs text-homie-gray mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-bold text-homie-green text-base">฿{item.leanPrice}</span>
                    <span className="text-xs bg-homie-lime text-white px-3 py-1.5 rounded-full font-medium">Add +</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How to Order — white */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-homie-green mb-3">How It Works</h2>
          <p className="text-homie-gray text-lg mb-12">Simple steps to your perfect clean meal</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { step: '1', icon: '🔍', title: 'Browse Menu', desc: 'Explore 25+ clean meal options' },
              { step: '2', icon: '⚖️', title: 'Pick Portion', desc: 'Choose Lean or Bulk size' },
              { step: '3', icon: '💳', title: 'Pay Securely', desc: 'Card or Cash on Delivery' },
              { step: '4', icon: '🚀', title: 'Enjoy Fresh', desc: 'Delivered same day by 17:00' },
            ].map((s, i) => (
              <div key={i} className="relative">
                {i < 3 && <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gray-200 z-0" />}
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-homie-lime rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-md shadow-lime-200/60">
                    {s.icon}
                  </div>
                  <div className="font-bold text-homie-green text-base mb-1">{s.title}</div>
                  <p className="text-sm text-homie-gray leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/menu" className="inline-block mt-12 bg-homie-green text-white font-bold px-10 py-4 rounded-full hover:bg-homie-lime transition-colors hover:shadow-lg text-base">
            Start Ordering →
          </Link>
        </div>
      </section>

      {/* Loyalty CTA — green band */}
      <section className="py-16 bg-homie-green">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <div className="text-5xl mb-5">⭐</div>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Join Our Loyalty Program</h2>
          <p className="text-green-200 text-lg mb-8 max-w-md mx-auto">Earn 1 point per ฿100 spent and unlock exclusive member benefits!</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/loyalty" className="bg-homie-lime text-white font-bold px-8 py-4 rounded-full hover:bg-lime-500 transition-all hover:shadow-xl hover:shadow-lime-500/30 hover:scale-105 text-base">
              Learn More 🎁
            </Link>
            <Link href="/signin" className="border-2 border-white/30 text-white font-semibold px-8 py-4 rounded-full hover:bg-white/10 transition-all text-base">
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
