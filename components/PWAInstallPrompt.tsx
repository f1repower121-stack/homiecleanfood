'use client'

import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const dismissedKey = 'homie-pwa-prompt-dismissed'
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem(dismissedKey)
    if (stored) {
      const { date } = JSON.parse(stored)
      if (Date.now() - date < 7 * 24 * 60 * 60 * 1000) setDismissed(true) // Don't show again for 7 days
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!dismissed) setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setShowPrompt(false)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [dismissed])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('homie-pwa-prompt-dismissed', JSON.stringify({ date: Date.now() }))
    setDismissed(true)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-start gap-3">
        <div className="w-12 h-12 bg-homie-lime rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xl">H</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-homie-green">Install Homie</h3>
          <p className="text-sm text-homie-gray mt-0.5">Add to home screen for quick access — works offline too!</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex items-center gap-2 bg-homie-lime text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-homie-green transition-colors"
            >
              <Download size={16} /> Install
            </button>
            <button
              onClick={handleDismiss}
              className="text-homie-gray text-sm hover:text-homie-dark transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 text-homie-gray hover:text-homie-dark transition-colors"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
