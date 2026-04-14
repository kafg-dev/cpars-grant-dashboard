import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('monday_token'))
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async (accessToken) => {
    try {
      const res = await fetch('/monday-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: accessToken },
        body: JSON.stringify({ query: '{ me { id name email photo_thumb } }' }),
      })
      const json = await res.json()
      const me = json.data?.me
      if (me) setUser(me)
      else logout()
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) fetchUser(token)
    else setLoading(false)
  }, [token, fetchUser])

  function login() {
    const clientId    = import.meta.env.VITE_MONDAY_CLIENT_ID
    console.log('[OAuth] client_id:', clientId)
    if (!clientId) { alert('VITE_MONDAY_CLIENT_ID is not set — check Vercel env vars'); return }
    const redirectUri = `${window.location.origin}/auth/callback`
    const scopes      = 'me:read boards:read boards:write updates:write'
    window.location.href = `https://auth.monday.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`
  }

  function logout() {
    localStorage.removeItem('monday_token')
    setToken(null)
    setUser(null)
  }

  function saveToken(accessToken) {
    localStorage.setItem('monday_token', accessToken)
    setToken(accessToken)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, saveToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
