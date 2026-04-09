import { useState } from 'react'
import { supabase } from '../lib/supabase'
import BusinessRegistration from './BusinessRegistration'

interface CompanySettings { company_name: string; app_name: string; brand_color: string; logo_emoji: string }
interface Props { company: CompanySettings }

export default function Auth({ company }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showBusinessRegistration, setShowBusinessRegistration] = useState(false)
  const [newUserData, setNewUserData] = useState<{ id: string; email: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setMessage('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.user) {
        setNewUserData({ id: data.user.id, email: data.user.email || email })
        setShowBusinessRegistration(true)
      }
    }
    setLoading(false)
  }

  const handleBusinessRegistrationComplete = () => {
    setShowBusinessRegistration(false)
    setNewUserData(null)
    // The auth state change will automatically redirect to the main app
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    setGoogleLoading(false)
  }

  if (showBusinessRegistration && newUserData) {
    return <BusinessRegistration
      userId={newUserData.id}
      email={newUserData.email}
      onComplete={handleBusinessRegistrationComplete}
    />
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: company.brand_color + '15' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 slide-up">
          <div className="text-5xl mb-3">{company.logo_emoji}</div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{company.company_name}</h1>
          <p className="text-gray-500 text-sm mt-1">{company.app_name}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 slide-up space-y-4">
          {/* Google sign in */}
          <button 
            onClick={handleGoogle} 
            disabled={googleLoading}
            aria-label="Sign in with Google"
            className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-60">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Tab switcher */}
          <div className="flex bg-gray-50 rounded-xl p-1">
            <button 
              onClick={() => setMode('login')}
              aria-pressed={mode === 'login'}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'login' ? 'text-white shadow-sm' : 'text-gray-600'}`}
              style={mode === 'login' ? { backgroundColor: company.brand_color } : {}}>
              Log In
            </button>
            <button 
              onClick={() => setMode('signup')}
              aria-pressed={mode === 'signup'}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'signup' ? 'text-white shadow-sm' : 'text-gray-600'}`}
              style={mode === 'signup' ? { backgroundColor: company.brand_color } : {}}>
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email-input" className="block text-sm font-medium text-gray-700">
                Email address <span aria-label="required">*</span>
              </label>
              <input 
                id="email-input"
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" 
                aria-required="true"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password-input" className="block text-sm font-medium text-gray-700">
                Password <span aria-label="required">*</span>
              </label>
              <input 
                id="password-input"
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" 
                aria-required="true"
              />
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2 font-medium" role="alert">{error}</div>}

            <button 
              type="submit" 
              disabled={loading}
              aria-busy={loading}
              className="w-full disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-all active:scale-95"
              style={{ backgroundColor: company.brand_color }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
