import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PlusCircle } from 'lucide-react'

interface ProductUnit {
  id: string
  unit_label: string
  unit_price: number
}

interface Product {
  id: string
  name: string
  product_units: ProductUnit[]
}

interface Props {
  userId: string
  onSaleAdded: () => void
}

type PaymentMethod = 'cash' | 'transfer' | 'credit' | 'pos'

export default function SaleForm({ userId, onSaleAdded }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [productId, setProductId] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | null>(null)
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [priceEdited, setPriceEdited] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('tenant_id').eq('id', userId).single()
      .then(({ data }) => {
        if (data?.tenant_id) setTenantId(data.tenant_id)
      })
    supabase
      .from('products')
      .select('id, name, product_units(id, unit_label, unit_price)')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => { if (data) setProducts(data as Product[]) })
  }, [])

  const total = Number(quantity) * Number(unitPrice) || 0
  const selectedProduct = products.find(p => p.id === productId)

  const handleProductSelect = (id: string) => {
    setProductId(id)
    setSelectedUnit(null)
    setUnitPrice('')
    setPriceEdited(false)
  }

  const handleUnitSelect = (unitId: string) => {
    const product = products.find(p => p.id === productId)
    const unit = product?.product_units.find(u => u.id === unitId) || null
    setSelectedUnit(unit)
    setUnitPrice(unit ? String(unit.unit_price) : '')
    setPriceEdited(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !selectedUnit) return
    setLoading(true)

    const { error } = await supabase.from('sales').insert({
      user_id: userId,
      tenant_id: tenantId,
      product_id: productId,
      item_name: selectedProduct.name,
      unit_label: selectedUnit.unit_label,
      quantity: Number(quantity),
      unit_price: Number(unitPrice),
      sale_date: saleDate,
      payment_method: paymentMethod,
      customer_name: customerName || null,
      notes: notes || null,
    })

    setLoading(false)
    if (!error) {
      setProductId('')
      setSelectedUnit(null)
      setQuantity('')
      setUnitPrice('')
      setCustomerName('')
      setNotes('')
      setPriceEdited(false)
      setPaymentMethod('cash')
      setSaleDate(new Date().toISOString().split('T')[0])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
      onSaleAdded()
    }
  }

  const paymentOptions: { value: PaymentMethod; label: string; color: string }[] = [
    { value: 'cash',     label: '💵 Cash',     color: 'bg-green-500' },
    { value: 'transfer', label: '🏦 Transfer', color: 'bg-blue-500' },
    { value: 'pos',      label: '💳 POS',      color: 'bg-purple-500' },
    { value: 'credit',   label: '📋 Credit',   color: 'bg-orange-500' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
      <h2 className="font-bold text-amber-900 text-lg mb-4 flex items-center gap-2">
        <PlusCircle size={20} className="text-amber-600" />
        Record a Sale
      </h2>

      {products.length === 0 ? (
        <div className="text-center py-8 text-amber-400 text-sm">
          No products set up yet. Ask the admin to add products first.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select value={productId} onChange={e => handleProductSelect(e.target.value)} required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="">Select a product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Unit — shows only after product is selected */}
          {selectedProduct && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.product_units.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleUnitSelect(u.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      selectedUnit?.id === u.id
                        ? 'bg-amber-600 text-white border-transparent'
                        : 'border-gray-200 text-gray-600 hover:bg-amber-50'
                    }`}
                  >
                    {u.unit_label} · ₦{Number(u.unit_price).toLocaleString('en-NG')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Price */}
          {selectedUnit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-amber-500">({selectedUnit.unit_label}s)</span>
                </label>
                <input type="number" min="0" step="any" value={quantity}
                  onChange={e => setQuantity(e.target.value)} required placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price (₦) {priceEdited && <span className="text-xs text-orange-400">· edited</span>}
                </label>
                <input type="number" min="0" step="any" value={unitPrice}
                  onChange={e => { setUnitPrice(e.target.value); setPriceEdited(true) }}
                  required placeholder="0.00"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${priceEdited ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}
                />
                {priceEdited && (
                  <button type="button"
                    onClick={() => { setUnitPrice(String(selectedUnit.unit_price)); setPriceEdited(false) }}
                    className="text-xs text-amber-500 hover:text-amber-700 mt-1">
                    Reset to ₦{Number(selectedUnit.unit_price).toLocaleString('en-NG')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Date + Total */}
          {selectedUnit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                <div className="w-full border border-amber-200 bg-amber-50 rounded-lg px-3 py-2.5 text-sm font-semibold text-amber-800">
                  ₦{total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          {/* Payment Method */}
          {selectedUnit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <div className="flex gap-2">
                {paymentOptions.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setPaymentMethod(opt.value)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
                      paymentMethod === opt.value ? 'border-transparent text-white ' + opt.color : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer Name */}
          {selectedUnit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name {paymentMethod === 'credit' ? <span className="text-red-400">*</span> : <span className="text-gray-400">(optional)</span>}
              </label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                required={paymentMethod === 'credit'} placeholder="e.g. Mr. Emeka"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          )}

          {/* Notes */}
          {selectedUnit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any extra info..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">
              ✅ Sale recorded!
            </div>
          )}

          {selectedUnit && (
            <button type="submit" disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
              {loading ? 'Saving...' : 'Save Sale'}
            </button>
          )}
        </form>
      )}
    </div>
  )
}
