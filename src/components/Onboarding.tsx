import { useState } from 'react'
import { supabase } from '../lib/supabase'

const EMOJI_OPTIONS = ['🏢','🐔','🛒','🏪','🏬','🌿','🐄','🐖','🐟','🍎','🧴','💊','👗','🔧','📦']
const COLORS = ['#d97706','#dc2626','#16a34a','#2563eb','#7c3aed','#db2777','#0891b2','#65a30d']

interface Props {
  userId: string
  userEmail: string
  onComplete: () => void
}

export default function Onboarding({ userId, userEmail, onComplete }: Props) {
  const [step, setStep] = useState(1)
  const [companyName, setCompanyName] = useState('')
  const [appName, setAppName] = useState('Sales Manager')
  const [brandColor, setBrandColor] = useState('#d97706')
  const [logoEmoji, setLogoEmoji] = useState('🏢')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleComplete = async () => {
    if (!companyName.trim()) { setError('Please enter your company name'); return }
    setSaving(true)
    setError('')

    try {
      // 1. Create tenant
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({ name: companyName.trim() })
        .select()
        .single()

      if (tenantErr || !tenant) { setError('Failed to create tenant'); setSaving(false); return }

      // 2. Update profile — set as admin, link to tenant
      await supabase.from('profiles').upsert({
        id: userId,
        email: userEmail,
        is_admin: true,
        tenant_id: tenant.id,
        permissions: {
          can_record_sales: true, can_view_history: true, can_view_stock: true,
          can_add_stock: true, can_view_analytics: true, can_manage_credit: true,
        }
      })

      // 3. Create company settings
      await supabase.from('company_settings').insert({
        admin_id: userId,
        tenant_id: tenant.id,
        company_name: companyName.trim(),
        app_name: appName.trim() || 'Sales Manager',
        brand_color: brandColor,
        logo_emoji: logoEmoji,
      })

      onComplete()
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gray-50">
      <div className="w-full max-w-sm">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-8' : 'w-2 bg-gray-200'}`}
              style={s === step ? { backgroundColor: brandColor, width: 32 } : {}} />
          ))}
        </div>

        {/* Step 1 — Company name */}
        {step === 1 && (
          <div className="slide-up space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-4">👋</div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome!</h1>
              <p className="text-gray-500 text-sm mt-2">Let's set up your business. What's your company called?</p>
            </div>
            <div>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Emeka Farms, Chukwu Stores..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-center text-lg font-medium"
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button
              onClick={() => { if (!companyName.trim()) { setError('Enter your company name'); return } setError(''); setStep(2) }}
              className="w-full text-white font-semibold py-3 rounded-xl text-sm transition-all active:scale-95"
              style={{ backgroundColor: brandColor }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — Pick icon and color */}
        {step === 2 && (
          <div className="slide-up space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-4">{logoEmoji}</div>
              <h1 className="text-xl font-bold text-gray-900">Pick your style</h1>
              <p className="text-gray-500 text-sm mt-1">Choose an icon and color for your app</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Icon</p>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map(e => (
                  <button key={e} onClick={() => setLogoEmoji(e)}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${logoEmoji === e ? 'scale-125' : 'hover:bg-gray-100'}`}
                    style={logoEmoji === e ? { outline: `2px solid ${brandColor}`, backgroundColor: brandColor + '15' } : {}}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Brand Color</p>
              <div className="flex gap-3 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setBrandColor(c)}
                    className={`w-9 h-9 rounded-full transition-all ${brandColor === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)}
                className="flex-1 border border-gray-200 text-gray-500 font-semibold py-3 rounded-xl text-sm">
                ← Back
              </button>
              <button onClick={() => setStep(3)}
                className="flex-1 text-white font-semibold py-3 rounded-xl text-sm"
                style={{ backgroundColor: brandColor }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — App name + confirm */}
        {step === 3 && (
          <div className="slide-up space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-4">{logoEmoji}</div>
              <h1 className="text-xl font-bold text-gray-900">Almost done!</h1>
              <p className="text-gray-500 text-sm mt-1">What should the app be called for your staff?</p>
            </div>

            <div>
              <input
                type="text"
                value={appName}
                onChange={e => setAppName(e.target.value)}
                placeholder="Sales Manager"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 text-center font-medium"
                style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
              />
              <p className="text-xs text-gray-400 text-center mt-1">This is what your staff see when they open the app</p>
            </div>

            {/* Preview */}
            <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: brandColor + '10' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{logoEmoji}</span>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{companyName}</div>
                    <div className="text-xs text-gray-400">{appName || 'Sales Manager'}</div>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: brandColor, color: 'white' }}>⚙</div>
              </div>
              <div className="px-4 py-2 bg-white flex justify-around border-t border-gray-100">
                {['📝', '🗂️', '📦', '📊'].map(icon => (
                  <div key={icon} className="flex flex-col items-center gap-0.5 py-1">
                    <span className="text-lg">{icon}</span>
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: brandColor }} />
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setStep(2)}
                className="flex-1 border border-gray-200 text-gray-500 font-semibold py-3 rounded-xl text-sm">
                ← Back
              </button>
              <button onClick={handleComplete} disabled={saving}
                className="flex-1 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
                style={{ backgroundColor: brandColor }}>
                {saving ? 'Setting up...' : '🚀 Launch'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
