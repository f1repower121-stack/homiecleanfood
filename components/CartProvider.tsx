'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

export interface CartItem {
  id: string
  name: string
  portion: 'lean' | 'bulk'
  price: number
  quantity: number
  image?: string  // FIX: added image field
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string, portion: string) => void
  updateQty: (id: string, portion: string, qty: number) => void
  clearCart: () => void
  total: number
  count: number
}

const CartContext = createContext<CartContextType | null>(null)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = (newItem: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === newItem.id && i.portion === newItem.portion)
      if (existing) {
        return prev.map(i =>
          i.id === newItem.id && i.portion === newItem.portion
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, { ...newItem, quantity: 1 }]
    })
  }

  const removeItem = (id: string, portion: string) => {
    setItems(prev => prev.filter(i => !(i.id === id && i.portion === portion)))
  }

  const updateQty = (id: string, portion: string, qty: number) => {
    if (qty <= 0) { removeItem(id, portion); return }
    setItems(prev => prev.map(i =>
      i.id === id && i.portion === portion ? { ...i, quantity: qty } : i
    ))
  }

  const clearCart = () => setItems([])
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  )
}
