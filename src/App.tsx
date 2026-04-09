import { useEffect, useState, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import type { User } from '@supabase/supabase-js'
import { LogOut, ShieldCheck } from 'lucide-react'

const SaleForm     = lazy(() => import('./components/SaleForm'))
const SalesTable   = lazy(() => import('./components/SalesTable'))
const StockForm    = lazy(() => import('./components/StockForm'))
const CreditManager = lazy(() => import('./components/CreditManager'))
const AdminPage    = lazy(() => import('./components/AdminPage'))
const Analytics    = lazy(() => import('./components/Analytics'))

type Tab = 'record' | 'history' | 'stock' | 'credit' | 'analytics' | 'admin'

type TabDef = { id: Tab; label: string; emoji: string; adminOnly?: boolean }

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('record')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id)
      else { setIsAdmin(false); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()
    setIsAdmin(data?.is_admin ?? false)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-amber-400 text-sm">Loading...</div>
      </div>
    )
  }

  if (!user) return <Auth />

  const allTabs: TabDef[] = [
    { id: 'record',    label: 'Record',    emoji: '📝' },
    { id: 'history',   label: 'History',   emoji: '🗂️' },
    { id: 'stock',     label: 'Stock',     emoji: '📦' },
    { id: 'credit',    label: 'Credit',    emoji: '📋' },
    { id: 'analytics', label: 'Analytics', emoji: '📊' },
    { id: 'admin',     label: 'Admin',     emoji: '🛡️', adminOnly: true },
  ]
  const tabs = allTabs.filter((t: TabDef) => !t.adminOnly || isAdmin)

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-white border-b border-amber-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐔</span>
            <span className="font-bold text-amber-900 text-base">Poultry Tracker</span>
            {isAdmin && (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                <ShieldCheck size={11} /> Admin
              </span>
            )}
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 text-sm transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex bg-white rounded-xl border border-amber-100 p-1 shadow-sm">
          {tabs.map((t: TabDef) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 px-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-10">
        <Suspense fallback={<div className="text-center text-amber-400 py-10 text-sm">Loading...</div>}>
          {tab === 'record' && (
            <SaleForm userId={user.id} onSaleAdded={() => setRefreshKey(k => k + 1)} />
          )}
          {tab === 'history' && (
            <SalesTable
              userId={user.id}
              isAdmin={isAdmin}
              refreshKey={refreshKey}
              onDelete={() => setRefreshKey(k => k + 1)}
            />
          )}
          {tab === 'stock' && <StockForm userId={user.id} />}
          {tab === 'credit' && <CreditManager isAdmin={isAdmin} userId={user.id} />}
          {tab === 'analytics' && <Analytics userId={user.id} isAdmin={isAdmin} refreshKey={refreshKey} />}
          {tab === 'admin' && isAdmin && <AdminPage />}
        </Suspense>
      </main>
    </div>
  )
}