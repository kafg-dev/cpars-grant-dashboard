const API_KEY = import.meta.env.VITE_MONDAY_API_KEY

async function monday(query) {
  const res = await fetch('/monday-api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: API_KEY,
    },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`Monday API error: ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data
}

// Generic: fetch all items from any board with cursor pagination
export async function fetchAllItems(boardId) {
  let items = []
  let cursor = null
  do {
    const cursorArg = cursor ? `, cursor: "${cursor}"` : ''
    const query = `{
      boards(ids: [${boardId}]) {
        items_page(limit: 500${cursorArg}) {
          cursor
          items {
            id name
            group { id title }
            column_values { id text value }
          }
        }
      }
    }`
    const data = await monday(query)
    const page = data.boards[0].items_page
    items = items.concat(page.items)
    cursor = page.cursor
  } while (cursor)
  return items
}

// ─── Grants ──────────────────────────────────────────────────────────────────

const GRANTS_BOARD_ID = import.meta.env.VITE_MONDAY_BOARD_ID

export async function fetchAllGrants() {
  return fetchAllItems(GRANTS_BOARD_ID)
}

function parseUrl(value) {
  if (!value) return ''
  try { return JSON.parse(value).url || '' } catch { return '' }
}

export function transformGrant(item) {
  const col = {}
  item.column_values.forEach((c) => { col[c.id] = { text: c.text || '', value: c.value || '' } })
  return {
    id: item.id,
    name: item.name,
    group: item.group,
    funder:              col['text_mkydg0q8']?.text || '',
    deadline:            col['date4']?.text || '',
    status:              col['color_mm08f2xa']?.text || '',
    grantDetailsUrl:     parseUrl(col['link_mkyda2kr']?.value),
    notes:               col['text_mkydvx7s']?.text || '',
    eligibilityUrl:      parseUrl(col['link_mkyep0ns']?.value),
    folderUrl:           parseUrl(col['link_mkztf5pp']?.value),
    programFit:          col['dropdown_mkztjg2y']?.text || '',
    fipUrl:              parseUrl(col['link_mkztbr1z']?.value),
    avgGrantRange:       col['text_mkztzy5x']?.text || '',
    amountRequesting:    parseFloat(col['numeric_mkztschj']?.text) || 0,
    amountAwarded:       parseFloat(col['numeric_mm0dk1pv']?.text) || 0,
    grantPortalUrl:      parseUrl(col['link_mm0dm1m2']?.value),
    ineligibilityReason: col['text_mkztarsn']?.text || '',
  }
}

// Keep old name for backwards compat
export const transformItem = transformGrant

// ─── Staff ───────────────────────────────────────────────────────────────────

export const STAFF_BOARD_ID = '18396531502'

export async function fetchAllStaff() {
  return fetchAllItems(STAFF_BOARD_ID)
}

export function transformStaffItem(item) {
  const col = {}
  item.column_values.forEach((c) => { col[c.id] = { text: c.text || '', value: c.value || '' } })
  return {
    id: item.id,
    name: item.name,
    group: item.group,   // "DAILY UPDATES" or "Clock In and Clock Out"
    staffName: col['text_mm023fg0']?.text || '',
    info:      col['long_text_mm02ag04']?.text || '',
    date:      col['date4']?.text || '',          // "YYYY-MM-DD"
    status:    col['status']?.text || '',
    clockIn:   col['text_mm02171']?.text || '',
    clockOut:  col['text_mm02p02j']?.text || '',
  }
}
