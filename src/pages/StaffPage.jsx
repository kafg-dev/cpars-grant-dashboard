import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Users, CheckCircle, Clock, AlertCircle, X } from 'lucide-react'
import { fetchAllStaff, transformStaffItem } from '../utils/api'
import { parseTimeText, calcHoursWorked } from '../utils/timeParser'

const REFRESH_INTERVAL = 30

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateKey(date) {
  return date.toISOString().split('T')[0] // "YYYY-MM-DD"
}

function getWeekStart(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay()) // back to Sunday
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

function fmtDay(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
}

function fmtWeekRange(weekStart) {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const opts = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${weekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

function isToday(date) {
  return toDateKey(date) === toDateKey(new Date())
}

function isPast(date) {
  const today = new Date(); today.setHours(0,0,0,0)
  return date < today
}

// ─── Update Modal ─────────────────────────────────────────────────────────────

function UpdateModal({ entry, onClose }) {
  if (!entry) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-bold text-gray-900 text-lg">{entry.staffName}</div>
            <div className="text-sm text-gray-500">
              {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {entry.info && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Daily Update</div>
            <p className="text-sm text-gray-700 leading-relaxed">{entry.info}</p>
          </div>
        )}

        {(entry.clockIn || entry.clockOut) && (() => {
          const inTime  = parseTimeText(entry.clockIn)
          const outTime = parseTimeText(entry.clockOut)
          const hours   = calcHoursWorked(inTime, outTime)
          return (
            <div className="space-y-2">
              <div className="flex gap-3">
                {inTime && (
                  <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                    <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">Clock In</div>
                    <div className="text-2xl font-bold text-emerald-700">{inTime}</div>
                  </div>
                )}
                {outTime && (
                  <div className="flex-1 bg-rose-50 rounded-xl p-3 text-center border border-rose-100">
                    <div className="text-xs text-rose-600 font-semibold uppercase tracking-wider mb-1">Clock Out</div>
                    <div className="text-2xl font-bold text-rose-700">{outTime}</div>
                  </div>
                )}
              </div>
              {hours && (
                <div className="bg-indigo-50 rounded-xl p-3 text-center border border-indigo-100">
                  <div className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mb-0.5">Hours Worked</div>
                  <div className="text-2xl font-bold text-indigo-700">{hours}</div>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ─── Calendar Cell ─────────────────────────────────────────────────────────────

function CalendarCell({ entries, day }) {
  const [selected, setSelected] = useState(null)
  const update = entries.find((e) => e.group.id === 'topics')
  const clock  = entries.find((e) => e.group.id === 'group_mm02nccy')
  const merged = update ? { ...update, clockIn: clock?.clockIn || '', clockOut: clock?.clockOut || '' } : null

  const today   = isToday(day)
  const past    = isPast(day)
  const future  = !past && !today
  const hasData = !!update

  let cellCls = 'border rounded-lg p-2.5 min-h-[80px] text-xs transition-all '
  if (hasData)        cellCls += 'bg-emerald-50 border-emerald-200 cursor-pointer hover:bg-emerald-100'
  else if (future)    cellCls += 'bg-gray-50 border-gray-100 text-gray-300'
  else if (today)     cellCls += 'bg-amber-50 border-amber-200'
  else                cellCls += 'bg-red-50 border-red-100'

  return (
    <>
      <div className={cellCls} onClick={() => hasData && setSelected(merged)}>
        {hasData ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="text-emerald-700 font-semibold">Submitted</span>
            </div>
            <p className="text-gray-500 line-clamp-2 leading-snug">{update.info}</p>
            {(clock?.clockIn || clock?.clockOut) && (() => {
              const inTime  = parseTimeText(clock.clockIn)
              const outTime = parseTimeText(clock.clockOut)
              const hours   = calcHoursWorked(inTime, outTime)
              return (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {inTime  && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">↑ {inTime}</span>}
                  {outTime && <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-medium">↓ {outTime}</span>}
                  {hours   && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">{hours}</span>}
                </div>
              )
            })()}
          </div>
        ) : future ? (
          <span className="text-gray-300">—</span>
        ) : today ? (
          <div className="flex items-center gap-1 text-amber-600">
            <AlertCircle className="w-3 h-3" />
            <span className="font-medium">Pending</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-red-400">
            <AlertCircle className="w-3 h-3" />
            <span>No entry</span>
          </div>
        )}
      </div>
      {selected && <UpdateModal entry={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [lastUpdated, setLastUpdated] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)

  const loadData = useCallback(async () => {
    try {
      const raw = await fetchAllStaff()
      setItems(raw.map(transformStaffItem).filter((i) => i.staffName && i.date))
      setLastUpdated(new Date())
      setCountdown(REFRESH_INTERVAL)
      setError(null)
    } catch (err) {
      setError('Could not reach Monday.com. Will retry automatically.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, REFRESH_INTERVAL * 1000)
    return () => clearInterval(interval)
  }, [loadData])

  useEffect(() => {
    if (!lastUpdated) return
    const t = setInterval(() => setCountdown((p) => (p <= 1 ? REFRESH_INTERVAL : p - 1)), 1000)
    return () => clearInterval(t)
  }, [lastUpdated])

  const weekDays    = getWeekDays(weekStart)
  const todayKey    = toDateKey(new Date())

  // Unique staff names (sorted)
  const staffNames  = [...new Set(items.map((i) => i.staffName))].sort()

  // Build lookup: staffName -> dateKey -> [items]
  const lookup = {}
  items.forEach((item) => {
    if (!lookup[item.staffName]) lookup[item.staffName] = {}
    const dk = item.date
    if (!lookup[item.staffName][dk]) lookup[item.staffName][dk] = []
    lookup[item.staffName][dk].push(item)
  })

  // Stats
  const totalStaff     = staffNames.length
  const submittedToday = staffNames.filter((n) => lookup[n]?.[todayKey]?.some((i) => i.group.id === 'topics')).length
  const pendingToday   = totalStaff - submittedToday
  const weekKeys       = weekDays.map(toDateKey)
  const updatesThisWeek = items.filter((i) => i.group.id === 'topics' && weekKeys.includes(i.date)).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Staff Activity & Attendance</h1>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              CPARS · Live from Monday.com
              {lastUpdated && <span className="ml-2 text-gray-400">· Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{loading ? 'Refreshing…' : `Refresh in ${countdown}s`}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="px-6 py-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-indigo-50 rounded-xl p-4 flex items-center gap-3 border border-white shadow-sm">
              <div className="bg-indigo-100 text-indigo-600 rounded-lg p-2.5"><Users className="w-5 h-5" /></div>
              <div><div className="text-2xl font-bold text-indigo-700">{totalStaff}</div><div className="text-xs text-gray-500 mt-1">Total Staff</div></div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3 border border-white shadow-sm">
              <div className="bg-emerald-100 text-emerald-600 rounded-lg p-2.5"><CheckCircle className="w-5 h-5" /></div>
              <div><div className="text-2xl font-bold text-emerald-700">{submittedToday}</div><div className="text-xs text-gray-500 mt-1">Submitted Today</div></div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 flex items-center gap-3 border border-white shadow-sm">
              <div className="bg-amber-100 text-amber-600 rounded-lg p-2.5"><AlertCircle className="w-5 h-5" /></div>
              <div><div className="text-2xl font-bold text-amber-700">{pendingToday}</div><div className="text-xs text-gray-500 mt-1">Pending Today</div></div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3 border border-white shadow-sm">
              <div className="bg-blue-100 text-blue-600 rounded-lg p-2.5"><Clock className="w-5 h-5" /></div>
              <div><div className="text-2xl font-bold text-blue-700">{updatesThisWeek}</div><div className="text-xs text-gray-500 mt-1">Updates This Week</div></div>
            </div>
          </div>

          {/* Week Navigator */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() - 7); return d })}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-gray-800 text-sm min-w-[220px] text-center">
              {fmtWeekRange(weekStart)}
            </span>
            <button
              onClick={() => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() + 7); return d })}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeekStart(getWeekStart(new Date()))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 transition text-gray-600"
            >
              This Week
            </button>
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
            </div>
          ) : staffNames.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Users className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">No staff data found</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Day headers */}
              <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: '140px repeat(7, 1fr)' }}>
                <div className="px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider border-r border-gray-200">
                  Staff Member
                </div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`px-2 py-2.5 text-center text-xs font-semibold border-r border-gray-100 last:border-0 ${
                      isToday(day) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500'
                    }`}
                  >
                    {fmtDay(day)}
                    {isToday(day) && <span className="ml-1 text-[9px] bg-indigo-200 text-indigo-700 rounded px-1">Today</span>}
                  </div>
                ))}
              </div>

              {/* Staff rows */}
              {staffNames.map((name, ri) => (
                <div
                  key={name}
                  className={`grid border-b border-gray-100 last:border-0 ${ri % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                  style={{ gridTemplateColumns: '140px repeat(7, 1fr)' }}
                >
                  {/* Name cell */}
                  <div className="px-3 py-2.5 border-r border-gray-200 flex items-start pt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{name}</span>
                    </div>
                  </div>

                  {/* Day cells */}
                  {weekDays.map((day) => {
                    const dk = toDateKey(day)
                    const entries = lookup[name]?.[dk] || []
                    return (
                      <div key={dk} className="p-1.5 border-r border-gray-100 last:border-0">
                        <CalendarCell entries={entries} day={day} />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" /><span>Submitted</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-50 border border-amber-200" /><span>Pending (today)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-50 border border-red-100" /><span>No entry (past)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-50 border border-gray-100" /><span>Future</span></div>
            <span className="ml-2 italic">Click a green cell to read the full update</span>
          </div>
        </div>
      </div>
    </div>
  )
}
