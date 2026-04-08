import { useState } from 'react'
import Sidebar from './components/Sidebar'
import GrantsPage from './pages/GrantsPage'
import StaffPage from './pages/StaffPage'
import AnimalsPage from './pages/AnimalsPage'

export default function App() {
  const [activePage, setActivePage] = useState('grants')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="flex-1 overflow-hidden flex flex-col">
        {activePage === 'grants'  && <GrantsPage />}
        {activePage === 'staff'   && <StaffPage />}
        {activePage === 'animals' && <AnimalsPage />}
      </div>
    </div>
  )
}
