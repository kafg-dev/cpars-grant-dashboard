import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(() => {
    // Clear token so users re-auth with updated scopes
    localStorage.removeItem('monday_token')
    return null
  })
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async (accessToken) => {
    try {
      const res = await fetch('/monday-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: accessToken },
        body: JSON.stringify({ query: '{ me { id name email } }' }),
      })
      const json = await res.json()
      console.log('[fetchUser]', JSON.stringify(json).slice(0, 200))
      const me = json.data?.me
      if (me) setUser(me)
      else {
        // Don't logout on error — could be a network blip
        console.warn('[fetchUser] no me data, errors:', json.errors)
        setLoading(false)
      }
    } catch (e) {
      console.error('[fetchUser] error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) fetchUser(token)
    else setLoading(false)
  }, [token, fetchUser])

  function login() {
    const clientId = import.meta.env.VITE_MONDAY_CLIENT_ID
    window.location.href = `https://auth.monday.com/oauth2/authorize?client_id=${clientId}`
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
