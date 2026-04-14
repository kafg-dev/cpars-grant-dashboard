import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Plus, MessageSquare, X, Send, ExternalLink, CheckCircle, Clock, Circle, Menu, FileText, ChevronDown, Search } from 'lucide-react'
import { fetchAllTasks, transformTask, fetchTaskUpdates, createTaskUpdate, createTask, updateTaskStatus, fetchSubitems } from '../utils/api'

const REFRESH_INTERVAL = 30

const STATUS_OPTIONS = [
  { label: '',               display: 'No Status',      color: 'text-gray-400'   },
  { label: 'Working on it', display: 'Working on it',  color: 'text-amber-600'  },
  { label: 'Done',          display: 'Done',            color: 'text-emerald-600'},
  { label: 'Stuck',         display: 'Stuck',           color: 'text-red-600'    },
  { label: 'In Review',     display: 'In Review',       color: 'text-purple-600' },
]

// ─── Status badge (display only) ─────────────────────────────────────────────

function statusStyle(value) {
  const lower = (value || '').toLowerCase()
  if (lower.includes('done'))    return 'bg-emerald-100 text-emerald-700'
  if (lower.includes('working')) return 'bg-amber-100   text-amber-700'
  if (lower.includes('stuck'))   return 'bg-red-100     text-red-600'
  if (lower.includes('review'))  return 'bg-purple-100  text-purple-700'
  return 'bg-gray-100 text-gray-400'
}

function statusIcon(value) {
  const lower = (value || '').toLowerCase()
  if (lower.includes('done'))    return <CheckCircle className="w-3 h-3" />
  if (lower.includes('working')) return <Clock className="w-3 h-3" />
  return <Circle className="w-3 h-3" />
}

// ─── Inline status picker ─────────────────────────────────────────────────────

function StatusPicker({ task, onChanged }) {
  const [open, setOpen]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const ref                   = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function pick(label) {
    setOpen(false)
    if (label === task.status || !task.statusColumnId) return
    setSaving(true)
    try {
      await updateTaskStatus(task.id, task.statusColumnId, label)
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  const current = task.status

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        disabled={saving}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition hover:opacity-80 ${statusStyle(current)} ${saving ? 'opacity-50' : ''}`}
      >
        {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : statusIcon(current)}
        {current || 'No Status'}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={(e) => { e.stopPropagation(); pick(opt.label) }}
              className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition flex items-center gap-2 ${opt.color} ${opt.label === current ? 'bg-gray-50' : ''}`}
            >
              {opt.label === current && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              {opt.display}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Updates + Add Update Modal ───────────────────────────────────────────────

function UpdatesModal({ task, onClose }) {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody]       = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    fetchTaskUpdates(task.id).then((data) => { setUpdates(data); setLoading(false) }).catch(() => setLoading(false))
  }, [task.id])

  useEffect(() => { load() }, [load])

  async function handleSend() {
    if (!body.trim()) return
    setSending(true); setError(null)
    try { await createTaskUpdate(task.id, body.trim()); setBody(''); load() }
    catch { setError('Failed to send. Please try again.') }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <div className="font-bold text-gray-900 text-base leading-snug">{task.name}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyle(task.status)}`}>
                {statusIcon(task.status)}{task.status || 'No Status'}
              </span>
              {task.group?.title && <span className="text-xs text-gray-400">{task.group.title}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition ml-3 shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : updates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No updates yet. Be the first!</p>
          ) : updates.map((u) => {
            const images = (u.assets || []).filter(a => ['jpg','jpeg','png','gif','webp'].includes((a.file_extension||'').toLowerCase().replace(/^\./,'')))
            const others = (u.assets || []).filter(a => !images.includes(a))
            return (
              <div key={u.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  {u.creator?.name && <span className="text-xs font-semibold text-indigo-600">{u.creator.name}</span>}
                  <span className="text-xs text-gray-400 ml-auto">{new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {u.text_body && <p className="text-sm text-gray-700 leading-relaxed">{u.text_body}</p>}
                {images.length > 0 && (
                  <div className={`grid gap-2 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {images.map(a => <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"><img src={a.url} alt={a.name} className="w-full rounded-lg object-cover max-h-40 hover:opacity-90 transition" /></a>)}
                  </div>
                )}
                {others.map(a => (
                  <a key={a.id} href={`https://docs.google.com/viewer?url=${encodeURIComponent(a.url)}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition">
                    <FileText className="w-3.5 h-3.5" />{a.name}
                  </a>
                ))}
              </div>
            )
          })}
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-gray-100 space-y-2">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <textarea
              value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="Write an update…" rows={2}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend() }}
            />
            <button onClick={handleSend} disabled={sending || !body.trim()}
              className="self-end px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400">Cmd+Enter to send</p>
        </div>
      </div>
    </div>
  )
}

// ─── New Task Modal ───────────────────────────────────────────────────────────

function NewTaskModal({ groups, onClose, onCreated }) {
  const [name, setName]       = useState('')
  const [groupId, setGroupId] = useState(groups[0]?.id || '')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  async function handleCreate() {
    if (!name.trim() || !groupId) return
    setSaving(true); setError(null)
    try { await createTask(groupId, name.trim()); onCreated(); onClose() }
    catch { setError('Failed to create task. Please try again.'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Task name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="What needs to be done?" autoFocus
              className="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Group</label>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
              className="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
              {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-600">Cancel</button>
          <button onClick={handleCreate} disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2.5 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-40 font-semibold">
            {saving ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Task Row (recursive — handles subitems and sub-subitems) ────────────────

function TaskRow({ task, depth, onSelect, onChanged }) {
  const [expanded, setExpanded]   = useState(false)
  const [subitems, setSubitems]   = useState([])
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [loaded, setLoaded]       = useState(false)
  const hasChildren = task.hasSubitems

  async function handleExpand() {
    const next = !expanded
    setExpanded(next)
    if (next && !loaded) {
      setLoadingSubs(true)
      try {
        const subs = await fetchSubitems(task.id)
        setSubitems(subs)
        setLoaded(true)
      } finally {
        setLoadingSubs(false)
      }
    }
  }

  const indent = depth === 0 ? 'pl-4' : depth === 1 ? 'pl-10' : 'pl-16'
  const bgHover = depth === 0 ? 'hover:bg-gray-50' : depth === 1 ? 'hover:bg-indigo-50/40' : 'hover:bg-purple-50/40'
  const nameSz  = depth === 0 ? 'text-sm font-medium' : 'text-xs font-normal'

  return (
    <>
      <div className={`flex items-center pr-4 py-2.5 transition group ${indent} ${bgHover}`}>
        {/* Expand arrow or spacer */}
        <div className="w-4 shrink-0 mr-1.5">
          {hasChildren ? (
            <button onClick={handleExpand} className="text-gray-400 hover:text-gray-600 transition">
              {loadingSubs
                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${expanded ? '' : '-rotate-90'}`} />
              }
            </button>
          ) : (
            <span className="block w-3.5 h-3.5" />
          )}
        </div>

        {/* Depth indicator dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 mr-2 ${depth === 0 ? 'bg-indigo-200' : 'bg-gray-200'}`} />

        {/* Name */}
        <div className="flex-1 min-w-0 mr-3">
          <div className={`${nameSz} text-gray-800 truncate`}>{task.name}</div>
          {task.timeline && <div className="text-[10px] text-gray-400 mt-0.5">{task.timeline}</div>}
        </div>

        {/* People — fixed width, first names */}
        <div className="hidden sm:flex w-36 shrink-0 mr-3">
          {task.assignees?.length > 0 ? (
            <span className="text-xs text-gray-500 truncate">
              {task.assignees.map(p => p.name.split(' ')[0]).join(', ')}
            </span>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </div>

        {/* Status picker — fixed width */}
        <div className="w-32 shrink-0 mr-2">
          <StatusPicker task={task} onChanged={onChanged} />
        </div>

        {/* Notes link */}
        {task.notesUrl && (
          <a href={task.notesUrl} target="_blank" rel="noopener noreferrer"
            className="shrink-0 text-indigo-400 hover:text-indigo-600 transition" title="Open notes">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Updates */}
        <button
          onClick={() => onSelect(task)}
          className="shrink-0 flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition opacity-0 group-hover:opacity-100 px-2 py-1 rounded-lg hover:bg-indigo-50"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Updates</span>
        </button>
      </div>

      {/* Subitems — loaded on demand */}
      {expanded && subitems.map((sub) => (
        <TaskRow key={sub.id} task={sub} depth={depth + 1} onSelect={onSelect} onChanged={onChanged} />
      ))}
    </>
  )
}

// ─── Group color helper ───────────────────────────────────────────────────────

function groupAccent(title = '') {
  const t = title.toLowerCase()
  if (t.includes('done'))         return { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' }
  if (t.includes('social'))       return { bar: 'bg-pink-500',    text: 'text-pink-600',    bg: 'bg-pink-50'    }
  if (t.includes('fundraising') || t.includes('grant') || t.includes('donor'))
                                   return { bar: 'bg-fuchsia-500', text: 'text-fuchsia-600', bg: 'bg-fuchsia-50' }
  if (t.includes('arfss'))        return { bar: 'bg-teal-500',    text: 'text-teal-600',    bg: 'bg-teal-50'    }
  if (t.includes('rescue') || t.includes('alliance') || t.includes('shiftgives'))
                                   return { bar: 'bg-blue-500',   text: 'text-blue-600',    bg: 'bg-blue-50'    }
  return                           { bar: 'bg-indigo-500',        text: 'text-indigo-600',  bg: 'bg-indigo-50'  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage({ onMenuClick }) {
  const [tasks, setTasks]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [countdown, setCountdown]   = useState(REFRESH_INTERVAL)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showNewTask, setShowNewTask]   = useState(false)
  const [collapsed, setCollapsed]   = useState(new Set())
  const [activePerson, setActivePerson] = useState('all')
  const [search, setSearch]         = useState('')

  const loadData = useCallback(async () => {
    try {
      const raw = await fetchAllTasks()
      setTasks(raw.map(transformTask))
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

  function toggleCollapse(gid) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(gid) ? next.delete(gid) : next.add(gid)
      return next
    })
  }

  // Build person list from all tasks
  const personMap = {}
  tasks.forEach(t => {
    if (t.assigneeNames) {
      t.assigneeNames.split(',').forEach(name => {
        const n = name.trim()
        if (n) personMap[n] = true
      })
    }
  })
  const people = Object.keys(personMap).sort()

  // Filter tasks by selected person + search
  const searchLower = search.toLowerCase()
  const filteredTasks = tasks.filter(t => {
    const matchesPerson = activePerson === 'all' || t.assigneeNames?.toLowerCase().includes(activePerson.toLowerCase())
    const matchesSearch = !searchLower || t.name.toLowerCase().includes(searchLower)
    return matchesPerson && matchesSearch
  })

  // Group tasks
  const groupMap = {}
  filteredTasks.forEach((t) => {
    const gid = t.group?.id
    if (!groupMap[gid]) groupMap[gid] = { id: gid, title: t.group?.title || '', tasks: [] }
    groupMap[gid].tasks.push(t)
  })
  const groups = Object.values(groupMap)

  // Stats
  const total    = filteredTasks.length
  const done     = filteredTasks.filter(t => t.status?.toLowerCase().includes('done')).length
  const inProg   = filteredTasks.filter(t => t.status?.toLowerCase().includes('working')).length
  const groupCount = groups.length

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-700 p-1 -ml-1">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Program Management</h1>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                CPARS · Live from Monday.com
                {lastUpdated && <span className="ml-2 text-gray-400">· Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewTask(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Task</span>
            </button>
            <button onClick={loadData} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{loading ? 'Refreshing…' : `Refresh in ${countdown}s`}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Tasks', value: total,      bg: 'bg-indigo-50',  val: 'text-indigo-700'  },
              { label: 'Groups',      value: groupCount, bg: 'bg-purple-50',  val: 'text-purple-700'  },
              { label: 'Done',        value: done,       bg: 'bg-emerald-50', val: 'text-emerald-700' },
              { label: 'In Progress', value: inProg,     bg: 'bg-amber-50',   val: 'text-amber-700'   },
            ].map(({ label, value, bg, val }) => (
              <div key={label} className={`${bg} rounded-xl p-4 border border-white shadow-sm`}>
                <div className={`text-2xl font-bold ${val}`}>{value}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Person tabs */}
          {people.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {['all', ...people].map(person => (
                <button
                  key={person}
                  onClick={() => setActivePerson(person)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    activePerson === person
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {person === 'all' ? 'All' : person.split(' ')[0]}
                </button>
              ))}
            </div>
          )}

          {/* Task groups */}
          {loading ? (
            <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const accent      = groupAccent(group.title)
                const isCollapsed = collapsed.has(group.id)

                return (
                  <div key={group.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    {/* Group header — clickable to collapse */}
                    <button
                      onClick={() => toggleCollapse(group.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 ${accent.bg} border-b border-gray-100 hover:brightness-95 transition`}
                    >
                      <div className={`w-1 h-5 rounded-full ${accent.bar} shrink-0`} />
                      <ChevronDown className={`w-4 h-4 ${accent.text} transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                      <span className={`font-bold text-sm ${accent.text}`}>{group.title}</span>
                      <span className="text-xs text-gray-400 ml-1">{group.tasks.length} tasks</span>
                    </button>

                    {/* Tasks */}
                    {(!isCollapsed || searchLower) && (
                      <div className="divide-y divide-gray-50">
                        {/* Column headers */}
                        <div className="hidden sm:flex items-center px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                          <div className="w-4 mr-1.5 shrink-0" />
                          <div className="w-2 mr-2 shrink-0" />
                          <div className="flex-1 mr-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Task</div>
                          <div className="w-36 mr-3 shrink-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">People</div>
                          <div className="w-32 mr-2 shrink-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</div>
                          <div className="w-20 shrink-0" />
                        </div>
                        {group.tasks.map((task) => (
                          <TaskRow key={task.id} task={task} depth={0} onSelect={setSelectedTask} onChanged={loadData} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {selectedTask && <UpdatesModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
      {showNewTask   && <NewTaskModal groups={groups} onClose={() => setShowNewTask(false)} onCreated={loadData} />}
    </div>
  )
}
