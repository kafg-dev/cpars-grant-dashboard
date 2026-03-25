import { RefreshCw, Search } from 'lucide-react'

export default function Header({ title = 'Dashboard', subtitle = 'Live from Monday.com', lastUpdated, countdown, onRefresh, loading, search, onSearch }) {
  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        {/* Left */}
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {subtitle}
            {timeStr && (
              <span className="ml-2 text-gray-400">· Updated {timeStr}</span>
            )}
          </p>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search grants or funders…"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-300 w-64 transition"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {loading ? 'Refreshing…' : `Refresh in ${countdown}s`}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
