import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PackagePlus } from 'lucide-react'

interface ProductUnit {
  id: string
  unit_label: string
}

interface Product {
  id: string
  name: string
  product_units: ProductUnit[]
}

interface StockRecord {
  id: string
  item_name: string
  quantity: number
  cost_price: number
  total_cost: number
  stock_date: string
  notes: string | null
}

interface Props {
  userId: string
  isAdmin: boolean
}

export default function StockForm({ userId, isAdmin }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [records, setRecords] = useState<StockRecord[]>([])
  const [productId, setProductId] = useState('')
  const [selectedUnitLabel, setSelectedUnitLabel] = useState('')
  const [quantity, setQuantity] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [stockDate, setStockDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const fetchRecords = () => {
    supabase
      .from('stock_records')
      .select('*')
      .eq('user_id', userId)
      .order('stock_date', { ascending: false })
      .limit(30)
      .then(({ data }) => { if (data) setRecords(data) })
  }

  useEffect(() => {
    supabase.from('products').select('id, name, product_units(id, unit_label)').eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setProducts(data as Product[]) })
    fetchRecords()
  }, [])

  const selectedProduct = products.find(p => p.id === productId)

  const handleProductSelect = (id: string) => {
    setProductId(id)
    setSelectedUnitLabel('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !selectedUnitLabel) return
    setLoading(true)

    const { error } = await supabase.from('stock_records').insert({
      user_id: userId,
      product_id: productId,
      item_name: selectedProduct.name,
      quantity: Number(quantity),
      cost_price: Number(costPrice),
      stock_date: stockDate,
      notes: notes || null,
    })

    setLoading(false)
    if (!error) {
      setProductId('')
      setSelectedUnitLabel('')
      setQuantity('')
      setCostPrice('')
      setNotes('')
      setStockDate(new Date().toISOString().split('T')[0])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
      fetchRecords()
    }
  }

  const total = Number(quantity) * Number(costPrice) || 0

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this stock record?')) return
    await supabase.from('stock_records').delete().eq('id', id)
    fetchRecords()
  }

  return (
    <div className="space-y-5">
      {/* Form */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
        <h2 className="font-bold text-amber-900 text-lg mb-4 flex items-center gap-2">
          <PackagePlus size={20} className="text-amber-600" />
          Record Stock Purchase
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="stock-product" className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select id="stock-product" value={productId} onChange={e => handleProductSelect(e.target.value)} required aria-required="true"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="">Select a product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedProduct && selectedProduct.product_units.length > 0 && (
            <div>
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-2">Unit</legend>
                <div className="flex flex-wrap gap-2" role="group">
                  {selectedProduct.product_units.map(u => (
                    <button key={u.id} type="button"
                      onClick={() => setSelectedUnitLabel(u.unit_label)}
                      aria-pressed={selectedUnitLabel === u.unit_label}
                      aria-label={`${u.unit_label} unit`}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        selectedUnitLabel === u.unit_label
                          ? 'bg-blue-600 text-white border-transparent'
                          : 'border-gray-200 text-gray-600 hover:bg-blue-50'
                      }`}>
                      {u.unit_label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="stock-quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Quantity {selectedUnitLabel && <span className="text-blue-500">({selectedUnitLabel}s)</span>}
              </label>
              <input id="stock-quantity" type="number" min="0" step="any" value={quantity}
                onChange={e => setQuantity(e.target.value)} required placeholder="0" aria-required="true"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label htmlFor="stock-cost-price" className="block text-sm font-medium text-gray-700 mb-1">Cost Price per unit (₦)</label>
              <input id="stock-cost-price" type="number" min="0" step="any" value={costPrice}
                onChange={e => setCostPrice(e.target.value)} required placeholder="0.00" aria-required="true"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="stock-date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input id="stock-date" type="date" value={stockDate} onChange={e => setStockDate(e.target.value)} required aria-required="true"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost</label>
              <div className="w-full border border-blue-200 bg-blue-50 rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-800">
                ₦{total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="stock-notes" className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input id="stock-notes" type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Supplier name, batch info..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">
              ✅ Stock record saved!
            </div>
          )}

          <button type="submit" disabled={loading} aria-busy={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
            {loading ? 'Saving...' : 'Save Stock Record'}
          </button>
        </form>
      </div>

      {/* Recent stock records */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
        <h3 className="font-semibold text-amber-900 mb-3 text-sm">Recent Stock Purchases</h3>
        {records.length === 0 ? (
          <div className="text-center text-gray-300 py-6 text-sm">No stock records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-100">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-amber-600 uppercase">Date</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-amber-600 uppercase">Item</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-amber-600 uppercase">Qty</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-amber-600 uppercase">Cost/unit</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-amber-600 uppercase">Total</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-blue-50 transition-colors">
                    <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">
                      {new Date(r.stock_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-2.5 px-2 font-medium text-gray-800">
                      <div>{r.item_name}</div>
                      {r.notes && <div className="text-xs text-gray-400">{r.notes}</div>}
                    </td>
                    <td className="py-2.5 px-2 text-right text-gray-700">{Number(r.quantity).toLocaleString()}</td>
                    <td className="py-2.5 px-2 text-right text-gray-700">₦{Number(r.cost_price).toLocaleString()}</td>
                    <td className="py-2.5 px-2 text-right font-semibold text-blue-700">₦{Number(r.total_cost).toLocaleString()}</td>
                    <td className="py-2.5 px-2">
                      <button onClick={() => handleDelete(r.id)} aria-label={`Delete ${r.item_name}`} className=\"text-gray-300 hover:text-red-400 transition-colors\">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
