import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Trash2, ClipboardList, Search, X } from 'lucide-react'

interface Sale {
  id: string
  item_name: string
  unit_label: string
  quantity: number
  unit_price: number
  total_amount: number
  sale_date: string
  payment_method: string
  customer_name: string | null
  paid_at: string | null
  paid_via: string | null
  notes: string | null
}

interface Props {
  userId: string
  isAdmin: boolean
  refreshKey: number
  onDelete: () => void
}

const paymentBadge = (method: string, paidVia?: string | null) => {
  if (method === 'credit' && !paidVia) return <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Credit</span>
  if (method === 'credit' && paidVia) return <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Settled</span>
  if (method === 'transfer') return <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Transfer</span>
  if (method === 'pos') return <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">POS</span>
  return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Cash</span>
}

export default function SalesTable({ userId, isAdmin, refreshKey, onDelete }: Props) {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPayment, setFilterPayment] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    setLoading(true)
    let query = supabase
      .from('sales')
      .select('*')
      .order('sale_date', { ascending: false })
      .limit(300)

    if (!isAdmin) query = query.eq('user_id', userId)

    query.then(({ data }) => {
      if (data) setSales(data)
      setLoading(false)
    })
  }, [userId, isAdmin, refreshKey])

  const filtered = sales.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.item_name.toLowerCase().includes(q) ||
      (s.customer_name?.toLowerCase().includes(q)) ||
      (s.notes?.toLowerCase().includes(q)) ||
      s.sale_date.includes(q)
    const matchPayment = filterPayment === 'all' || s.payment_method === filterPayment
    const matchFrom = !dateFrom || s.sale_date >= dateFrom
    const matchTo = !dateTo || s.sale_date <= dateTo
    return matchSearch && matchPayment && matchFrom && matchTo
  })

  const totalFiltered = filtered.reduce((sum, s) => sum + Number(s.total_amount), 0)
  const hasFilters = search || filterPayment !== 'all' || dateFrom || dateTo

  const clearFilters = () => {
    setSearch('')
    setFilterPayment('all')
    setDateFrom('')
    setDateTo('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sale record?')) return
    await supabase.from('sales').delete().eq('id', id)
    setSales(prev => prev.filter(s => s.id !== id))
    onDelete()
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-amber-900 text-lg flex items-center gap-2">
          <ClipboardList size={20} className="text-amber-600" />
          {isAdmin ? 'All Sales' : 'Recent Sales'}
        </h2>
        <button onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${showFilters ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-500'}`}>
          <Search size={13} /> Filter
          {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-0.5" />}
        </button>
      </div>

      {showFilters && (
        <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search product, customer, notes..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Payment filter */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'cash', 'transfer', 'pos', 'credit'].map(p => (
              <button key={p} onClick={() => setFilterPayment(p)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${filterPayment === p ? 'bg-amber-600 text-white border-amber-600' : 'border-gray-200 text-gray-600'}`}>
                {p === 'all' ? 'All payments' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From date</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To date</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
              <X size={12} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results summary */}
      {hasFilters && (
        <div className="flex justify-between items-center mb-3 text-xs text-gray-500">
          <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          <span className="font-semibold text-amber-700">Total: ₦{totalFiltered.toLocaleString('en-NG')}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center text-amber-400 py-8 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-amber-300 py-8 text-sm">
          {hasFilters ? 'No sales match your filter.' : 'No sales recorded yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-amber-100">
                <th className="text-left py-2 px-2 text-xs font-semibold text-amber-600 uppercase">Date</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-amber-600 uppercase">Item</th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-amber-600 uppercase">Qty</th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-amber-600 uppercase">Total ₦</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-amber-600 uppercase">Payment</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-amber-50 transition-colors">
                  <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">
                    {new Date(s.sale_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="py-2.5 px-2 font-medium text-gray-800">
                    <div>{s.item_name}</div>
                    {s.customer_name && <div className="text-xs text-orange-500">{s.customer_name}</div>}
                    {s.notes && <div className="text-xs text-gray-400">{s.notes}</div>}
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-700">{Number(s.quantity).toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-right font-semibold text-amber-800">
                    {Number(s.total_amount).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {paymentBadge(s.payment_method, s.paid_via)}
                  </td>
                  <td className="py-2.5 px-2">
                    <button onClick={() => handleDelete(s.id)} aria-label={`Delete ${s.item_name} sale`} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
