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

  // Redirect to serverless function which builds the OAuth URL server-side
  function login() {
    window.location.href = '/api/auth/login'
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
