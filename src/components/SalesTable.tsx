import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Trash2, ClipboardList } from 'lucide-react'

interface Sale {
  id: string
  item_name: string
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

  useEffect(() => {
    setLoading(true)
    let query = supabase
      .from('sales')
      .select('*')
      .order('sale_date', { ascending: false })
      .limit(100)

    if (!isAdmin) {
      query = query.eq('user_id', userId)
    }

    query.then(({ data }) => {
      if (data) setSales(data)
      setLoading(false)
    })
  }, [userId, isAdmin, refreshKey])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sale record?')) return
    await supabase.from('sales').delete().eq('id', id)
    setSales(prev => prev.filter(s => s.id !== id))
    onDelete()
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
      <h2 className="font-bold text-amber-900 text-lg flex items-center gap-2 mb-4">
        <ClipboardList size={20} className="text-amber-600" />
        {isAdmin ? 'All Sales' : 'Recent Sales'}
      </h2>

      {loading ? (
        <div className="text-center text-amber-400 py-8 text-sm">Loading...</div>
      ) : sales.length === 0 ? (
        <div className="text-center text-amber-300 py-8 text-sm">No sales recorded yet.</div>
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
              {sales.map(s => (
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
                    <button onClick={() => handleDelete(s.id)} className="text-gray-300 hover:text-red-400 transition-colors">
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
