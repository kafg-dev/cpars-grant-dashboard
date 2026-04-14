import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthCallbackPage() {
  const { saveToken } = useAuth()
  const [error, setError] = useState(null)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) { setError('No authorization code received.'); return }

    fetch(`/api/auth/callback?code=${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.access_token) {
          saveToken(data.access_token)
          window.location.href = '/'
        } else {
          setError(data.error || 'Authentication failed.')
        }
      })
      .catch(() => setError('Network error during authentication.'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        {error ? (
          <>
            <p className="text-red-600 font-medium">{error}</p>
            <a href="/" className="text-indigo-600 text-sm underline">Go back</a>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 text-sm">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  )
}
