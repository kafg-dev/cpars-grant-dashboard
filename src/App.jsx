import { useState } from 'react'
import Sidebar from './components/Sidebar'
import GrantsPage from './pages/GrantsPage'
import StaffPage from './pages/StaffPage'
import AnimalsPage from './pages/AnimalsPage'
import TasksPage from './pages/TasksPage'

export default function App() {
  const [activePage, setActivePage] = useState('grants')
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {activePage === 'grants'  && <GrantsPage  onMenuClick={() => setSidebarOpen(true)} />}
        {activePage === 'staff'   && <StaffPage   onMenuClick={() => setSidebarOpen(true)} />}
        {activePage === 'animals' && <AnimalsPage onMenuClick={() => setSidebarOpen(true)} />}
        {activePage === 'tasks'   && <TasksPage  onMenuClick={() => setSidebarOpen(true)} />}
      </div>
    </div>
  )
}
