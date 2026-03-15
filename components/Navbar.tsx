'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCart } from './CartProvider'
import { supabase } from '@/lib/supabase/client'
import { ShoppingBag, User, Home, UtensilsCrossed, Star, Phone } from 'lucide-react'
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
      {/* Desktop/Top Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-[68px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-homie-lime to-homie-green rounded-xl flex items-center justify-center shadow-md shadow-lime-200/30">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <div className="leading-none">
              <span className="font-display font-bold text-homie-green text-lg block">Homie</span>
              <span className="text-[10px] font-medium text-homie-gray uppercase tracking-wider">Fresh meals, daily</span>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {desktopLinks.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  pathname === l.href
                    ? 'text-homie-green bg-lime-50 border border-lime-100'
                    : 'text-homie-gray hover:text-homie-green hover:bg-gray-50'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/order"
              className="ml-2 bg-homie-lime text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-homie-green transition-all"
            >
              Order Now
            </Link>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="hidden md:flex items-center gap-2 bg-lime-50 hover:bg-lime-100/80 rounded-xl px-4 py-2 border border-lime-100 transition-colors">
                <div className="w-6 h-6 bg-homie-lime rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{firstName?.[0]?.toUpperCase() ?? 'U'}</span>
                </div>
                <span className="text-sm font-medium text-homie-dark">{firstName}</span>
                <span className="text-xs font-semibold text-homie-green">{points} pts</span>
              </Link>
            ) : (
              <Link href="/signin" className="hidden md:flex items-center gap-1.5 text-sm font-medium text-homie-gray hover:text-homie-green transition-colors">
                <User size={16} />
                <span>Sign In</span>
              </Link>
            )}
            <Link href="/order" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
              <ShoppingBag size={20} className="text-homie-green" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-homie-orange text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-stretch h-16">
          {mobileNavItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const isOrder = item.href === '/order'
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
                  isOrder
                    ? 'text-white'
                    : isActive
                    ? 'text-homie-lime'
                    : 'text-gray-400 hover:text-homie-green'
                }`}
              >
                {isOrder ? (
                  <div className="absolute -top-4 w-14 h-14 bg-homie-lime rounded-full flex flex-col items-center justify-center shadow-lg shadow-lime-200">
                    <Icon size={20} className="text-white" />
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-homie-orange text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {count}
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className="text-[10px] font-medium leading-none">{item.label}</span>
                  </>
                )}
                {isOrder && <span className="text-[10px] font-semibold text-homie-lime mt-7 leading-none">Order</span>}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
