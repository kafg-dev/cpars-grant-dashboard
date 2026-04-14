import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const CLIENT_ID    = import.meta.env.VITE_MONDAY_CLIENT_ID
const REDIRECT_URI = `${window.location.origin}/auth/callback`
const SCOPES       = 'me:read boards:read boards:write updates:write'

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('monday_token'))
  const [loading, setLoading] = useState(true)

  // Fetch user info with the stored token
  const fetchUser = useCallback(async (accessToken) => {
    try {
      const res = await fetch('https://api.monday.com/v2', {
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
    const url = `https://auth.monday.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`
    window.location.href = url
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
