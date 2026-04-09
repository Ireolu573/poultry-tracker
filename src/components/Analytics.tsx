import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { Download, TrendingUp, Package, Banknote, ShoppingCart, CreditCard, TrendingDown } from 'lucide-react'

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
  notes: string | null
}

interface StockRecord {
  id: string
  item_name: string
  quantity: number
  cost_price: number
  total_cost: number
  stock_date: string
}

interface Props {
  userId: string
  isAdmin: boolean
  refreshKey: number
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const PAYMENT_COLORS: Record<string, string> = {
  cash: '#22c55e',
  transfer: '#3b82f6',
  credit: '#f97316',
}

export default function Analytics({ userId, isAdmin, refreshKey }: Props) {
  const [sales, setSales] = useState<Sale[]>([])
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [filterMode, setFilterMode] = useState<'month' | 'range'>('month')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    // Admins see ALL sales/stock; staff only see their own
    const salesQuery = isAdmin
      ? supabase.from('sales').select('*').order('sale_date', { ascending: false })
      : supabase.from('sales').select('*').eq('user_id', userId).order('sale_date', { ascending: false })
    const stockQuery = isAdmin
      ? supabase.from('stock_records').select('*').order('stock_date', { ascending: false })
      : supabase.from('stock_records').select('*').eq('user_id', userId).order('stock_date', { ascending: false })

    Promise.all([salesQuery, stockQuery]).then(([salesRes, stockRes]) => {
      if (salesRes.data) setSales(salesRes.data)
      if (stockRes.data) setStockRecords(stockRes.data)
      setLoading(false)
    })
  }, [userId, isAdmin, refreshKey])

  const inRange = (dateStr: string) => {
    if (filterMode === 'month') {
      const d = new Date(dateStr)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    }
    const from = dateFrom || '2000-01-01'
    const to = dateTo || '2099-12-31'
    return dateStr >= from && dateStr <= to
  }

  const monthSales = sales.filter(s => inRange(s.sale_date))
  const monthStock = stockRecords.filter(s => inRange(s.stock_date))
  const periodLabel = filterMode === 'month' 
    ? `${MONTHS[selectedMonth]} ${selectedYear}`
    : dateFrom && dateTo ? `${dateFrom} â†’ ${dateTo}` : dateFrom ? `From ${dateFrom}` : dateTo ? `Until ${dateTo}` : 'All time'

  // Revenue metrics
  const totalRevenue = monthSales.reduce((sum, s) => sum + Number(s.total_amount), 0)
  const totalQty = monthSales.reduce((sum, s) => sum + Number(s.quantity), 0)
  const totalStockCost = monthStock.reduce((sum, s) => sum + Number(s.total_cost), 0)
  const estimatedProfit = totalRevenue - totalStockCost

  // Payment breakdown
  const cashRevenue = monthSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total_amount), 0)
  const transferRevenue = monthSales.filter(s => s.payment_method === 'transfer').reduce((sum, s) => sum + Number(s.total_amount), 0)
  const posRevenue = monthSales.filter(s => s.payment_method === 'pos').reduce((sum, s) => sum + Number(s.total_amount), 0)
  const creditRevenue = monthSales.filter(s => s.payment_method === 'credit').reduce((sum, s) => sum + Number(s.total_amount), 0)
  const settledCredit = monthSales.filter(s => s.payment_method === 'credit' && s.paid_at).reduce((sum, s) => sum + Number(s.total_amount), 0)
  const outstandingCredit = creditRevenue - settledCredit

  const paymentPieData = [
    { name: 'Cash', value: cashRevenue, color: '#22c55e' },
    { name: 'Transfer', value: transferRevenue, color: '#3b82f6' },
    { name: 'POS', value: posRevenue, color: '#a855f7' },
    { name: 'Credit', value: creditRevenue, color: '#f97316' },
  ].filter(d => d.value > 0)

  // Per-item breakdown
  const byItem: Record<string, { qty: number; revenue: number }> = {}
  monthSales.forEach(s => {
    const key = s.item_name
    if (!byItem[key]) byItem[key] = { qty: 0, revenue: 0 }
    byItem[key].qty += Number(s.quantity)
    byItem[key].revenue += Number(s.total_amount)
  })
  const chartData = Object.entries(byItem)
    .map(([name, v]) => ({ name, revenue: v.revenue, qty: v.qty }))
    .sort((a, b) => b.revenue - a.revenue)

  // Daily revenue
  const byDay: Record<number, number> = {}
  monthSales.forEach(s => {
    const d = new Date(s.sale_date).getDate()
    byDay[d] = (byDay[d] || 0) + Number(s.total_amount)
  })
  const dailyData = Object.entries(byDay)
    .map(([day, revenue]) => ({ day: `${day}`, revenue }))
    .sort((a, b) => Number(a.day) - Number(b.day))

  const exportCSV = (all = false) => {
    const dataToExport = all ? sales : monthSales
    const filename = all
      ? `sales-all-${selectedYear}.csv`
      : `sales-${MONTHS[selectedMonth]}-${selectedYear}.csv`
    const rows = [
      ['Date', 'Item', 'Unit', 'Quantity', 'Unit Price (N)', 'Total (N)', 'Payment', 'Customer', 'Paid At', 'Notes'],
      ...dataToExport.map(s => [
        s.sale_date,
        s.item_name,
        s.unit_label || '',
        s.quantity,
        s.unit_price,
        s.total_amount,
        s.payment_method,
        s.customer_name || '',
        s.paid_at ? new Date(s.paid_at).toLocaleDateString() : '',
        s.notes || '',
      ])
    ]
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const years = Array.from(new Set([
    ...sales.map(s => new Date(s.sale_date).getFullYear()),
    ...stockRecords.map(s => new Date(s.stock_date).getFullYear()),
  ])).sort().reverse()
  if (!years.includes(selectedYear)) years.unshift(selectedYear)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-amber-900 text-lg flex items-center gap-2">
            <TrendingUp size={20} className="text-amber-600" />
            Monthly Report
          </h2>
          <div className="flex flex-col gap-2 w-full mt-2">
            {/* Mode toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5 w-fit">
              <button onClick={() => setFilterMode('month')}
                className={filterMode === 'month' ? 'text-xs font-medium px-3 py-1.5 rounded-md bg-white text-amber-700 shadow-sm' : 'text-xs font-medium px-3 py-1.5 rounded-md text-gray-500'}>
                By month
              </button>
              <button onClick={() => setFilterMode('range')}
                className={filterMode === 'range' ? 'text-xs font-medium px-3 py-1.5 rounded-md bg-white text-amber-700 shadow-sm' : 'text-xs font-medium px-3 py-1.5 rounded-md text-gray-500'}>
                Date range
              </button>
            </div>

            {filterMode === 'month' ? (
              <div className="flex items-center gap-2 flex-wrap">
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                <span className="text-gray-400 text-sm">to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => exportCSV(false)}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                <Download size={15} /> Export Period
              </button>
              <button onClick={() => exportCSV(true)}
                className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors">
                <Download size={15} /> Full Year
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1">
              <Banknote size={13} /> Total Revenue
            </div>
            <div className="text-xl font-bold text-amber-900">â‚¦{totalRevenue.toLocaleString('en-NG')}</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
              <ShoppingCart size={13} /> Stock Cost
            </div>
            <div className="text-xl font-bold text-blue-900">â‚¦{totalStockCost.toLocaleString('en-NG')}</div>
          </div>
          <div className={`rounded-xl p-4 ${estimatedProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`text-xs font-medium mb-1 flex items-center gap-1 ${estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingDown size={13} /> Est. Profit
            </div>
            <div className={`text-xl font-bold ${estimatedProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              â‚¦{estimatedProfit.toLocaleString('en-NG')}
            </div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4">
            <div className="text-xs text-orange-600 font-medium mb-1 flex items-center gap-1">
              <CreditCard size={13} /> Credit Owed
            </div>
            <div className="text-xl font-bold text-orange-900">â‚¦{outstandingCredit.toLocaleString('en-NG')}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
              <Package size={13} /> Units Sold
            </div>
            <div className="text-xl font-bold text-gray-800">{totalQty.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-500 font-medium mb-1">Transactions</div>
            <div className="text-xl font-bold text-gray-800">{monthSales.length}</div>
          </div>
        </div>
      </div>

      {/* Payment Breakdown */}
      {paymentPieData.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
          <h3 className="font-semibold text-amber-900 mb-1 text-sm">Payment Method Breakdown</h3>
          <div className="flex items-center gap-4 flex-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                  dataKey="value" nameKey="name">
                  {paymentPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `â‚¦${v.toLocaleString('en-NG')}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { label: 'ðŸ’µ Cash', value: cashRevenue, color: 'text-green-700 bg-green-50' },
              { label: 'ðŸ¦ Transfer', value: transferRevenue, color: 'text-blue-700 bg-blue-50' },
              { label: 'ðŸ’³ POS', value: posRevenue, color: 'text-purple-700 bg-purple-50' },
              { label: 'ðŸ“‹ Credit', value: creditRevenue, color: 'text-orange-700 bg-orange-50' },
            ].filter(item => item.value > 0).map(item => (
              <div key={item.label} className={`rounded-xl p-3 ${item.color}`}>
                <div className="text-xs font-medium mb-1">{item.label}</div>
                <div className="text-sm font-bold">â‚¦{item.value.toLocaleString('en-NG')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Revenue Chart */}
      {dailyData.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
          <h3 className="font-semibold text-amber-900 mb-4 text-sm">Daily Revenue â€” {periodLabel}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fef3c7" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `â‚¦${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`â‚¦${v.toLocaleString('en-NG')}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Products */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
          <h3 className="font-semibold text-amber-900 mb-4 text-sm">Top Products by Revenue</h3>
          <div className="space-y-3">
            {chartData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-amber-400 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800 truncate">{item.name}</span>
                    <span className="text-amber-700 font-semibold ml-2">â‚¦{item.revenue.toLocaleString('en-NG')}</span>
                  </div>
                  <div className="bg-amber-100 rounded-full h-1.5">
                    <div className="bg-amber-500 rounded-full h-1.5 transition-all"
                      style={{ width: `${(item.revenue / chartData[0].revenue) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Purchases This Month */}
      {monthStock.length > 0 && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
          <h3 className="font-semibold text-blue-900 mb-3 text-sm">Stock Purchased â€” {periodLabel}</h3>
          <div className="space-y-2">
            {monthStock.map(s => (
              <div key={s.id} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                <div>
                  <span className="font-medium text-gray-800">{s.item_name}</span>
                  <span className="text-gray-400 ml-2 text-xs">{Number(s.quantity).toLocaleString()} units</span>
                </div>
                <span className="text-blue-700 font-semibold">â‚¦{Number(s.total_cost).toLocaleString('en-NG')}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-1 font-bold">
              <span className="text-blue-800">Total Spent</span>
              <span className="text-blue-800">â‚¦{totalStockCost.toLocaleString('en-NG')}</span>
            </div>
          </div>
        </div>
      )}

      {monthSales.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-amber-100 p-10 text-center text-amber-400">
          No sales recorded for {periodLabel}.
        </div>
      )}
    </div>
  )
}
