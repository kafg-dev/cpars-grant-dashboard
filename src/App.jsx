import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { setUserToken } from './utils/api'
import Sidebar from './components/Sidebar'
import GrantsPage from './pages/GrantsPage'
import StaffPage from './pages/StaffPage'
import AnimalsPage from './pages/AnimalsPage'
import TasksPage from './pages/TasksPage'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'

function AppInner() {
  const { user, token, loading, logout } = useAuth()
  const [activePage, setActivePage] = useState('grants')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Keep api.js in sync with the current user token
  useEffect(() => { setUserToken(token) }, [token])

  // Handle OAuth callback route
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallbackPage />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <LoginPage />

  function handleNavigate(page) {
    setActivePage(page)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={logout}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {activePage === 'grants'  && <GrantsPage  onMenuClick={() => setSidebarOpen(true)} />}
        {activePage === 'staff'   && <StaffPage   onMenuClick={() => setSidebarOpen(true)} />}
        {activePage === 'animals' && <AnimalsPage onMenuClick={() => setSidebarOpen(true)} />}
        {activePage === 'tasks'   && <TasksPage   onMenuClick={() => setSidebarOpen(true)} user={user} />}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
