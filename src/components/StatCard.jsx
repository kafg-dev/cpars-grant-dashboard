import {
  ClipboardList,
  Activity,
  Clock,
  DollarSign,
  Trophy,
  CheckCircle,
} from 'lucide-react'

const ICONS = {
  clipboard: ClipboardList,
  activity:  Activity,
  clock:     Clock,
  dollar:    DollarSign,
  trophy:    Trophy,
  check:     CheckCircle,
}

const COLOR_MAP = {
  blue:    { bg: 'bg-blue-50',    icon: 'bg-blue-100 text-blue-600',    text: 'text-blue-700' },
  indigo:  { bg: 'bg-indigo-50',  icon: 'bg-indigo-100 text-indigo-600', text: 'text-indigo-700' },
  amber:   { bg: 'bg-amber-50',   icon: 'bg-amber-100 text-amber-600',   text: 'text-amber-700' },
  violet:  { bg: 'bg-violet-50',  icon: 'bg-violet-100 text-violet-600', text: 'text-violet-700' },
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700' },
  green:   { bg: 'bg-green-50',   icon: 'bg-green-100 text-green-600',   text: 'text-green-700' },
}

export default function StatCard({ label, value, color = 'blue', icon }) {
  const Icon = ICONS[icon] || ClipboardList
  const c = COLOR_MAP[color]

  return (
    <div className={`${c.bg} rounded-xl p-4 flex items-center gap-3 border border-white shadow-sm`}>
      <div className={`${c.icon} rounded-lg p-2.5 shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className={`text-2xl font-bold ${c.text} leading-none`}>{value}</div>
        <div className="text-xs text-gray-500 mt-1 leading-tight">{label}</div>
      </div>
    </div>
  )
}
