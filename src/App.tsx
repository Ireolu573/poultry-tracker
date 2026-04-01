import { useEffect, useState, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import DomainController from './components/DomainController'
import type { User } from '@supabase/supabase-js'
import { Settings, Wifi, WifiOff } from 'lucide-react'

const SaleForm      = lazy(() => import('./components/SaleForm'))
const SalesTable    = lazy(() => import('./components/SalesTable'))
const StockForm     = lazy(() => import('./components/StockForm'))
const CreditManager = lazy(() => import('./components/CreditManager'))
const Analytics     = lazy(() => import('./components/Analytics'))

type Tab = 'record' | 'history' | 'stock' | 'credit' | 'analytics'

interface Permissions {
  can_record_sales: boolean
  can_view_history: boolean
  can_view_stock: boolean
  can_add_stock: boolean
  can_view_analytics: boolean
  can_manage_credit: boolean
}

interface CompanySettings {
  admin_id: string
  company_name: string
  app_name: string
  brand_color: string
  logo_emoji: string
}

const DEFAULT_PERMS: Permissions = {
  can_record_sales: true, can_view_history: true, can_view_stock: true,
  can_add_stock: false, can_view_analytics: false, can_manage_credit: false,
}

const ADMIN_PERMS: Permissions = {
  can_record_sales: true, can_view_history: true, can_view_stock: true,
  can_add_stock: true, can_view_analytics: true, can_manage_credit: true,
}

const DEFAULT_COMPANY: CompanySettings = {
  admin_id: '', company_name: 'My Business',
  app_name: 'Sales Manager', brand_color: '#d97706', logo_emoji: '🏢',
}

const NAV_TABS = [
  { id: 'record'    as Tab, label: 'Record',    icon: '📝', perm: 'can_record_sales' },
  { id: 'history'   as Tab, label: 'History',   icon: '🗂️', perm: 'can_view_history' },
  { id: 'stock'     as Tab, label: 'Stock',     icon: '📦', perm: 'can_view_stock' },
  { id: 'analytics' as Tab, label: 'Analytics', icon: '📊', perm: 'can_view_analytics' },
  { id: 'credit'    as Tab, label: 'Credit',    icon: '📋', perm: 'can_manage_credit' },
]

export default function App() {
  const [user, setUser]             = useState<User | null>(null)
  const [isAdmin, setIsAdmin]       = useState(false)
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<Tab>('record')
  const [animKey, setAnimKey]       = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showDC, setShowDC]         = useState(false)
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMS)
  const [company, setCompany]       = useState<CompanySettings>(DEFAULT_COMPANY)
  const [online, setOnline]         = useState(navigator.onLine)

  useEffect(() => {
    const onOnline  = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

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

  useEffect(() => {
    document.documentElement.style.setProperty('--brand', company.brand_color)
  }, [company.brand_color])

  const fetchProfile = async (userId: string) => {
    const [profileRes, companyRes] = await Promise.all([
      supabase.from('profiles').select('is_admin, permissions').eq('id', userId).single(),
      supabase.from('company_settings').select('*').limit(1).single(),
    ])
    const admin = profileRes.data?.is_admin ?? false
    setIsAdmin(admin)
    if (admin) {
      setPermissions(ADMIN_PERMS)
    } else if (profileRes.data?.permissions) {
      setPermissions(profileRes.data.permissions as Permissions)
    }
    if (companyRes.data) setCompany(companyRes.data)
    setLoading(false)
  }

  const switchTab = (newTab: Tab) => {
    if (newTab === tab) return
    setTab(newTab)
    setAnimKey(k => k + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: company.brand_color + '15' }}>
        <div className="text-4xl">{company.logo_emoji}</div>
        <div className="w-8 h-8 rounded-full border-4 border-gray-200 animate-spin" style={{ borderTopColor: company.brand_color }} />
        <div className="text-sm font-medium text-gray-500">{company.app_name}</div>
      </div>
    )
  }

  if (!user) return <Auth company={company} />

  const visibleTabs = NAV_TABS.filter(t => permissions[t.perm as keyof Permissions])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 fade-in">
            <span className="text-xl">{company.logo_emoji}</span>
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">{company.company_name}</div>
              <div className="text-xs text-gray-400 leading-tight">{company.app_name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {online ? <Wifi size={13} className="text-green-400" /> : <WifiOff size={13} className="text-gray-300" />}
            {isAdmin && (
              <button
                onClick={() => setShowDC(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{ backgroundColor: company.brand_color + '20', color: company.brand_color }}
              >
                <Settings size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 pb-24">
        <div key={animKey} className="slide-up">
          <Suspense fallback={
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-4 border-gray-100 animate-spin" style={{ borderTopColor: company.brand_color }} />
            </div>
          }>
            {tab === 'record'    && permissions.can_record_sales   && <SaleForm userId={user.id} onSaleAdded={() => setRefreshKey(k => k + 1)} />}
            {tab === 'history'   && permissions.can_view_history   && <SalesTable userId={user.id} isAdmin={isAdmin} refreshKey={refreshKey} onDelete={() => setRefreshKey(k => k + 1)} />}
            {tab === 'stock'     && (permissions.can_view_stock || permissions.can_add_stock) && <StockForm userId={user.id} isAdmin={isAdmin || permissions.can_add_stock} />}
            {tab === 'analytics' && permissions.can_view_analytics && <Analytics userId={user.id} refreshKey={refreshKey} />}
            {tab === 'credit'    && permissions.can_manage_credit  && <CreditManager isAdmin={isAdmin} userId={user.id} />}
          </Suspense>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20 shadow-lg">
        <div className="max-w-2xl mx-auto px-2 py-1 flex justify-around">
          {visibleTabs.map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 min-w-0 flex-1 active:scale-95 ${
                tab === t.id ? 'scale-105' : 'opacity-50 hover:opacity-80'
              }`}
              style={tab === t.id ? { color: company.brand_color } : {}}
            >
              <span className="text-xl">{t.icon}</span>
              <span className="text-xs font-medium truncate">{t.label}</span>
              {tab === t.id && <div className="w-1 h-1 rounded-full" style={{ backgroundColor: company.brand_color }} />}
            </button>
          ))}
        </div>
      </nav>

      {/* Domain Controller */}
      {showDC && (
        <DomainController
          userId={user.id}
          company={company}
          onClose={() => setShowDC(false)}
          onCompanyUpdated={(c) => setCompany(c)}
          onProductsChanged={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  )
}
