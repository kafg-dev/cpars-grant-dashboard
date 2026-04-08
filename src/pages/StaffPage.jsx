import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Users, CheckCircle, Clock, AlertCircle, X, FileText, Menu } from 'lucide-react'
import { fetchAllStaff, transformStaffItem } from '../utils/api'
import { parseTimeText, calcHoursWorked } from '../utils/timeParser'

const REFRESH_INTERVAL = 30

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateKey(date) {
  // Use local date parts to avoid UTC timezone shifts causing off-by-one-day bugs
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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

// Convert a parsed "H:MM AM/PM" string to total minutes since midnight
function toMins(t) {
  if (!t) return null
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!m) return null
  let h = parseInt(m[1])
  const mn = parseInt(m[2])
  const p = m[3].toUpperCase()
  if (p === 'PM' && h !== 12) h += 12
  if (p === 'AM' && h === 12) h = 0
  return h * 60 + mn
}

// Sum all clock in/out pairs for a staff member across the given week days.
// Collects all in-times and out-times per day (since Monday.com stores them
// as separate rows), sorts each list, then pairs them up to sum durations.
function calcWeeklyHours(staffEntries, weekDays) {
  let totalMins = 0
  weekDays.forEach((day) => {
    const dk = toDateKey(day)
    const dayEntries = (staffEntries[dk] || []).filter((e) => e.group.id === 'group_mm02nccy')

    const ins  = []
    const outs = []
    dayEntries.forEach((e) => {
      const inParsed  = e.clockIn  ? toMins(parseTimeText(e.clockIn))  : null
      const outParsed = e.clockOut ? toMins(parseTimeText(e.clockOut)) : null
      if (inParsed  !== null) ins.push(inParsed)
      if (outParsed !== null) outs.push(outParsed)
    })

    ins.sort((a, b) => a - b)
    outs.sort((a, b) => a - b)

    // Pair each in with the next out that comes after it
    let oi = 0
    ins.forEach((inTime) => {
      while (oi < outs.length && outs[oi] <= inTime) oi++
      if (oi < outs.length) {
        totalMins += outs[oi] - inTime
        oi++
      }
    })
  })
  if (totalMins === 0) return null
  const h = Math.floor(totalMins / 60), m = totalMins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
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

// ─── Update Modal ────────────────────────────────────────────────────────────

function UpdateModal({ staffName, date, updates, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-bold text-gray-900 text-lg">{staffName}</div>
            <div className="text-sm text-gray-500">
              {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {updates.map((u, i) => (
            <div key={u.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              {updates.length > 1 && (
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Update {i + 1}
                </div>
              )}
              {updates.length === 1 && (
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Daily Update</div>
              )}
              <p className="text-sm text-gray-700 leading-relaxed">{u.info}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Calendar Cell ─────────────────────────────────────────────────────────────

function CalendarCell({ entries, day }) {
  const future = !isPast(day) && !isToday(day)

  if (future) {
    return (
      <div className="border border-gray-100 rounded-lg p-2 min-h-[72px] bg-gray-50 flex items-center justify-center text-gray-300 text-xs">
        —
      </div>
    )
  }

  // Collect ALL clock events from every row for this staff/day — display parsed clean times
  const events = []
  entries
    .filter((e) => e.group.id === 'group_mm02nccy')
    .forEach((e) => {
      if (e.clockIn)  events.push({ type: 'in',  time: parseTimeText(e.clockIn)  || e.clockIn })
      if (e.clockOut) events.push({ type: 'out', time: parseTimeText(e.clockOut) || e.clockOut })
    })

  const hasIn  = events.some((e) => e.type === 'in')
  const hasOut = events.some((e) => e.type === 'out')
  const updates = entries.filter((e) => e.group.id === 'topics' && e.info)
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className={`border rounded-lg p-2 text-xs space-y-1.5 ${
        hasIn && hasOut ? 'bg-emerald-50 border-emerald-200' :
        hasIn           ? 'bg-amber-50  border-amber-200'   :
                          'bg-gray-50   border-gray-200'
      }`}>
        {/* Clock events */}
        {events.length > 0 ? (
          events.map((ev, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className={`font-bold w-3 ${ev.type === 'in' ? 'text-emerald-500' : 'text-rose-400'}`}>
                {ev.type === 'in' ? '↑' : '↓'}
              </span>
              <span className={`font-semibold ${ev.type === 'in' ? 'text-emerald-700' : 'text-rose-600'}`}>
                {ev.time}
              </span>
            </div>
          ))
        ) : (
          <>
            <div className="flex items-center gap-1">
              <span className="font-bold w-3 text-gray-300">↑</span>
              <span className="text-gray-400 font-semibold">NONE</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold w-3 text-gray-300">↓</span>
              <span className="text-gray-400 font-semibold">NONE</span>
            </div>
          </>
        )}

        {/* Daily update button */}
        {updates.length > 0 && (
          <div className="pt-1 border-t border-gray-200">
            <button
              onClick={(e) => { e.stopPropagation(); setShowModal(true) }}
              className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 font-medium transition"
            >
              <FileText className="w-3 h-3" />
              {updates.length > 1 ? `${updates.length} Updates` : 'View Update'}
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <UpdateModal
          staffName={updates[0].staffName}
          date={updates[0].date}
          updates={updates}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StaffPage({ onMenuClick }) {
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [lastUpdated, setLastUpdated] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)

  const loadData = useCallback(async () => {
    try {
      const raw = await fetchAllStaff()
      const allTransformed = raw.map(transformStaffItem)
      // Debug: log clock group items to see their actual field values
      const clockItems = allTransformed.filter((i) => i.group.id === 'group_mm02nccy')
      console.log('[DEBUG] Total clock items before filter:', clockItems.length)
      console.log('[DEBUG] Sample clock items:', clockItems.slice(0, 5))
      const filtered = allTransformed.filter((i) => i.staffName && i.date)
      console.log('[DEBUG] Clock items surviving filter:', filtered.filter(i => i.group.id === 'group_mm02nccy').length)
      setItems(filtered)
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

  // Stats — based on clock records
  const totalStaff    = staffNames.length
  const clockedInToday = staffNames.filter((n) =>
    lookup[n]?.[todayKey]?.some((i) => i.group.id === 'group_mm02nccy' && i.clockIn)
  ).length
  const missingToday  = totalStaff - clockedInToday
  const weekKeys      = weekDays.map(toDateKey)
  const clockedThisWeek = items.filter((i) =>
    i.group.id === 'group_mm02nccy' && weekKeys.includes(i.date) && i.clockIn
  ).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-700 p-1 -ml-1">
              <Menu className="w-5 h-5" />
            </button>
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
        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-6">
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
              <div><div className="text-2xl font-bold text-emerald-700">{clockedInToday}</div><div className="text-xs text-gray-500 mt-1">Clocked In Today</div></div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 flex items-center gap-3 border border-white shadow-sm">
              <div className="bg-amber-100 text-amber-600 rounded-lg p-2.5"><AlertCircle className="w-5 h-5" /></div>
              <div><div className="text-2xl font-bold text-amber-700">{missingToday}</div><div className="text-xs text-gray-500 mt-1">Missing Today</div></div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3 border border-white shadow-sm">
              <div className="bg-blue-100 text-blue-600 rounded-lg p-2.5"><Clock className="w-5 h-5" /></div>
              <div><div className="text-2xl font-bold text-blue-700">{clockedThisWeek}</div><div className="text-xs text-gray-500 mt-1">Clocked In This Week</div></div>
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
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm overflow-x-auto">
              <div style={{ minWidth: '640px' }}>
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
                      <div>
                        <span className="text-sm font-semibold text-gray-800">{name}</span>
                        {(() => {
                          const hrs = calcWeeklyHours(lookup[name] || {}, weekDays)
                          return hrs ? (
                            <div className="text-xs text-indigo-500 font-medium mt-0.5">{hrs} this week</div>
                          ) : null
                        })()}
                      </div>
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
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200" /><span>Both clocked</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-50 border border-amber-200" /><span>Clock in only</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-50 border border-gray-200" /><span>No record (NONE)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-50 border border-gray-100" /><span>Future</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
