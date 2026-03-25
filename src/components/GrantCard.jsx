import { Calendar, DollarSign, ExternalLink, Building2, AlertCircle } from 'lucide-react'

const STAGE_STYLES = {
  topics:            { label: 'Prospecting',      cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  group_mm12vszy:    { label: 'Eligible',          cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  group_mkzt5qqd:    { label: 'Preparing Reqs',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  group_mkzt7cqb:    { label: 'For Submission',    cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  group_mkztg9n9:    { label: 'Awaiting Decision', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  group_mkzts270:    { label: 'Approved',          cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  group_mkzt3a77:    { label: 'Declined',          cls: 'bg-red-100 text-red-700 border-red-200' },
  group_mkztszmr:    { label: 'Ineligible',        cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  group_mkz7cypt:    { label: 'Disaster',          cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  group_mkz7mhy3:    { label: 'Medical',           cls: 'bg-pink-100 text-pink-700 border-pink-200' },
}

function getDeadlineInfo(deadline) {
  if (!deadline) return null
  const d = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffMs = d - today
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  const display = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  if (diffDays < 0)  return { display, cls: 'text-red-600', label: 'Past due', urgent: true }
  if (diffDays <= 7) return { display, cls: 'text-red-500', label: `${diffDays}d left`, urgent: true }
  if (diffDays <= 30) return { display, cls: 'text-amber-600', label: `${diffDays}d left`, urgent: false }
  return { display, cls: 'text-gray-500', label: null, urgent: false }
}

function formatAmount(n) {
  if (!n) return null
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

export default function GrantCard({ grant }) {
  const stage = STAGE_STYLES[grant.group.id] || { label: grant.group.title, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
  const deadlineInfo = getDeadlineInfo(grant.deadline)
  const requestingDisplay = formatAmount(grant.amountRequesting)
  const awardedDisplay = formatAmount(grant.amountAwarded)

  const isDeclinedOrIneligible = ['group_mkzt3a77', 'group_mkztszmr'].includes(grant.group.id)
  const isApproved = grant.group.id === 'group_mkzts270'

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow flex flex-col ${
      isDeclinedOrIneligible ? 'opacity-70' : ''
    } ${isApproved ? 'ring-1 ring-emerald-200' : 'border-gray-200'}`}>

      {/* Card Header */}
      <div className="p-4 pb-3 flex items-start justify-between gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${stage.cls} shrink-0`}>
          {stage.label}
        </span>
        {grant.grantDetailsUrl && (
          <a
            href={grant.grantDetailsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-gray-400 hover:text-indigo-600 transition shrink-0"
            title="Grant Details"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pb-4 flex flex-col gap-3 flex-1">
        {/* Name + Funder */}
        <div>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
            {grant.name}
          </h3>
          {grant.funder && (
            <div className="flex items-center gap-1 mt-1">
              <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-500 truncate">{grant.funder}</span>
            </div>
          )}
        </div>

        {/* Deadline + Amount */}
        <div className="flex items-center gap-3 text-xs">
          {deadlineInfo && (
            <div className={`flex items-center gap-1 ${deadlineInfo.cls}`}>
              {deadlineInfo.urgent
                ? <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                : <Calendar className="w-3.5 h-3.5 shrink-0" />
              }
              <span>{deadlineInfo.display}</span>
              {deadlineInfo.label && (
                <span className="font-semibold">· {deadlineInfo.label}</span>
              )}
            </div>
          )}
        </div>

        {/* Amounts */}
        {(requestingDisplay || awardedDisplay) && (
          <div className="flex items-center gap-3 text-xs">
            {requestingDisplay && (
              <div className="flex items-center gap-1 text-violet-600">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="font-semibold">{requestingDisplay}</span>
                <span className="text-gray-400">requested</span>
              </div>
            )}
            {awardedDisplay && (
              <div className="flex items-center gap-1 text-emerald-600">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="font-semibold">{awardedDisplay}</span>
                <span className="text-gray-400">awarded</span>
              </div>
            )}
          </div>
        )}

        {/* Avg Range */}
        {grant.avgGrantRange && (
          <div className="text-xs text-gray-400">
            Avg range: <span className="text-gray-600">{grant.avgGrantRange}</span>
          </div>
        )}

        {/* Program Fit */}
        {grant.programFit && (
          <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded px-2 py-0.5 self-start">
            {grant.programFit}
          </span>
        )}

        {/* Ineligibility reason */}
        {grant.ineligibilityReason && (
          <p className="text-xs text-red-500 italic line-clamp-2">{grant.ineligibilityReason}</p>
        )}
      </div>

      {/* Footer links */}
      {(grant.grantPortalUrl || grant.eligibilityUrl || grant.folderUrl || grant.fipUrl) && (
        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-3">
          {grant.grantPortalUrl && (
            <a href={grant.grantPortalUrl} target="_blank" rel="noopener noreferrer"
               className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline">
              Portal
            </a>
          )}
          {grant.eligibilityUrl && (
            <a href={grant.eligibilityUrl} target="_blank" rel="noopener noreferrer"
               className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline">
              Eligibility
            </a>
          )}
          {grant.folderUrl && (
            <a href={grant.folderUrl} target="_blank" rel="noopener noreferrer"
               className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline">
              Folder
            </a>
          )}
          {grant.fipUrl && (
            <a href={grant.fipUrl} target="_blank" rel="noopener noreferrer"
               className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline">
              FIP
            </a>
          )}
        </div>
      )}
    </div>
  )
}
