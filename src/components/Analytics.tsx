import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { Download, TrendingUp, Package, Banknote } from 'lucide-react'

interface Sale {
  id: string
  item_name: string
  quantity: number
  unit_price: number
  total_amount: number
  sale_date: string
  notes: string | null
  created_at: string
}

interface Props {
  userId: string
  refreshKey: number
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Analytics({ userId, refreshKey }: Props) {
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('sales')
      .select('*')
      .eq('user_id', userId)
      .order('sale_date', { ascending: false })
      .then(({ data }) => {
        if (data) setSales(data)
        setLoading(false)
      })
  }, [userId, refreshKey])

  const monthSales = sales.filter(s => {
    const d = new Date(s.sale_date)
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
  })

  const totalRevenue = monthSales.reduce((sum, s) => sum + Number(s.total_amount), 0)
  const totalQty = monthSales.reduce((sum, s) => sum + Number(s.quantity), 0)

  // Per-item breakdown
  const byItem: Record<string, { qty: number; revenue: number }> = {}
  monthSales.forEach(s => {
    if (!byItem[s.item_name]) byItem[s.item_name] = { qty: 0, revenue: 0 }
    byItem[s.item_name].qty += Number(s.quantity)
    byItem[s.item_name].revenue += Number(s.total_amount)
  })
  const chartData = Object.entries(byItem)
    .map(([name, v]) => ({ name: name.split('(')[0].trim(), revenue: v.revenue, qty: v.qty }))
    .sort((a, b) => b.revenue - a.revenue)

  // Daily trend for chart
  const byDay: Record<string, number> = {}
  monthSales.forEach(s => {
    const d = new Date(s.sale_date).getDate()
    byDay[d] = (byDay[d] || 0) + Number(s.total_amount)
  })
  const dailyData = Object.entries(byDay)
    .map(([day, revenue]) => ({ day: `Day ${day}`, revenue }))
    .sort((a, b) => parseInt(a.day.split(' ')[1]) - parseInt(b.day.split(' ')[1]))

  const exportCSV = () => {
    const rows = [
      ['Date', 'Item', 'Quantity', 'Unit Price (₦)', 'Total Amount (₦)', 'Notes'],
      ...monthSales.map(s => [
        s.sale_date,
        s.item_name,
        s.quantity,
        s.unit_price,
        s.total_amount,
        s.notes || ''
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-${MONTHS[selectedMonth]}-${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const years = Array.from(new Set(sales.map(s => new Date(s.sale_date).getFullYear()))).sort().reverse()
  if (!years.includes(selectedYear)) years.unshift(selectedYear)

  return (
    <div className="space-y-6">
      {/* Month/Year Picker + Export */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-amber-900 text-lg flex items-center gap-2">
            <TrendingUp size={20} className="text-amber-600" />
            Monthly Report
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5">
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1">
              <Banknote size={13} /> Total Revenue
            </div>
            <div className="text-2xl font-bold text-amber-900">
              ₦{totalRevenue.toLocaleString('en-NG')}
            </div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1">
              <Package size={13} /> Total Units Sold
            </div>
            <div className="text-2xl font-bold text-amber-900">{totalQty.toLocaleString()}</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 col-span-2 sm:col-span-1">
            <div className="text-xs text-amber-600 font-medium mb-1">Transactions</div>
            <div className="text-2xl font-bold text-amber-900">{monthSales.length}</div>
          </div>
        </div>
      </div>

      {/* Daily Revenue Chart */}
      {dailyData.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
          <h3 className="font-semibold text-amber-900 mb-4 text-sm">Daily Revenue — {MONTHS[selectedMonth]} {selectedYear}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fef3c7" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`₦${v.toLocaleString('en-NG')}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Items */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
          <h3 className="font-semibold text-amber-900 mb-4 text-sm">Top Items by Revenue</h3>
          <div className="space-y-3">
            {chartData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-amber-400 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800 truncate">{item.name}</span>
                    <span className="text-amber-700 font-semibold ml-2">₦{item.revenue.toLocaleString('en-NG')}</span>
                  </div>
                  <div className="bg-amber-100 rounded-full h-1.5">
                    <div
                      className="bg-amber-500 rounded-full h-1.5 transition-all"
                      style={{ width: `${(item.revenue / chartData[0].revenue) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {monthSales.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-amber-100 p-10 text-center text-amber-400">
          No sales recorded for {MONTHS[selectedMonth]} {selectedYear}.
        </div>
      )}
    </div>
  )
}
