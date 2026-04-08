import { Award, Users, PawPrint, LayoutGrid, ChevronRight } from 'lucide-react'

const NAV_ITEMS = [
  {
    section: 'GRANTS',
    items: [
      { id: 'grants', label: 'Grants',        icon: Award,      live: true },
    ],
  },
  {
    section: 'OPERATIONS',
    items: [
      { id: 'staff',  label: 'Staff',          icon: Users,      live: true },
      { id: 'animals',label: 'Animals',        icon: PawPrint,   live: true  },
    ],
  },
  {
    section: 'COMING SOON',
    items: [
      { id: 'donors',  label: 'Donors',        icon: LayoutGrid, live: false },
      { id: 'social',  label: 'Social Media',  icon: LayoutGrid, live: false },
    ],
  },
]

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="w-56 shrink-0 bg-slate-900 flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
            <PawPrint className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-wide">CPARS</div>
            <div className="text-slate-400 text-xs">Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {NAV_ITEMS.map((group) => (
          <div key={group.section}>
            <div className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest px-2 mb-1">
              {group.section}
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ id, label, icon: Icon, live }) => {
                const isActive = activePage === id
                return (
                  <button
                    key={id}
                    onClick={() => live && onNavigate(id)}
                    disabled={!live}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all
                      ${isActive
                        ? 'bg-indigo-600 text-white'
                        : live
                          ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          : 'text-slate-600 cursor-not-allowed'
                      }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">{label}</span>
                    {!live && (
                      <span className="text-[9px] bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                        Soon
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700">
        <div className="text-slate-500 text-xs">Animal Sanctuary Ops</div>
      </div>
    </aside>
  )
}
