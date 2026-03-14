'use client'

import { useState, useEffect } from 'react'
import { X, Download, AlertCircle } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    const dismissedKey = 'homie-pwa-prompt-dismissed'
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem(dismissedKey)
    if (stored) {
      const { date } = JSON.parse(stored)
      if (Date.now() - date < 7 * 24 * 60 * 60 * 1000) setDismissed(true)
    }

    // Debug logging
    const isHttps = window.location.protocol === 'https:'
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone

    setDebugInfo(`HTTPS: ${isHttps ? '✓' : '✗'} | Localhost: ${isLocalhost ? '✓' : '✗'} | Standalone: ${isStandalone ? '✓' : '✗'}`)

    console.log('[PWA Debug]', { isHttps, isLocalhost, isStandalone })

    const handler = (e: Event) => {
      console.log('[PWA] beforeinstallprompt fired')
      e.preventDefault()
      setDeferredPrompt(e)
      if (!dismissed) setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Check service worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        console.log('[PWA] Service Workers registered:', regs.length)
      })
    } else {
      console.log('[PWA] Service Workers not supported')
    }

    // Already installed (standalone mode)
    if (isStandalone) {
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

  // Show fallback install instructions if no beforeinstallprompt and not installed
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone
  )
  const showFallback = !deferredPrompt && !isStandalone && typeof window !== 'undefined'

  if (!showPrompt && !showFallback) return null

  // Fallback manual install UI
  if (showFallback && !deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle size={20} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-900">Install Admin App</h3>
            <p className="text-xs text-amber-800 mt-0.5">Your browser is ready for offline access</p>
            <details className="text-xs text-amber-700 mt-2 cursor-pointer">
              <summary className="font-medium hover:text-amber-900">Manual Install Instructions</summary>
              <div className="mt-2 pl-2 border-l border-amber-300 space-y-1 text-amber-800">
                <p><strong>iPhone/iPad:</strong> Tap Share → Add to Home Screen</p>
                <p><strong>Android:</strong> Tap Menu → Install app (or Add to home screen)</p>
                <p className="text-xs text-amber-600 mt-1">{debugInfo}</p>
              </div>
            </details>
            <button
              onClick={handleDismiss}
              className="text-xs text-amber-600 hover:text-amber-900 font-medium mt-2"
            >
              Got it
            </button>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-amber-600 hover:text-amber-900 transition-colors"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    )
  }

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
