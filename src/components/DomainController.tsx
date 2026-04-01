import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { X, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Users, UserPlus, Settings2, Package, ChevronRight, LogOut } from 'lucide-react'

interface ProductUnit { id: string; unit_label: string; unit_price: number }
interface Product { id: string; name: string; is_active: boolean; product_units: ProductUnit[] }
interface Permissions {
  can_record_sales: boolean; can_view_history: boolean; can_view_stock: boolean
  can_add_stock: boolean; can_view_analytics: boolean; can_manage_credit: boolean
}
interface CompanySettings {
  admin_id: string; company_name: string; app_name: string; brand_color: string; logo_emoji: string
}

const UNIT_OPTIONS = ['bag','kg','paint','sachet','small','medium','large','big','bird','pack','crate','bottle','litre','unit']
const COLORS = ['#d97706','#dc2626','#16a34a','#2563eb','#7c3aed','#db2777','#0891b2','#65a30d']
const EMOJI_OPTIONS = ['🏢','🐔','🛒','🏪','🏬','🌿','🐄','🐖','🐟','🍎','🧴','💊','👗','🔧','📦']
const emptyUnitRow = () => ({ unit_label: 'bag', unit_price: '' })

const DEFAULT_PERMISSIONS: Permissions = {
  can_record_sales: true, can_view_history: true, can_view_stock: true,
  can_add_stock: false, can_view_analytics: false, can_manage_credit: false,
}

const PERM_LABELS: { key: keyof Permissions; label: string }[] = [
  { key: 'can_record_sales',   label: 'Record Sales' },
  { key: 'can_view_history',   label: 'View History' },
  { key: 'can_view_stock',     label: 'View Stock' },
  { key: 'can_add_stock',      label: 'Add Stock' },
  { key: 'can_view_analytics', label: 'View Analytics' },
  { key: 'can_manage_credit',  label: 'Manage Credit' },
]

interface Props {
  userId: string
  company: CompanySettings
  onClose: () => void
  onCompanyUpdated: (c: CompanySettings) => void
  onProductsChanged: () => void
}

type Section = 'menu' | 'company' | 'products' | 'users'

export default function DomainController({ userId, company, onClose, onCompanyUpdated, onProductsChanged }: Props) {
  const [section, setSection] = useState<Section>('menu')
  const [companyName, setCompanyName] = useState(company.company_name)
  const [appName, setAppName] = useState(company.app_name)
  const [brandColor, setBrandColor] = useState(company.brand_color)
  const [logoEmoji, setLogoEmoji] = useState(company.logo_emoji)
  const [savingCompany, setSavingCompany] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productName, setProductName] = useState('')
  const [units, setUnits] = useState<{ unit_label: string; unit_price: string }[]>([emptyUnitRow()])
  const [savingProduct, setSavingProduct] = useState(false)
  const [productError, setProductError] = useState('')

  const [staffUsers, setStaffUsers] = useState<{ id: string; email: string; is_admin: boolean; permissions: Permissions }[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)
  const [userError, setUserError] = useState('')
  const [userSuccess, setUserSuccess] = useState('')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL
  const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY

  useEffect(() => { fetchProducts(); fetchUsers() }, [])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, is_active, product_units(id, unit_label, unit_price)')
      .order('name')
    if (data) setProducts(data as Product[])
  }

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, email, is_admin, permissions').order('email')
    if (data) setStaffUsers(data.map(u => ({ ...u, permissions: (u.permissions as Permissions) ?? DEFAULT_PERMISSIONS })))
  }

  const saveCompany = async () => {
    setSavingCompany(true)
    const settings = { company_name: companyName, app_name: appName, brand_color: brandColor, logo_emoji: logoEmoji }
    await supabase.from('company_settings').upsert({ admin_id: userId, ...settings })
    onCompanyUpdated({ admin_id: userId, ...settings })
    setSavingCompany(false)
  }

  const openAddProduct = () => { setEditingProductId(null); setProductName(''); setUnits([emptyUnitRow()]); setProductError(''); setShowProductForm(true) }

  const openEditProduct = (p: Product) => {
    setEditingProductId(p.id); setProductName(p.name)
    setUnits(p.product_units.length > 0 ? p.product_units.map(u => ({ unit_label: u.unit_label, unit_price: String(u.unit_price) })) : [emptyUnitRow()])
    setProductError(''); setShowProductForm(true)
  }

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProduct(true); setProductError('')
    const validUnits = units.filter(u => u.unit_label && u.unit_price)
    if (validUnits.length === 0) { setProductError('Add at least one unit.'); setSavingProduct(false); return }

    if (editingProductId) {
      await supabase.from('products').update({ name: productName.trim() }).eq('id', editingProductId)
      await supabase.from('product_units').delete().eq('product_id', editingProductId)
      await supabase.from('product_units').insert(validUnits.map(u => ({ product_id: editingProductId, unit_label: u.unit_label, unit_price: Number(u.unit_price) })))
    } else {
      const { data: newProd } = await supabase.from('products').insert({ name: productName.trim(), is_active: true }).select().single()
      if (newProd) await supabase.from('product_units').insert(validUnits.map(u => ({ product_id: newProd.id, unit_label: u.unit_label, unit_price: Number(u.unit_price) })))
    }
    setSavingProduct(false); setShowProductForm(false)
    fetchProducts(); onProductsChanged()
  }

  const toggleProductActive = async (p: Product) => {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    fetchProducts(); onProductsChanged()
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    fetchProducts(); onProductsChanged()
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); setCreatingUser(true); setUserError(''); setUserSuccess('')
    try {
      const tempClient = createClient(supabaseUrl, supabaseAnonKey)
      const { data, error } = await tempClient.auth.signUp({ email: newEmail.trim(), password: newPassword })
      if (error) { setUserError(error.message); setCreatingUser(false); return }
      if (data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, email: newEmail.trim(), is_admin: false, permissions: DEFAULT_PERMISSIONS })
        setUserSuccess(`Account created for ${newEmail}`)
        setNewEmail(''); setNewPassword(''); fetchUsers()
      }
    } catch { setUserError('Failed to create user.') }
    setCreatingUser(false)
  }

  const updatePermission = async (uid: string, key: keyof Permissions, value: boolean) => {
    const u = staffUsers.find(u => u.id === uid)
    if (!u) return
    const newPerms = { ...u.permissions, [key]: value }
    setStaffUsers(prev => prev.map(u => u.id === uid ? { ...u, permissions: newPerms } : u))
    await supabase.from('profiles').update({ permissions: newPerms }).eq('id', uid)
  }

  const active = products.filter(p => p.is_active)
  const inactive = products.filter(p => !p.is_active)

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white h-full overflow-y-auto flex flex-col shadow-2xl slide-in-right">

        {/* Panel Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            {section !== 'menu' ? (
              <button onClick={() => setSection('menu')} className="flex items-center gap-1 text-gray-500 text-sm">← Back</button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg">{logoEmoji}</span>
                <span className="font-bold text-gray-900 text-sm">Domain Controller</span>
              </div>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* MENU */}
        {section === 'menu' && (
          <div className="p-4 space-y-2 flex-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Manage</p>
            {[
              { id: 'company' as Section, icon: <Settings2 size={18} />, label: 'Company Settings', desc: 'Name, logo, colors', color: 'text-amber-600 bg-amber-50' },
              { id: 'products' as Section, icon: <Package size={18} />, label: 'Products', desc: `${active.length} active`, color: 'text-blue-600 bg-blue-50' },
              { id: 'users' as Section, icon: <Users size={18} />, label: 'Staff & Permissions', desc: `${staffUsers.length} users`, color: 'text-purple-600 bg-purple-50' },
            ].map(item => (
              <button key={item.id} onClick={() => setSection(item.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all border border-gray-100 text-left">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color}`}>{item.icon}</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800 text-sm">{item.label}</div>
                  <div className="text-xs text-gray-400">{item.desc}</div>
                </div>
                <ChevronRight size={15} className="text-gray-300" />
              </button>
            ))}
            <div className="pt-4 border-t border-gray-100 mt-4">
              <button onClick={() => supabase.auth.signOut()}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-500 text-left">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50"><LogOut size={18} /></div>
                <span className="font-medium text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* COMPANY SETTINGS */}
        {section === 'company' && (
          <div className="p-4 space-y-5 flex-1">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">App Icon</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map(e => (
                  <button key={e} onClick={() => setLogoEmoji(e)}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${logoEmoji === e ? 'bg-amber-50 scale-110' : 'hover:bg-gray-100'}`}
                    style={logoEmoji === e ? { outline: `2px solid ${brandColor}` } : {}}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Brand Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setBrandColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${brandColor === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Company Name</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">App Name (shown to staff)</label>
              <input value={appName} onChange={e => setAppName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100">Preview</div>
              <div className="px-3 py-2.5 flex items-center gap-2" style={{ backgroundColor: brandColor + '15' }}>
                <span className="text-xl">{logoEmoji}</span>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{companyName || 'My Business'}</div>
                  <div className="text-xs text-gray-400">{appName || 'Sales Manager'}</div>
                </div>
              </div>
            </div>
            <button onClick={saveCompany} disabled={savingCompany}
              className="w-full text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
              style={{ backgroundColor: brandColor }}>
              {savingCompany ? 'Saving...' : 'Save Company Settings'}
            </button>
          </div>
        )}

        {/* PRODUCTS */}
        {section === 'products' && (
          <div className="p-4 space-y-4 flex-1">
            <button onClick={openAddProduct}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: brandColor }}>
              <Plus size={15} /> Add Product
            </button>
            {showProductForm && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3 slide-up">
                <h3 className="font-semibold text-gray-800 text-sm">{editingProductId ? 'Edit Product' : 'New Product'}</h3>
                <form onSubmit={saveProduct} className="space-y-3">
                  <input type="text" value={productName} onChange={e => setProductName(e.target.value)} required
                    placeholder="Product name"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                  <div className="space-y-2">
                    {units.map((row, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <select value={row.unit_label} onChange={e => setUnits(u => u.map((r, idx) => idx === i ? { ...r, unit_label: e.target.value } : r))}
                          className="border border-gray-200 rounded-lg px-2 py-2 text-sm w-24">
                          {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <input type="number" min="0" step="any" value={row.unit_price}
                          onChange={e => setUnits(u => u.map((r, idx) => idx === i ? { ...r, unit_price: e.target.value } : r))}
                          placeholder="Price ₦" className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm" />
                        {units.length > 1 && (
                          <button type="button" onClick={() => setUnits(u => u.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-400"><X size={15} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setUnits(u => [...u, emptyUnitRow()])}
                    className="text-xs text-amber-600 flex items-center gap-1"><Plus size={12} /> Add unit</button>
                  {productError && <p className="text-red-500 text-xs">{productError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={savingProduct}
                      className="flex-1 text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-60"
                      style={{ backgroundColor: brandColor }}>
                      {savingProduct ? 'Saving...' : editingProductId ? 'Update' : 'Add'}
                    </button>
                    <button type="button" onClick={() => setShowProductForm(false)}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500">Cancel</button>
                  </div>
                </form>
              </div>
            )}
            <div className="space-y-2">
              {active.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm">{p.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.product_units.map(u => (
                        <span key={u.id} className="text-xs px-2 py-0.5 rounded-full border"
                          style={{ color: brandColor, borderColor: brandColor + '40', backgroundColor: brandColor + '10' }}>
                          {u.unit_label} · ₦{Number(u.unit_price).toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEditProduct(p)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-amber-500"><Pencil size={13} /></button>
                    <button onClick={() => toggleProductActive(p)} className="w-7 h-7 rounded-lg flex items-center justify-center text-green-400"><ToggleRight size={16} /></button>
                    <button onClick={() => deleteProduct(p.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
              {inactive.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-gray-400 mb-2">Inactive ({inactive.length})</p>
                  {inactive.map(p => (
                    <div key={p.id} className="bg-gray-50 rounded-xl border border-gray-100 p-3 flex items-center gap-3 opacity-60">
                      <div className="flex-1 text-sm text-gray-500 line-through">{p.name}</div>
                      <button onClick={() => toggleProductActive(p)} className="text-gray-400 hover:text-green-500"><ToggleLeft size={16} /></button>
                      <button onClick={() => deleteProduct(p.id)} className="text-gray-300 hover:text-red-400"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* USERS */}
        {section === 'users' && (
          <div className="p-4 space-y-4 flex-1">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2 mb-3">
                <UserPlus size={15} className="text-purple-500" /> Add Staff Account
              </h3>
              <form onSubmit={handleCreateUser} className="space-y-2">
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required
                  placeholder="Email address"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                  placeholder="Default password"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                {userError && <p className="text-red-500 text-xs">{userError}</p>}
                {userSuccess && <p className="text-green-600 text-xs">{userSuccess}</p>}
                <button type="submit" disabled={creatingUser}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm">
                  {creatingUser ? 'Creating...' : 'Create Account'}
                </button>
              </form>
            </div>
            <div className="space-y-2">
              {staffUsers.filter(u => !u.is_admin).map(u => (
                <div key={u.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <button onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-700 truncate">{u.email}</span>
                    <ChevronRight size={14} className={`text-gray-300 transition-transform ${expandedUser === u.id ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedUser === u.id && (
                    <div className="border-t border-gray-100 p-3 space-y-2 slide-up">
                      {PERM_LABELS.map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">{label}</span>
                          <button onClick={() => updatePermission(u.id, key, !u.permissions[key])}
                            className={`w-10 h-5 rounded-full transition-all relative ${u.permissions[key] ? 'bg-green-400' : 'bg-gray-200'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${u.permissions[key] ? 'left-5' : 'left-0.5'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {staffUsers.filter(u => u.is_admin).map(u => (
                <div key={u.id} className="bg-amber-50 rounded-xl border border-amber-100 p-3 flex items-center justify-between">
                  <span className="text-sm text-amber-700 truncate">{u.email}</span>
                  <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">Admin</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
