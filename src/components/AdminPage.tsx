import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ShieldCheck, X } from 'lucide-react'

interface ProductUnit {
  id: string
  unit_label: string
  unit_price: number
}

interface Product {
  id: string
  name: string
  is_active: boolean
  product_units: ProductUnit[]
}

const UNIT_OPTIONS = ['bag', 'kg', 'paint', 'sachet', 'small', 'medium', 'large', 'big', 'bird', 'pack', 'crate', 'bottle', 'litre', 'unit']

const emptyUnitRow = () => ({ unit_label: 'bag', unit_price: '' })

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [units, setUnits] = useState<{ unit_label: string; unit_price: string }[]>([emptyUnitRow()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, is_active, product_units(id, unit_label, unit_price)')
      .order('name')
    if (data) setProducts(data as Product[])
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  const openAdd = () => {
    setEditingId(null)
    setName('')
    setUnits([emptyUnitRow()])
    setError('')
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditingId(p.id)
    setName(p.name)
    setUnits(
      p.product_units.length > 0
        ? p.product_units.map(u => ({ unit_label: u.unit_label, unit_price: String(u.unit_price) }))
        : [emptyUnitRow()]
    )
    setError('')
    setShowForm(true)
  }

  const addUnitRow = () => setUnits(u => [...u, emptyUnitRow()])
  const removeUnitRow = (i: number) => setUnits(u => u.filter((_, idx) => idx !== i))
  const updateUnit = (i: number, field: 'unit_label' | 'unit_price', value: string) => {
    setUnits(u => u.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const validUnits = units.filter(u => u.unit_label && u.unit_price)
    if (validUnits.length === 0) {
      setError('Add at least one unit with a price.')
      setSaving(false)
      return
    }

    if (editingId) {
      // Update product name
      const { error: nameErr } = await supabase
        .from('products')
        .update({ name: name.trim() })
        .eq('id', editingId)

      if (nameErr) { setError(nameErr.message); setSaving(false); return }

      // Delete old units and re-insert
      await supabase.from('product_units').delete().eq('product_id', editingId)
      const { error: unitErr } = await supabase.from('product_units').insert(
        validUnits.map(u => ({
          product_id: editingId,
          unit_label: u.unit_label,
          unit_price: Number(u.unit_price),
        }))
      )
      if (unitErr) { setError(unitErr.message); setSaving(false); return }
    } else {
      // Insert product
      const { data: newProduct, error: prodErr } = await supabase
        .from('products')
        .insert({ name: name.trim(), unit_label: validUnits[0].unit_label, unit_price: Number(validUnits[0].unit_price), is_active: true })
        .select()
        .single()

      if (prodErr || !newProduct) { setError(prodErr?.message || 'Failed'); setSaving(false); return }

      // Insert units
      const { error: unitErr } = await supabase.from('product_units').insert(
        validUnits.map(u => ({
          product_id: newProduct.id,
          unit_label: u.unit_label,
          unit_price: Number(u.unit_price),
        }))
      )
      if (unitErr) { setError(unitErr.message); setSaving(false); return }
    }

    setSaving(false)
    setShowForm(false)
    fetchProducts()
  }

  const toggleActive = async (p: Product) => {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    fetchProducts()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product and all its units?')) return
    await supabase.from('products').delete().eq('id', id)
    fetchProducts()
  }

  const active = products.filter(p => p.is_active)
  const inactive = products.filter(p => !p.is_active)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-amber-900 text-lg flex items-center gap-2">
            <ShieldCheck size={20} className="text-amber-600" />
            Product Manager
          </h2>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus size={15} /> Add Product
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Each product can have multiple units with different prices.
        </p>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6">
          <h3 className="font-semibold text-amber-900 mb-4">{editingId ? 'Edit Product' : 'New Product'}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Product name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="e.g. Broiler Feed"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Units */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Units & Prices</label>
              <div className="space-y-2">
                {units.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={row.unit_label}
                      onChange={e => updateUnit(i, 'unit_label', e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-32">
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input type="number" min="0" step="any"
                      value={row.unit_price}
                      onChange={e => updateUnit(i, 'unit_price', e.target.value)}
                      placeholder="Price (₦)"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    {units.length > 1 && (
                      <button type="button" onClick={() => removeUnitRow(i)}
                        className="text-gray-300 hover:text-red-400 transition-colors">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addUnitRow}
                className="mt-2 text-sm text-amber-600 hover:text-amber-800 flex items-center gap-1">
                <Plus size={14} /> Add another unit
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
            )}

            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold py-2 px-5 rounded-lg text-sm transition-colors">
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Product'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="border border-gray-200 text-gray-500 hover:text-gray-700 font-medium py-2 px-5 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Products */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
        <h3 className="font-semibold text-amber-900 mb-3 text-sm">Active Products ({active.length})</h3>
        {loading ? (
          <div className="text-amber-300 text-sm py-4 text-center">Loading...</div>
        ) : active.length === 0 ? (
          <div className="text-gray-300 text-sm py-4 text-center">No active products.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {active.map(p => (
              <div key={p.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm">{p.name}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {p.product_units.map(u => (
                      <span key={u.id} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                        {u.unit_label} · ₦{Number(u.unit_price).toLocaleString('en-NG')}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(p)} className="text-gray-300 hover:text-amber-500 transition-colors" title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => toggleActive(p)} className="text-green-400 hover:text-gray-400 transition-colors" title="Deactivate">
                    <ToggleRight size={20} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-gray-300 hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inactive Products */}
      {inactive.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 opacity-70">
          <h3 className="font-semibold text-gray-400 mb-3 text-sm">Inactive / Hidden ({inactive.length})</h3>
          <div className="divide-y divide-gray-50">
            {inactive.map(p => (
              <div key={p.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-400 text-sm line-through">{p.name}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {p.product_units.map(u => (
                      <span key={u.id} className="text-xs bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full">
                        {u.unit_label} · ₦{Number(u.unit_price).toLocaleString('en-NG')}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleActive(p)} className="text-gray-300 hover:text-green-400 transition-colors" title="Reactivate">
                    <ToggleLeft size={20} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-gray-300 hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
