import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import SaleForm from './components/SaleForm'
import SalesTable from './components/SalesTable'
import AdminPage from './components/AdminPage'
import type { User } from '@supabase/supabase-js'
import { LogOut, ShieldCheck } from 'lucide-react'

type Tab = 'record' | 'history' | 'admin'

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

  const allTabs: { id: Tab; label: string; emoji: string; adminOnly?: boolean }[] = [
    { id: 'record',  label: 'Record',  emoji: '📝' },
    { id: 'history', label: 'History', emoji: '🗂️' },
    { id: 'admin',   label: 'Admin',   emoji: '🛡️', adminOnly: true },
  ]
  const tabs = allTabs.filter(t => !t.adminOnly || isAdmin)

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Top nav */}
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

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex bg-white rounded-xl border border-amber-100 p-1 shadow-sm">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
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

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-10">
        {tab === 'record' && (
          <SaleForm userId={user.id} onSaleAdded={() => setRefreshKey(k => k + 1)} />
        )}
        {tab === 'history' && (
          <SalesTable userId={user.id} refreshKey={refreshKey} onDelete={() => setRefreshKey(k => k + 1)} />
        )}
        {tab === 'admin' && isAdmin && <AdminPage />}
      </main>
    </div>
  )
}