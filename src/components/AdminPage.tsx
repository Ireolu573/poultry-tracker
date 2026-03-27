import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ShieldCheck } from 'lucide-react'

interface Product {
  id: string
  name: string
  unit_label: string
  unit_price: number
  is_active: boolean
}

const UNIT_OPTIONS = ['bag', 'kg', 'paint', 'sachet', 'bird', 'pack', 'crate', 'bottle', 'litre', 'unit']

const emptyForm = { name: '', unit_label: 'bag', unit_price: '' }

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name')
    if (data) setProducts(data)
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditingId(p.id)
    setForm({ name: p.name, unit_label: p.unit_label, unit_price: String(p.unit_price) })
    setError('')
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      unit_label: form.unit_label,
      unit_price: Number(form.unit_price),
    }

    let err
    if (editingId) {
      ({ error: err } = await supabase.from('products').update(payload).eq('id', editingId))
    } else {
      ({ error: err } = await supabase.from('products').insert({ ...payload, is_active: true }))
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    setShowForm(false)
    setForm(emptyForm)
    setEditingId(null)
    fetchProducts()
  }

  const toggleActive = async (p: Product) => {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    fetchProducts()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product permanently?')) return
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
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Add Product
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Set product names, unit types, and prices. Staff see these when recording sales.
        </p>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6">
          <h3 className="font-semibold text-amber-900 mb-4">
            {editingId ? 'Edit Product' : 'New Product'}
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="e.g. Broiler Feed"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type</label>
                <select
                  value={form.unit_label}
                  onChange={e => setForm(f => ({ ...f, unit_label: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {UNIT_OPTIONS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per unit (₦)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.unit_price}
                  onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                  required
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold py-2 px-5 rounded-lg transition-colors text-sm"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-gray-200 text-gray-500 hover:text-gray-700 font-medium py-2 px-5 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Products */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
        <h3 className="font-semibold text-amber-900 mb-3 text-sm">
          Active Products ({active.length})
        </h3>
        {loading ? (
          <div className="text-amber-300 text-sm py-4 text-center">Loading...</div>
        ) : active.length === 0 ? (
          <div className="text-gray-300 text-sm py-4 text-center">No active products.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {active.map(p => (
              <div key={p.id} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm">{p.name}</div>
                  <div className="text-xs text-gray-400">
                    per {p.unit_label} · ₦{Number(p.unit_price).toLocaleString('en-NG')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-gray-300 hover:text-amber-500 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => toggleActive(p)}
                    className="text-green-400 hover:text-gray-400 transition-colors"
                    title="Deactivate"
                  >
                    <ToggleRight size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
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
          <h3 className="font-semibold text-gray-400 mb-3 text-sm">
            Inactive / Hidden ({inactive.length})
          </h3>
          <div className="divide-y divide-gray-50">
            {inactive.map(p => (
              <div key={p.id} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-400 text-sm line-through">{p.name}</div>
                  <div className="text-xs text-gray-300">
                    per {p.unit_label} · ₦{Number(p.unit_price).toLocaleString('en-NG')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(p)}
                    className="text-gray-300 hover:text-green-400 transition-colors"
                    title="Reactivate"
                  >
                    <ToggleLeft size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
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
