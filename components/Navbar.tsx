'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCart } from './CartProvider'
import { supabase } from '@/lib/supabase'
import { ShoppingBag, Menu, X, User } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const { count } = useCart()
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<{ full_name: string | null; points: number } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u)
      if (u) {
        supabase.from('profiles').select('full_name, loyalty_points, points').eq('id', u.id).single()
          .then(({ data }: any) => setProfile(data ? { full_name: data.full_name, points: data.points ?? data.loyalty_points ?? 0 } : null))
      } else {
        setProfile(null)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase.from('profiles').select('full_name, loyalty_points, points').eq('id', session.user.id).single()
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

  const links: { href: string; label: string }[] = [
    { href: '/', label: 'Home' },
    { href: '/menu', label: 'Menu' },
    { href: '/order', label: 'Order Now' },
    ...(user ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
    { href: '/loyalty', label: 'Loyalty' },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-homie-lime rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <span className="font-display font-bold text-homie-green text-lg leading-tight">
            Homie<br />
            <span className="text-xs font-body font-normal text-homie-gray -mt-1 block">Clean Food</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors hover:text-homie-lime ${
                pathname === l.href ? 'text-homie-lime' : 'text-homie-dark'
              } ${l.label === 'Order Now' ? 'bg-homie-lime text-white px-4 py-2 rounded-full hover:bg-homie-green hover:text-white' : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard" className="hidden md:flex items-center gap-2 text-sm text-homie-gray hover:text-homie-green transition-colors">
              <User size={16} />
              <span>{firstName}</span>
              <span className="text-homie-lime font-semibold">{points} pts</span>
            </Link>
          ) : (
            <Link href="/signin" className="hidden md:flex items-center gap-1 text-sm text-homie-gray hover:text-homie-green transition-colors">
              <User size={16} />
              <span>Sign In</span>
            </Link>
          )}
          <Link href="/order" className="relative">
            <ShoppingBag size={22} className="text-homie-green" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-homie-orange text-white text-xs rounded-full flex items-center justify-center font-bold">
                {count}
              </span>
            )}
          </Link>
          <button className="md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-3 animate-fadeIn">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`text-sm font-medium py-2 border-b border-gray-50 ${
                pathname === l.href ? 'text-homie-lime' : 'text-homie-dark'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <Link href="/dashboard" onClick={() => setOpen(false)} className="text-sm text-homie-gray flex items-center gap-2 py-2">
              <User size={16} /> {firstName} · {points} pts
            </Link>
          ) : (
            <Link href="/signin" onClick={() => setOpen(false)} className="text-sm text-homie-gray flex items-center gap-2 py-2">
              <User size={16} /> Sign In / Register
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
