import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  userId: string
  email: string
  onComplete: () => void
}

export default function BusinessRegistration({ userId, email, onComplete }: Props) {
  const [businessName, setBusinessName] = useState('')
  const [appName, setAppName] = useState('Sales Manager')
  const [brandColor, setBrandColor] = useState('#d97706')
  const [logoEmoji, setLogoEmoji] = useState('🏢')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) {
        throw new Error('You must be signed in to complete business registration.')
      }
      // Create tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: businessName,
          plan: 'free',
          monthly_sales_limit: 50,
          created_by: userId
        })
        .select()
        .single()

      if (tenantError) throw tenantError

      const tenantId = tenantData.id

      // Create company settings
      const { error: companyError } = await supabase
        .from('company_settings')
        .insert({
          admin_id: userId,
          company_name: businessName,
          app_name: appName,
          brand_color: brandColor,
          logo_emoji: logoEmoji
        })

      if (companyError) throw companyError

      // Create admin profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          is_admin: true,
          tenant_id: tenantId,
          permissions: {
            can_record_sales: true,
            can_view_history: true,
            can_view_stock: true,
            can_add_stock: true,
            can_view_analytics: true,
            can_manage_credit: true
          }
        })

      if (profileError) throw profileError

      onComplete()
    } catch (err: any) {
      console.error('Business registration error:', err)
      setError(err.message || 'Failed to set up business. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const colorOptions = [
    { value: '#d97706', label: 'Orange', bg: 'bg-orange-500' },
    { value: '#059669', label: 'Green', bg: 'bg-green-500' },
    { value: '#2563eb', label: 'Blue', bg: 'bg-blue-500' },
    { value: '#dc2626', label: 'Red', bg: 'bg-red-500' },
    { value: '#7c3aed', label: 'Purple', bg: 'bg-purple-500' },
    { value: '#0891b2', label: 'Cyan', bg: 'bg-cyan-500' },
  ]

  const emojiOptions = [
    '🏢', '🏪', '🏬', '🏭', '🏪', '🏨', '🏥', '🏫', '🏛️', '🏗️',
    '🏪', '🏬', '🏭', '🏪', '🏨', '🏥', '🏫', '🏛️', '🏗️', '🏢'
  ]

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 slide-up">
          <div className="text-5xl mb-3">🚀</div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Set Up Your Business</h1>
          <p className="text-gray-500 text-sm mt-1">Let's get your sales tracking started</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 slide-up space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Business Name */}
            <div className="space-y-2">
              <label htmlFor="business-name" className="block text-sm font-medium text-gray-700">
                Business Name <span aria-label="required">*</span>
              </label>
              <input
                id="business-name"
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                required
                placeholder="My Poultry Business"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                aria-required="true"
              />
            </div>

            {/* App Name */}
            <div className="space-y-2">
              <label htmlFor="app-name" className="block text-sm font-medium text-gray-700">
                App Display Name
              </label>
              <input
                id="app-name"
                type="text"
                value={appName}
                onChange={e => setAppName(e.target.value)}
                placeholder="Sales Manager"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <p className="text-xs text-gray-400">How your app will be named in the interface</p>
            </div>

            {/* Brand Color */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Brand Color
              </label>
              <div className="grid grid-cols-3 gap-2">
                {colorOptions.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setBrandColor(color.value)}
                    className={`h-10 rounded-xl border-2 transition-all ${
                      brandColor === color.value ? 'border-gray-900 scale-105' : 'border-gray-200'
                    } ${color.bg} flex items-center justify-center`}
                    aria-label={`Select ${color.label} color`}
                  >
                    {brandColor === color.value && <span className="text-white text-sm">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Emoji */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Logo Emoji
              </label>
              <div className="grid grid-cols-5 gap-2">
                {emojiOptions.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setLogoEmoji(emoji)}
                    className={`h-10 text-xl rounded-xl border-2 transition-all ${
                      logoEmoji === emoji ? 'border-gray-900 scale-105 bg-gray-50' : 'border-gray-200'
                    } flex items-center justify-center`}
                    aria-label={`Select ${emoji} emoji`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Preview</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{logoEmoji}</span>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{businessName || 'Business Name'}</div>
                  <div className="text-xs text-gray-500">{appName || 'App Name'}</div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2 font-medium" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !businessName.trim()}
              aria-busy={loading}
              className="w-full disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-all active:scale-95"
              style={{ backgroundColor: brandColor }}
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </form>

          <div className="text-center">
            <p className="text-xs text-gray-400">
              Free plan: 50 sales per month • Upgrade anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}