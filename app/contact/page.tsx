'use client'
import { useState } from 'react'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl font-bold text-homie-green mb-2">Contact Us</h1>
        <p className="text-homie-gray">We'd love to hear from you. Reach out any time!</p>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Contact Info */}
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold text-homie-green text-lg mb-4">Get in Touch</h2>
            {[
              { icon: '📍', title: 'Address', content: '620 Ratchadaniwet 18, Samsen Nok\nHuai Kwang, Bangkok, Thailand', link: 'https://maps.google.com/?q=Huai+Kwang+Bangkok' },
              { icon: '📞', title: 'Phone / WhatsApp', content: '+66 95 950 5111', link: 'tel:0959505111' },
              { icon: '✉️', title: 'Email', content: 'homiecleanfood@gmail.com', link: 'mailto:homiecleanfood@gmail.com' },
              { icon: '💬', title: 'Line ID', content: '@homiecleanfood', link: 'https://line.me/R/ti/p/%40homiecleanfood' },
              { icon: '🕐', title: 'Hours', content: 'Daily 08:00 – 17:00\nOrder by 5 PM for same-day', link: null },
            ].map(c => (
              <div key={c.title} className="flex gap-4 p-4 rounded-xl bg-homie-cream hover:bg-white transition-colors">
                <div className="text-2xl">{c.icon}</div>
                <div>
                  <div className="font-semibold text-sm text-homie-dark">{c.title}</div>
                  {c.link ? (
                    <a href={c.link} target="_blank" rel="noreferrer"
                      className="text-sm text-homie-gray hover:text-homie-lime transition-colors whitespace-pre-line">
                      {c.content}
                    </a>
                  ) : (
                    <p className="text-sm text-homie-gray whitespace-pre-line">{c.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Social */}
          <div>
            <h3 className="font-semibold text-homie-green mb-3">Follow Us</h3>
            <div className="flex gap-3">
              {[
                { name: 'Facebook', icon: 'f', href: 'https://web.facebook.com/homiecleanfood', color: 'bg-blue-600' },
                { name: 'Instagram', icon: 'ig', href: 'https://www.instagram.com/homiecleanfood/', color: 'bg-pink-500' },
                { name: 'Line', icon: 'L', href: 'https://line.me/R/ti/p/%40homiecleanfood', color: 'bg-green-500' },
              ].map(s => (
                <a key={s.name} href={s.href} target="_blank" rel="noreferrer"
                  className={`${s.color} text-white w-12 h-12 rounded-2xl flex items-center justify-center font-bold hover:opacity-90 transition-opacity hover:shadow-lg`}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="card p-6">
          {sent ? (
            <div className="text-center py-12 animate-fadeUp">
              <div className="text-6xl mb-4">📨</div>
              <h3 className="font-display text-xl font-bold text-homie-green mb-2">Message Sent!</h3>
              <p className="text-homie-gray">Thanks for reaching out. We'll get back to you within 24 hours.</p>
              <button onClick={() => setSent(false)} className="mt-4 text-sm text-homie-lime hover:underline">
                Send another message
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-homie-green text-lg mb-5">Send a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-homie-dark mb-1">Name</label>
                    <input
                      type="text" required placeholder="Your name"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-homie-lime"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-homie-dark mb-1">Email</label>
                    <input
                      type="email" required placeholder="you@email.com"
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-homie-lime"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-homie-dark mb-1">Subject</label>
                  <select
                    value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-homie-lime bg-white"
                  >
                    <option value="">Select a topic</option>
                    <option>Order inquiry</option>
                    <option>Office catering</option>
                    <option>Loyalty program</option>
                    <option>Feedback</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-homie-dark mb-1">Message</label>
                  <textarea
                    required placeholder="How can we help?"
                    rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-homie-lime resize-none"
                  />
                </div>
                <button type="submit" className="w-full bg-homie-green text-white font-bold py-3 rounded-xl hover:bg-homie-lime transition-colors">
                  Send Message 📨
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Office Catering CTA */}
      <div className="mt-12 bg-homie-green text-white rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="font-display text-2xl font-bold mb-1">🏢 Office Catering</h3>
          <p className="text-green-200">Feed your whole team with our daily meal plans. Special rates for 10+ meals.</p>
        </div>
        <a href="mailto:homiecleanfood@gmail.com?subject=Office Catering Inquiry"
          className="bg-homie-lime text-white font-bold px-8 py-3 rounded-full hover:bg-white hover:text-homie-green transition-all whitespace-nowrap">
          Get a Quote →
        </a>
      </div>
    </div>
  )
}
