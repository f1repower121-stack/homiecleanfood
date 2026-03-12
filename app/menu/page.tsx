'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { menuItems, type MenuItem } from '@/lib/menuData'
import { useCart } from '@/components/CartProvider'
import { X } from 'lucide-react'

export default function MenuPage() {
  const { addItem } = useCart()
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [portion, setPortion] = useState<'lean' | 'bulk'>('lean')
  const [activeCategory, setActiveCategory] = useState<'all' | 'chicken' | 'beef' | 'fish'>('all')

  const filtered = activeCategory === 'all' ? menuItems : menuItems.filter(i => i.category === activeCategory)

  const handleAddToCart = (item: MenuItem, p: 'lean' | 'bulk') => {
    addItem({
      id: item.id,
      name: item.name,
      portion: p,
      price: p === 'lean' ? item.leanPrice : item.bulkPrice,
      quantity: 1,
      image: item.image, // FIX: pass image to cart
    })
    setSelectedItem(null)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-homie-green mb-2">Full Menu</h1>
      <p className="text-homie-gray mb-6">Click any meal to view details and add to cart</p>

      {/* Category Filter */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { key: 'all', label: '🍽️ All' },
          { key: 'chicken', label: '🍗 Chicken' },
          { key: 'beef', label: '🥩 Beef' },
          { key: 'fish', label: '🐟 Fish' },
        ].map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key as any)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.key
                ? 'bg-homie-green text-white'
                : 'bg-homie-cream text-homie-gray hover:bg-homie-lime hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map(item => (
          <button
            key={item.id}
            onClick={() => { setSelectedItem(item); setPortion('lean') }}
            className="card overflow-hidden group text-left w-full"
          >
            <div className="relative aspect-square bg-homie-cream overflow-hidden">
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              />
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
                <span className="font-bold text-homie-green">฿{item.leanPrice} - ฿{item.bulkPrice}</span>
                <span className="text-xs bg-homie-lime text-white px-3 py-1.5 rounded-full">Add +</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedItem && (() => {
        const cal = portion === 'lean' ? selectedItem.leanCalories : selectedItem.bulkCalories
        const protein = portion === 'lean' ? selectedItem.leanProtein : selectedItem.bulkProtein
        const carb = portion === 'lean' ? selectedItem.leanCarb : selectedItem.bulkCarb
        const fat = portion === 'lean' ? selectedItem.leanFat : selectedItem.bulkFat
        const proteinPct = Math.min(100, Math.round((protein / 50) * 100))
        const carbPct = Math.min(100, Math.round((carb / 300) * 100))
        const fatPct = Math.min(100, Math.round((fat / 65) * 100))
        const hasAllergens = selectedItem.contains?.length > 0

        const onClose = () => { setSelectedItem(null); setPortion('lean') }
        return (
          <div
            className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center p-0 md:p-4 bg-black/50"
            onClick={onClose}
          >
            <div
              className="relative bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full md:max-w-lg max-h-[92vh] md:max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>

              <div className="flex-shrink-0 relative aspect-video bg-homie-cream rounded-t-3xl md:rounded-t-2xl overflow-hidden">
                <Image
                  src={selectedItem.image}
                  alt={selectedItem.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 512px"
                  priority
                />
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="p-6">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    selectedItem.category === 'beef' ? 'bg-red-100 text-red-600' :
                    selectedItem.category === 'fish' ? 'bg-blue-100 text-blue-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {selectedItem.category.charAt(0).toUpperCase() + selectedItem.category.slice(1)}
                  </span>
                  <h2 className="font-display text-xl font-bold text-homie-green mt-2">{selectedItem.name}</h2>
                  <p className="text-sm text-homie-gray mt-2">{selectedItem.description}</p>

                  {selectedItem.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {selectedItem.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {hasAllergens && (
                    <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ Allergen warning</p>
                      <p className="text-sm text-amber-800">Contains: {selectedItem.contains.join(', ')}</p>
                    </div>
                  )}

                  {/* Portion toggle */}
                  <div className="flex gap-2 mt-6 mb-2">
                    <button
                      onClick={() => setPortion('lean')}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${portion === 'lean' ? 'bg-homie-lime text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                      Lean — ฿{selectedItem.leanPrice}
                    </button>
                    <button
                      onClick={() => setPortion('bulk')}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${portion === 'bulk' ? 'bg-homie-lime text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                      Bulk — ฿{selectedItem.bulkPrice}
                    </button>
                  </div>

                  {/* Nutrition */}
                  <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
                    <div className="bg-gray-900 px-4 py-3">
                      <h3 className="text-white font-bold text-sm tracking-wide">Nutrition Facts</h3>
                      <p className="text-4xl font-black text-white mt-1">{cal} <span className="text-lg font-semibold text-gray-300">cal</span></p>
                    </div>
                    <div className="p-4 space-y-4 bg-white">
                      {[
                        { label: 'Protein', value: protein, pct: proteinPct, color: 'bg-homie-lime' },
                        { label: 'Carbs', value: carb, pct: carbPct, color: 'bg-homie-green' },
                        { label: 'Fat', value: fat, pct: fatPct, color: 'bg-amber-500' },
                      ].map(n => (
                        <div key={n.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{n.label}</span>
                            <span className="text-gray-500">{n.value}g · {n.pct}% DV</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${n.color} rounded-full`} style={{ width: `${n.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add to Cart button */}
                  <button
                    onClick={() => handleAddToCart(selectedItem, portion)}
                    className="mt-4 w-full bg-homie-green text-white font-bold py-4 rounded-xl hover:bg-homie-lime transition-colors text-base"
                  >
                    Add {portion === 'lean' ? 'Lean' : 'Bulk'} to Cart — ฿{portion === 'lean' ? selectedItem.leanPrice : selectedItem.bulkPrice}
                  </button>

                  <Link
                    href="/order"
                    className="block mt-3 text-center text-homie-lime font-semibold text-sm hover:underline"
                  >
                    View Cart →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
