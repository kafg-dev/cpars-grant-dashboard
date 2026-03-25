/**
 * Parses natural-language or messy time strings (from voice/AI input) into
 * a clean "H:MM AM/PM" display string, or returns null if unparseable.
 *
 * Handles: "8:00 AM", "8 o'clock AM", "8 o'clock a.m.", "8AM", "8 pm",
 *          "half past 8", "quarter to 5", "noon", "midnight", "17:00", etc.
 */
export function parseTimeText(raw) {
  if (!raw || raw.trim() === '' || raw.trim().toLowerCase() === 'n/a') return null

  const text = raw.trim()
  const lower = text.toLowerCase().replace(/\./g, '') // strip periods from a.m. → am

  // noon / midnight
  if (lower === 'noon')     return '12:00 PM'
  if (lower === 'midnight') return '12:00 AM'

  // Standard "8:30 AM" or "8:30am" or "08:30 AM"
  let m = lower.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/)
  if (m) return fmt(parseInt(m[1]), parseInt(m[2]), m[3].toUpperCase())

  // "8:30" 24-hr or ambiguous — treat < 8 as PM, >= 8 as AM
  m = lower.match(/^(\d{1,2}):(\d{2})$/)
  if (m) {
    const h = parseInt(m[1]), mn = parseInt(m[2])
    if (h >= 13 && h <= 23) return fmt(h - 12, mn, 'PM')
    if (h === 0) return fmt(12, mn, 'AM')
    const period = h < 8 ? 'PM' : 'AM'
    return fmt(h, mn, period)
  }

  // "8 AM" or "8PM" (hour only, no colon)
  m = lower.match(/^(\d{1,2})\s*(am|pm)$/)
  if (m) return fmt(parseInt(m[1]), 0, m[2].toUpperCase())

  // "8 o'clock AM" / "8 o'clock a m" / "8 o'clock" / "eight o'clock pm"
  m = lower.replace(/'/g, '').match(/^(\d{1,2}|[a-z]+)\s+oclock\s*(am|pm)?$/)
  if (m) {
    const h = wordToNum(m[1]) ?? parseInt(m[1])
    if (isNaN(h)) return text
    const period = m[2] ? m[2].toUpperCase() : defaultPeriod(h)
    return fmt(h, 0, period)
  }

  // "half past 8 AM" / "half past 8"
  m = lower.match(/half\s+past\s+(\d{1,2})\s*(am|pm)?/)
  if (m) {
    const h = parseInt(m[1])
    return fmt(h, 30, m[2] ? m[2].toUpperCase() : defaultPeriod(h))
  }

  // "quarter past 8"
  m = lower.match(/quarter\s+past\s+(\d{1,2})\s*(am|pm)?/)
  if (m) {
    const h = parseInt(m[1])
    return fmt(h, 15, m[2] ? m[2].toUpperCase() : defaultPeriod(h))
  }

  // "quarter to 5" → 4:45
  m = lower.match(/quarter\s+to\s+(\d{1,2})\s*(am|pm)?/)
  if (m) {
    let h = parseInt(m[1]) - 1
    if (h === 0) h = 12
    return fmt(h, 45, m[2] ? m[2].toUpperCase() : defaultPeriod(h))
  }

  // Fuzzy: find a time pattern anywhere in the string e.g. "around 9:16 pm"
  m = lower.match(/(\d{1,2}):(\d{2})\s*(am|pm)/)
  if (m) return fmt(parseInt(m[1]), parseInt(m[2]), m[3].toUpperCase())

  m = lower.match(/(\d{1,2})\s*(am|pm)/)
  if (m) return fmt(parseInt(m[1]), 0, m[2].toUpperCase())

  // Can't parse — return original so nothing is lost
  return text
}

/**
 * Given a parsed clockIn and clockOut string, returns hours worked like "7h 30m".
 */
export function calcHoursWorked(clockIn, clockOut) {
  const toMins = (t) => {
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
  const inM = toMins(clockIn), outM = toMins(clockOut)
  if (inM === null || outM === null) return null
  const diff = outM - inM
  if (diff <= 0) return null
  const h = Math.floor(diff / 60), mn = diff % 60
  return mn === 0 ? `${h}h` : `${h}h ${mn}m`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(h, m, period) {
  // Normalize 12-hour
  if (period === 'AM' && h === 12) h = 12
  if (period === 'PM' && h === 12) h = 12
  if (period === 'PM' && h < 12)   h = h  // keep as-is, display as PM
  return `${h}:${String(m).padStart(2, '0')} ${period}`
}

function defaultPeriod(h) {
  // Reasonable default: 6–11 = AM, 12–23 = PM, 1–5 = PM (staff shifts)
  if (h === 12) return 'PM'
  if (h >= 6 && h <= 11) return 'AM'
  return 'PM'
}

const WORD_NUMS = {
  one:1, two:2, three:3, four:4, five:5, six:6, seven:7,
  eight:8, nine:9, ten:10, eleven:11, twelve:12,
}
function wordToNum(w) { return WORD_NUMS[w] ?? null }
