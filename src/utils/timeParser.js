/**
 * Parses natural-language or messy time strings (from voice/AI input) into
 * a clean "H:MM AM/PM" display string, or returns null if unparseable.
 *
 * Handles: "8:00 AM", "8:30am", "8AM", "8 pm", "8.30", "8.30pm", "830",
 *          "546 p.m.", "7 48", "1240", "8 o'clock AM", "half past 8",
 *          "quarter to 5", "noon", "midnight", "17:00", etc.
 */
export function parseTimeText(raw) {
  if (!raw || raw.trim() === '' || raw.trim().toLowerCase() === 'n/a') return null

  const text = raw.trim()
  // Strip periods so "a.m." → "am", "p.m." → "pm", "8.30" stays "830" temporarily
  const lower = text.toLowerCase().replace(/\s*\.\s*/g, '.').trim()

  // noon / midnight
  if (lower === 'noon')     return '12:00 PM'
  if (lower === 'midnight') return '12:00 AM'

  // Strip periods for am/pm detection but keep for digit separators first
  const noPeriodAmPm = lower.replace(/(?<=[ap])\.(?=m)/g, '') // "a.m" → "am", "p.m" → "pm"
  const clean = noPeriodAmPm.replace(/\.$/, '') // remove trailing period

  // "8:30 AM" or "8:30am"
  let m = clean.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/)
  if (m) return fmt(parseInt(m[1]), parseInt(m[2]), m[3].toUpperCase())

  // "8.30 AM" or "8.30am" or "6.52 p.m." (period as time separator + am/pm)
  m = clean.match(/^(\d{1,2})\.(\d{2})\s*(am|pm)$/)
  if (m) return fmt(parseInt(m[1]), parseInt(m[2]), m[3].toUpperCase())

  // "8:30" or "8.30" — no am/pm, 24hr or ambiguous
  m = clean.match(/^(\d{1,2})[:\.](\d{2})$/)
  if (m) {
    const h = parseInt(m[1]), mn = parseInt(m[2])
    if (h >= 13 && h <= 23) return fmt(h - 12, mn, 'PM')
    if (h === 0) return fmt(12, mn, 'AM')
    return fmt(h, mn, defaultPeriod(h))
  }

  // "7 48" or "7 48 pm" (space as time separator)
  m = clean.match(/^(\d{1,2})\s+(\d{2})\s*(am|pm)?$/)
  if (m) {
    const h = parseInt(m[1]), mn = parseInt(m[2])
    if (mn > 59) {
      // Not a valid minute — treat as separate numbers, fall through
    } else {
      const period = m[3] ? m[3].toUpperCase() : defaultPeriod(h)
      return fmt(h, mn, period)
    }
  }

  // "8 AM" or "8PM" (hour only)
  m = clean.match(/^(\d{1,2})\s*(am|pm)$/)
  if (m) return fmt(parseInt(m[1]), 0, m[2].toUpperCase())

  // "546 pm" or "546 p.m." — 3-digit no separator → first digit is hour
  m = clean.match(/^(\d)(\d{2})\s*(am|pm)$/)
  if (m) return fmt(parseInt(m[1]), parseInt(m[2]), m[3].toUpperCase())

  // "1240" or "830" — 3-4 digit no separator, no am/pm
  m = clean.match(/^(\d{3,4})$/)
  if (m) {
    const n = parseInt(m[0])
    const h = Math.floor(n / 100), mn = n % 100
    if (mn <= 59) {
      if (h >= 13 && h <= 23) return fmt(h - 12, mn, 'PM')
      if (h === 0) return fmt(12, mn, 'AM')
      return fmt(h, mn, defaultPeriod(h))
    }
  }

  // "8 o'clock AM" / "eight o'clock pm" / "8 o'clock"
  m = clean.replace(/'/g, '').match(/^(\d{1,2}|[a-z]+)\s+oclock\s*(am|pm)?$/)
  if (m) {
    const h = wordToNum(m[1]) ?? parseInt(m[1])
    if (isNaN(h)) return null
    const period = m[2] ? m[2].toUpperCase() : defaultPeriod(h)
    return fmt(h, 0, period)
  }

  // "12 o'clock" with period-stripped version
  m = lower.replace(/\./g, '').replace(/'/g, '').match(/^(\d{1,2}|[a-z]+)\s+oclock\s*(am|pm)?$/)
  if (m) {
    const h = wordToNum(m[1]) ?? parseInt(m[1])
    if (!isNaN(h)) {
      const period = m[2] ? m[2].toUpperCase() : defaultPeriod(h)
      return fmt(h, 0, period)
    }
  }

  // "half past 8" / "half past 8 AM"
  m = clean.match(/half\s+past\s+(\d{1,2})\s*(am|pm)?/)
  if (m) {
    const h = parseInt(m[1])
    return fmt(h, 30, m[2] ? m[2].toUpperCase() : defaultPeriod(h))
  }

  // "quarter past 8"
  m = clean.match(/quarter\s+past\s+(\d{1,2})\s*(am|pm)?/)
  if (m) {
    const h = parseInt(m[1])
    return fmt(h, 15, m[2] ? m[2].toUpperCase() : defaultPeriod(h))
  }

  // "quarter to 5" → 4:45
  m = clean.match(/quarter\s+to\s+(\d{1,2})\s*(am|pm)?/)
  if (m) {
    let h = parseInt(m[1]) - 1
    if (h === 0) h = 12
    return fmt(h, 45, m[2] ? m[2].toUpperCase() : defaultPeriod(h))
  }

  // Fuzzy: find a time pattern anywhere in the string e.g. "around 9:16 pm"
  m = clean.match(/(\d{1,2})[:\.](\d{2})\s*(am|pm)/)
  if (m) return fmt(parseInt(m[1]), parseInt(m[2]), m[3].toUpperCase())

  m = clean.match(/(\d{1,2})\s*(am|pm)/)
  if (m) return fmt(parseInt(m[1]), 0, m[2].toUpperCase())

  // Can't parse — return null so callers don't display garbage
  return null
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
  // Validate ranges
  if (h < 1 || h > 12 || m < 0 || m > 59) return null
  return `${h}:${String(m).padStart(2, '0')} ${period}`
}

function defaultPeriod(h) {
  // Reasonable default: 6–11 = AM, 12–5 = PM (staff shifts)
  if (h === 12) return 'PM'
  if (h >= 6 && h <= 11) return 'AM'
  return 'PM'
}

const WORD_NUMS = {
  one:1, two:2, three:3, four:4, five:5, six:6, seven:7,
  eight:8, nine:9, ten:10, eleven:11, twelve:12,
}
function wordToNum(w) { return WORD_NUMS[w] ?? null }
