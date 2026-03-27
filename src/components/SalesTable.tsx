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
  notes: string | null
}

interface Props {
  userId: string
  refreshKey: number
  onDelete: () => void
}

export default function SalesTable({ userId, refreshKey, onDelete }: Props) {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('sales')
      .select('*')
      .eq('user_id', userId)
      .order('sale_date', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setSales(data)
        setLoading(false)
      })
  }, [userId, refreshKey])

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
        Recent Sales
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
                <th className="text-left py-2 px-2 text-xs font-semibold text-amber-600 uppercase tracking-wide">Date</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-amber-600 uppercase tracking-wide">Item</th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-amber-600 uppercase tracking-wide">Qty</th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-amber-600 uppercase tracking-wide">Unit ₦</th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-amber-600 uppercase tracking-wide">Total ₦</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-amber-50 transition-colors">
                  <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">
                    {new Date(s.sale_date).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })}
                  </td>
                  <td className="py-2.5 px-2 font-medium text-gray-800">
                    <div>{s.item_name}</div>
                    {s.notes && <div className="text-xs text-gray-400">{s.notes}</div>}
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-700">{Number(s.quantity).toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-right text-gray-700">{Number(s.unit_price).toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-right font-semibold text-amber-800">{Number(s.total_amount).toLocaleString()}</td>
                  <td className="py-2.5 px-2">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
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
