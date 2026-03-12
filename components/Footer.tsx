import Link from 'next/link'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://homiecleanfood.vercel.app'

export default function Footer() {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(SITE_URL)}`

  return (
    <footer className="bg-homie-green text-white mt-16">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="md:col-span-2">
          <h3 className="font-display font-bold text-2xl mb-2">Homie Clean Food</h3>
          <p className="text-green-200 text-sm leading-relaxed mb-4">
            Macro-balanced meals crafted fresh daily in Bangkok.<br />
            Fueling your lifestyle — one clean bite at a time.
          </p>
          <Link href="/qr" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2 transition-colors mb-4">
            <img src={qrUrl} alt="QR Code" className="w-10 h-10 rounded" width={40} height={40} />
            <span className="text-sm font-medium">Scan to order</span>
          </Link>
          <div className="flex gap-3">
            <a href="https://web.facebook.com/homiecleanfood" target="_blank" rel="noreferrer"
              className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors text-sm font-bold">f</a>
            <a href="https://www.instagram.com/homiecleanfood/" target="_blank" rel="noreferrer"
              className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors text-xs font-bold">ig</a>
            <a href="https://line.me/R/ti/p/%40homiecleanfood" target="_blank" rel="noreferrer"
              className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors text-xs font-bold">L</a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-semibold mb-3 text-green-100">Quick Links</h4>
          <ul className="space-y-2 text-sm text-green-200">
            {[['/', 'Home'], ['/menu', 'Menu'], ['/order', 'Order Now'], ['/loyalty', 'Loyalty Program'], ['/contact', 'Contact Us']].map(([href, label]) => (
              <li key={href}><Link href={href} className="hover:text-white transition-colors">{label}</Link></li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold mb-3 text-green-100">Contact</h4>
          <ul className="space-y-2 text-sm text-green-200">
            <li>📍 620 Ratchadaniwet 18<br />Samsen Nok, Huai Kwang<br />Bangkok</li>
            <li>📞 <a href="tel:0959505111" className="hover:text-white">+66 95 950 5111</a></li>
            <li>✉️ <a href="mailto:homiecleanfood@gmail.com" className="hover:text-white">homiecleanfood@gmail.com</a></li>
            <li>🕐 Daily 08:00 – 17:00<br />(Order by 5 PM)</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 text-center py-4 text-green-300 text-xs">
        © {new Date().getFullYear()} Homie Clean Food. All rights reserved.
      </div>
    </footer>
  )
}
