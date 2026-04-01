import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface CompanySettings { company_name: string; app_name: string; brand_color: string; logo_emoji: string }
interface Props { company: CompanySettings }

export default function Auth({ company }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: company.brand_color + '15' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{company.logo_emoji}</div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{company.company_name}</h1>
          <p className="text-gray-500 text-sm mt-1">{company.app_name}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex bg-gray-50 rounded-xl p-1 mb-6">
            <button onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'login' ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              style={mode === 'login' ? { backgroundColor: company.brand_color } : {}}>
              Log In
            </button>
            <button onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'signup' ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              style={mode === 'signup' ? { backgroundColor: company.brand_color } : {}}>
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': company.brand_color } as React.CSSProperties} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent" />
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            {message && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">{message}</div>}

            <button type="submit" disabled={loading}
              className="w-full disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              style={{ backgroundColor: company.brand_color }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
