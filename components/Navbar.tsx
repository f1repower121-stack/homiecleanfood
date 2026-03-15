'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCart } from './CartProvider'
import { supabase } from '@/lib/supabase/client'
import { ShoppingBag, User, Home, UtensilsCrossed, Star } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const { count } = useCart()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<{ full_name: string | null; points: number } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u)
      if (u) {
        supabase.from('profiles').select('full_name, points').eq('id', u.id).single()
          .then(({ data }: any) => setProfile(data ? { full_name: data.full_name, points: data.points ?? data.loyalty_points ?? 0 } : null))
      } else {
        setProfile(null)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase.from('profiles').select('full_name, points').eq('id', session.user.id).single()
          .then(({ data }: any) => setProfile(data ? { full_name: data.full_name, points: data.points ?? data.loyalty_points ?? 0 } : null))
      } else {
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]
  const firstName = displayName ? displayName.split(' ')[0] : null
  const points = profile?.points ?? 0

  const desktopLinks = [
    { href: '/', label: 'Home' },
    { href: '/menu', label: 'Menu' },
    { href: '/loyalty', label: 'Loyalty' },
    { href: '/contact', label: 'Contact' },
  ]

  const mobileNavItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { href: '/order', label: 'Order', icon: ShoppingBag },
    { href: '/loyalty', label: 'Loyalty', icon: Star },
    { href: user ? '/dashboard' : '/signin', label: user ? 'Account' : 'Sign In', icon: User },
  ]

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 bg-homie-green rounded-xl flex items-center justify-center">
              <span className="text-white font-display font-bold text-lg">H</span>
            </div>
            <div className="leading-none">
              <span className="font-display font-semibold text-homie-green text-[15px] block">Homie</span>
              <span className="text-[10px] text-stone-500 uppercase tracking-wider">Fresh meals, daily</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {desktopLinks.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  pathname === l.href ? 'text-homie-green bg-stone-100' : 'text-stone-600 hover:text-homie-green'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/order"
              className="ml-2 font-display font-semibold px-5 py-2.5 rounded-xl bg-homie-green text-white hover:bg-homie-lime transition-colors"
            >
              Order Now
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="hidden md:flex items-center gap-2 bg-stone-100 rounded-xl px-4 py-2 border border-stone-200">
                <div className="w-7 h-7 bg-homie-green rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{firstName?.[0]?.toUpperCase() ?? 'U'}</span>
                </div>
                <span className="text-sm font-medium text-stone-700">{firstName}</span>
                <span className="text-xs font-semibold text-homie-green">{points} pts</span>
              </Link>
            ) : (
              <Link href="/signin" className="hidden md:flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-homie-green">
                <User size={18} />
                Sign In
              </Link>
            )}
            <Link href="/order" className="relative p-2 rounded-xl hover:bg-stone-100">
              <ShoppingBag size={22} className="text-stone-600" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-homie-orange text-white text-[10px] rounded-lg flex items-center justify-center font-bold">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200">
        <div className="flex items-stretch h-16">
          {mobileNavItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const isOrder = item.href === '/order'
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative ${
                  isOrder ? 'text-white' : isActive ? 'text-homie-green' : 'text-stone-400'
                }`}
              >
                {isOrder ? (
                  <div className="absolute -top-4 w-14 h-14 bg-homie-green rounded-2xl flex items-center justify-center shadow-lg">
                    <Icon size={22} />
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-homie-orange text-white text-[10px] rounded-lg flex items-center justify-center font-bold">
                        {count}
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </>
                )}
                {isOrder && <span className="text-[10px] font-semibold text-homie-green mt-7">Order</span>}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
