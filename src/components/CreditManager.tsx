import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CreditCard } from 'lucide-react'

interface Sale {
  id: string
  item_name: string
  quantity: number
  unit_price: number
  total_amount: number
  sale_date: string
  customer_name: string | null
  payment_method: string
  paid_at: string | null
  paid_via: string | null
  notes: string | null
}

interface Props {
  isAdmin: boolean
  userId: string
}

export default function CreditManager({ isAdmin, userId }: Props) {
  const [credits, setCredits] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [settlingId, setSettlingId] = useState<string | null>(null)

  const fetchCredits = async () => {
    setLoading(true)
    let query = supabase
      .from('sales')
      .select('*')
      .eq('payment_method', 'credit')
      .is('paid_at', null)
      .order('sale_date', { ascending: false })

    if (!isAdmin) {
      query = query.eq('user_id', userId)
    }

    const { data } = await query
    if (data) setCredits(data)
    setLoading(false)
  }

  useEffect(() => { fetchCredits() }, [])

  const markAsPaid = async (id: string, method: 'cash' | 'transfer') => {
    setSettlingId(id)
    await supabase.from('sales').update({
      paid_at: new Date().toISOString(),
      paid_via: method,
    }).eq('id', id)
    setSettlingId(null)
    fetchCredits()
  }

  const totalOwed = credits.reduce((sum, s) => sum + Number(s.total_amount), 0)

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-amber-900 text-lg flex items-center gap-2">
          <CreditCard size={20} className="text-orange-500" />
          Credit Pending Payment
        </h2>
        {credits.length > 0 && (
          <div className="text-sm font-semibold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
            ₦{totalOwed.toLocaleString('en-NG')} owed
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center text-amber-300 py-8 text-sm">Loading...</div>
      ) : credits.length === 0 ? (
        <div className="text-center text-gray-300 py-8 text-sm">No pending credit sales 🎉</div>
      ) : (
        <div className="space-y-3">
          {credits.map(s => (
            <div key={s.id} className="border border-orange-100 rounded-xl p-4 bg-orange-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-gray-800 text-sm">{s.item_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(s.sale_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {s.customer_name && <span className="ml-2 font-medium text-orange-600">· {s.customer_name}</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {Number(s.quantity).toLocaleString()} × ₦{Number(s.unit_price).toLocaleString()}
                  </div>
                  {s.notes && <div className="text-xs text-gray-400 mt-0.5">{s.notes}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-orange-700 text-base">₦{Number(s.total_amount).toLocaleString('en-NG')}</div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => markAsPaid(s.id, 'cash')}
                  disabled={settlingId === s.id}
                  aria-busy={settlingId === s.id}
                  aria-label={`Mark ${s.customer_name} payment as received via cash`}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  💵 Paid — Cash
                </button>
                <button
                  onClick={() => markAsPaid(s.id, 'transfer')}
                  disabled={settlingId === s.id}
                  aria-busy={settlingId === s.id}
                  aria-label={`Mark ${s.customer_name} payment as received via transfer`}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  🏦 Paid — Transfer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
