import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, PawPrint, Heart, MapPin, Search, ExternalLink, FolderOpen, MessageSquare, X, FileText } from 'lucide-react'
import { fetchAllAnimals, transformAnimal, fetchAnimalUpdates } from '../utils/api'

const REFRESH_INTERVAL = 30

const SPECIES_EMOJI = { dog: '🐕', cat: '🐈', rabbit: '🐇', bird: '🐦', horse: '🐴' }

// Convert a Google Drive share URL to a direct image URL
function driveToImg(url) {
  if (!url) return null
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/)
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`
  // Already a direct image URL
  if (/\.(jpg|jpeg|png|gif|webp)/i.test(url)) return url
  return null
}

// ─── Updates Modal ────────────────────────────────────────────────────────────

function UpdatesModal({ animal, onClose }) {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnimalUpdates(animal.id).then((data) => {
      setUpdates(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [animal.id])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-bold text-gray-900 text-lg">{animal.name}</div>
            <div className="text-sm text-gray-500">{animal.breed} · Updates</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : updates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No updates yet.</p>
          ) : (
            updates.map((u) => {
              const ext = (a) => (a.file_extension || '').toLowerCase().replace(/^\./, '')
              const images = (u.assets || []).filter(a => ['jpg','jpeg','png','gif','webp'].includes(ext(a)))
              const videos = (u.assets || []).filter(a => ['mp4','mov','avi','webm'].includes(ext(a)))
              const others = (u.assets || []).filter(a => !images.includes(a) && !videos.includes(a))
              return (
                <div key={u.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                  <div className="flex justify-end">
                    <span className="text-xs text-gray-400">
                      {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {u.text_body && <p className="text-sm text-gray-700 leading-relaxed">{u.text_body}</p>}

                  {/* Images */}
                  {images.length > 0 && (
                    <div className={`grid gap-2 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {images.map(a => (
                        <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer">
                          <img src={a.url} alt={a.name} className="w-full rounded-lg object-cover max-h-48 hover:opacity-90 transition" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Videos */}
                  {videos.map(a => (
                    <video key={a.id} controls className="w-full rounded-lg max-h-48">
                      <source src={a.url} />
                    </video>
                  ))}

                  {/* Other files — open via Google Docs Viewer so they display in browser */}
                  {others.map(a => {
                    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(a.url)}&embedded=true`
                    const openUrl   = `https://docs.google.com/viewer?url=${encodeURIComponent(a.url)}`
                    return (
                      <div key={a.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                            <FileText className="w-3.5 h-3.5" />
                            {a.name}
                          </span>
                          <a href={openUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition">
                            Open ↗
                          </a>
                        </div>
                        <iframe
                          src={viewerUrl}
                          title={a.name}
                          className="w-full h-64 rounded-lg border border-gray-200"
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function speciesEmoji(s) {
  return SPECIES_EMOJI[(s || '').toLowerCase()] || '🐾'
}

function AdoptionBadge({ value }) {
  const yes = value?.toLowerCase() === 'yes'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
      yes ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
    }`}>
      <Heart className="w-3 h-3" />
      {yes ? 'For Adoption' : 'Not for Adoption'}
    </span>
  )
}

function StatusBadge({ value }) {
  if (!value) return null
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      {value}
    </span>
  )
}

function AnimalCard({ animal }) {
  const adoptable = animal.forAdoption?.toLowerCase() === 'yes'
  const [showUpdates, setShowUpdates] = useState(false)
  const [imgError, setImgError] = useState(false)
  const imgSrc = driveToImg(animal.photoLink)

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow flex flex-col ${
      adoptable ? 'border-emerald-200' : 'border-gray-200'
    }`}>
      {/* Photo */}
      {imgSrc && !imgError && (
        <div className="w-full h-44 overflow-hidden rounded-t-xl bg-gray-100">
          <img
            src={imgSrc}
            alt={animal.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Card header */}
      <div className={`px-4 pt-4 pb-3 border-b ${adoptable ? 'border-emerald-100' : 'border-gray-100'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {(!imgSrc || imgError) && (
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                adoptable ? 'bg-emerald-50' : 'bg-gray-50'
              }`}>
                {speciesEmoji(animal.species)}
              </div>
            )}
            <div>
              <div className="font-bold text-gray-900 text-base leading-tight">{animal.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {[animal.species, animal.breed].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          {animal.animalId && (
            <span className="text-[10px] font-mono bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded shrink-0">
              #{animal.animalId}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <AdoptionBadge value={animal.forAdoption} />
          {animal.status && <StatusBadge value={animal.status} />}
        </div>
      </div>

      {/* Details */}
      <div className="px-4 py-3 flex-1 space-y-1.5 text-xs">
        {animal.location && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{animal.location}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
          <Detail label="Sex"    value={animal.sex} />
          <Detail label="Weight" value={animal.weight ? `${animal.weight} lbs` : ''} />
          <Detail label="Age"    value={animal.age} />
          <Detail label="Color"  value={animal.color} />
          <Detail label="From"   value={animal.fromLocation} />
          <Detail label="Intake" value={animal.intakeDate} />
        </div>
      </div>

      {/* Links + Updates */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowUpdates(true)}
          className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition"
        >
          <MessageSquare className="w-3 h-3" />
          Updates
        </button>
        {animal.petfinderLink && (
          <a href={animal.petfinderLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition">
            <ExternalLink className="w-3 h-3" />
            Petfinder
          </a>
        )}
        {animal.driveLink && (
          <a href={animal.driveLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition">
            <FolderOpen className="w-3 h-3" />
            Drive
          </a>
        )}
      </div>

      {showUpdates && (
        <UpdatesModal animal={animal} onClose={() => setShowUpdates(false)} />
      )}
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <span className="text-gray-400 uppercase tracking-wide text-[10px]">{label}</span>
      <div className={`font-medium truncate ${value ? 'text-gray-700' : 'text-gray-300'}`}>
        {value || '—'}
      </div>
    </div>
  )
}

export default function AnimalsPage() {
  const [animals, setAnimals]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [search, setSearch]           = useState('')
  const [filterSpecies, setFilterSpecies] = useState('All')
  const [filterAdoption, setFilterAdoption] = useState('All')
  const [filterLocation, setFilterLocation] = useState('All')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [countdown, setCountdown]     = useState(REFRESH_INTERVAL)

  const loadData = useCallback(async () => {
    try {
      const raw = await fetchAllAnimals()
      setAnimals(raw.map(transformAnimal))
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

  // Derived filter options
  const allSpecies   = ['All', ...new Set(animals.map(a => a.species).filter(Boolean).sort())]
  const allLocations = ['All', ...new Set(animals.map(a => a.location).filter(Boolean).sort())]

  // Filtered list
  const filtered = animals.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) &&
        !a.breed?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterSpecies !== 'All' && a.species !== filterSpecies) return false
    if (filterAdoption === 'For Adoption' && a.forAdoption?.toLowerCase() !== 'yes') return false
    if (filterAdoption === 'Not for Adoption' && a.forAdoption?.toLowerCase() === 'yes') return false
    if (filterLocation !== 'All' && a.location !== filterLocation) return false
    return true
  })

  // Stats
  const total      = animals.length
  const adoptable  = animals.filter(a => a.forAdoption?.toLowerCase() === 'yes').length
  const inSanctuary = animals.filter(a => a.status?.toLowerCase().includes('sanctuary')).length
  const speciesCounts = animals.reduce((acc, a) => {
    if (a.species) acc[a.species] = (acc[a.species] || 0) + 1
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Animals Master Tracker</h1>
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
        <div className="px-6 py-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={<PawPrint className="w-5 h-5" />}
              value={total}
              label="Total Animals"
              color="indigo"
            />
            <StatCard
              icon={<Heart className="w-5 h-5" />}
              value={adoptable}
              label="For Adoption"
              color="emerald"
            />
            <StatCard
              icon={<MapPin className="w-5 h-5" />}
              value={inSanctuary}
              label="In Sanctuary"
              color="blue"
            />
            <div className="bg-amber-50 rounded-xl p-4 border border-white shadow-sm">
              <div className="text-xs text-gray-500 mb-1.5">By Species</div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(speciesCounts).map(([s, n]) => (
                  <div key={s} className="text-sm font-semibold text-amber-700">
                    {speciesEmoji(s)} {n} {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or breed…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <FilterSelect label="Species"  value={filterSpecies}   onChange={setFilterSpecies}   options={allSpecies} />
            <FilterSelect label="Adoption" value={filterAdoption}  onChange={setFilterAdoption}  options={['All', 'For Adoption', 'Not for Adoption']} />
            <FilterSelect label="Location" value={filterLocation}  onChange={setFilterLocation}  options={allLocations} />
            {(filterSpecies !== 'All' || filterAdoption !== 'All' || filterLocation !== 'All' || search) && (
              <button
                onClick={() => { setSearch(''); setFilterSpecies('All'); setFilterAdoption('All'); setFilterLocation('All') }}
                className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
              >
                Clear filters
              </button>
            )}
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} animals</span>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-52 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <PawPrint className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">No animals found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((animal) => (
                <AnimalCard key={animal.id} animal={animal} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label, color }) {
  const iconBg = { indigo: 'bg-indigo-100 text-indigo-600', emerald: 'bg-emerald-100 text-emerald-600', blue: 'bg-blue-100 text-blue-600' }
  const valColor = { indigo: 'text-indigo-700', emerald: 'text-emerald-700', blue: 'text-blue-700' }
  const bg = { indigo: 'bg-indigo-50', emerald: 'bg-emerald-50', blue: 'bg-blue-50' }

  return (
    <div className={`${bg[color]} rounded-xl p-4 flex items-center gap-3 border border-white shadow-sm`}>
      <div className={`${iconBg[color]} rounded-lg p-2.5`}>{icon}</div>
      <div>
        <div className={`text-2xl font-bold ${valColor[color]}`}>{value}</div>
        <div className="text-xs text-gray-500 mt-1">{label}</div>
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o === 'All' ? `All ${label}` : o}</option>
      ))}
    </select>
  )
}
