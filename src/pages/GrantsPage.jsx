import { useState, useEffect, useCallback } from 'react'
import { fetchAllGrants, transformGrant } from '../utils/api'
import Header from '../components/Header'
import StatCard from '../components/StatCard'
import FilterTabs from '../components/FilterTabs'
import GrantGrid from '../components/GrantGrid'

const REFRESH_INTERVAL = 30

export const GROUP_FILTERS = [
  { id: 'all',               label: 'All Grants' },
  { id: 'topics',            label: 'Prospecting' },
  { id: 'group_mm12vszy',    label: 'Eligible' },
  { id: 'group_mkzt5qqd',    label: 'Preparing Reqs' },
  { id: 'group_mkzt7cqb',    label: 'For Submission' },
  { id: 'group_mkztg9n9',    label: 'Awaiting Decision' },
  { id: 'group_mkzts270',    label: 'Approved' },
  { id: 'group_mkzt3a77',    label: 'Declined' },
  { id: 'group_mkztszmr',    label: 'Ineligible' },
  { id: 'group_mkz7cypt',    label: 'Disaster' },
  { id: 'group_mkz7mhy3',    label: 'Medical Emergency' },
]

const PIPELINE_GROUPS = ['group_mm12vszy','group_mkzt5qqd','group_mkzt7cqb','group_mkztg9n9']

function formatCurrency(n) {
  if (!n) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

export default function GrantsPage({ onMenuClick }) {
  const [grants, setGrants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)

  const loadGrants = useCallback(async () => {
    try {
      const items = await fetchAllGrants()
      setGrants(items.map(transformGrant))
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
    loadGrants()
    const interval = setInterval(loadGrants, REFRESH_INTERVAL * 1000)
    return () => clearInterval(interval)
  }, [loadGrants])

  useEffect(() => {
    if (!lastUpdated) return
    const timer = setInterval(() => setCountdown((p) => (p <= 1 ? REFRESH_INTERVAL : p - 1)), 1000)
    return () => clearInterval(timer)
  }, [lastUpdated])

  const today = new Date()
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  const totalGrants       = grants.length
  const pipelineCount     = grants.filter((g) => PIPELINE_GROUPS.includes(g.group.id)).length
  const upcomingDeadlines = grants.filter((g) => { if (!g.deadline) return false; const d = new Date(g.deadline); return d >= today && d <= in30Days }).length
  const totalRequesting   = grants.reduce((s, g) => s + g.amountRequesting, 0)
  const totalAwarded      = grants.reduce((s, g) => s + g.amountAwarded, 0)
  const approvedCount     = grants.filter((g) => g.group.id === 'group_mkzts270').length

  const filtered = grants
    .filter((g) => activeFilter === 'all' || g.group.id === activeFilter)
    .filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.funder.toLowerCase().includes(search.toLowerCase()))

  const countByGroup = grants.reduce((acc, g) => { acc[g.group.id] = (acc[g.group.id] || 0) + 1; return acc }, {})

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Grant Application Tracker"
        subtitle="Live from Monday.com · Grants board"
        lastUpdated={lastUpdated}
        countdown={countdown}
        onRefresh={loadGrants}
        loading={loading}
        search={search}
        onSearch={setSearch}
        onMenuClick={onMenuClick}
      />
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total Grants"     value={totalGrants}                    color="blue"    icon="clipboard" />
            <StatCard label="In Pipeline"      value={pipelineCount}                  color="indigo"  icon="activity" />
            <StatCard label="Due This Month"   value={upcomingDeadlines}              color="amber"   icon="clock" />
            <StatCard label="Total Requesting" value={formatCurrency(totalRequesting)} color="violet"  icon="dollar" />
            <StatCard label="Total Awarded"    value={formatCurrency(totalAwarded)}   color="emerald" icon="trophy" />
            <StatCard label="Approved"         value={approvedCount}                  color="green"   icon="check" />
          </div>
          <FilterTabs
            filters={GROUP_FILTERS}
            active={activeFilter}
            onChange={setActiveFilter}
            counts={{ all: totalGrants, ...countByGroup }}
          />
          <GrantGrid grants={filtered} loading={loading} />
        </div>
      </div>
    </div>
  )
}
