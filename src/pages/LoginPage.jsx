import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { saveToken, fetchUser } = useAuth()
  const [token, setToken] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/monday-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token.trim() },
        body: JSON.stringify({ query: '{ me { id name email } }' }),
      })
      const json = await res.json()
      const me = json.data?.me
      if (me) {
        saveToken(token.trim())
      } else {
        setError('Invalid token — please check and try again.')
      }
    } catch {
      setError('Could not connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full space-y-6 border border-gray-100">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CPARS Dashboard</h1>
          <p className="text-gray-500 text-sm">Enter your Monday.com API token to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Paste your API token…"
            className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={loading || !token.trim()}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-40">
            {loading ? 'Verifying…' : 'Sign In'}
          </button>
        </form>

        <div className="text-xs text-gray-400 space-y-1 border-t border-gray-100 pt-4">
          <p className="font-medium text-gray-500">How to get your token:</p>
          <p>1. Go to monday.com → click your avatar</p>
          <p>2. Developers → My Access Tokens</p>
          <p>3. Copy and paste it above</p>
        </div>
      </div>
    </div>
  )
}
