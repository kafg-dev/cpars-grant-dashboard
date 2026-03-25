const API_KEY = import.meta.env.VITE_MONDAY_API_KEY
const BOARD_ID = import.meta.env.VITE_MONDAY_BOARD_ID

// Uses Vite proxy (/monday-api → https://api.monday.com/v2) to keep key server-side in dev
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

// Fetches all items using cursor pagination (handles boards > 500 items)
export async function fetchAllGrants() {
  let items = []
  let cursor = null

  do {
    const cursorArg = cursor ? `, cursor: "${cursor}"` : ''
    const query = `{
      boards(ids: [${BOARD_ID}]) {
        items_page(limit: 500${cursorArg}) {
          cursor
          items {
            id
            name
            group { id title }
            column_values {
              id text value
            }
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

function parseUrl(value) {
  if (!value) return ''
  try {
    return JSON.parse(value).url || ''
  } catch {
    return ''
  }
}

export function transformItem(item) {
  const col = {}
  item.column_values.forEach((c) => {
    col[c.id] = { text: c.text || '', value: c.value || '' }
  })

  return {
    id: item.id,
    name: item.name,
    group: item.group,
    funder:            col['text_mkydg0q8']?.text || '',
    deadline:          col['date4']?.text || '',
    status:            col['color_mm08f2xa']?.text || '',
    grantDetailsUrl:   parseUrl(col['link_mkyda2kr']?.value),
    notes:             col['text_mkydvx7s']?.text || '',
    eligibilityUrl:    parseUrl(col['link_mkyep0ns']?.value),
    folderUrl:         parseUrl(col['link_mkztf5pp']?.value),
    programFit:        col['dropdown_mkztjg2y']?.text || '',
    fipUrl:            parseUrl(col['link_mkztbr1z']?.value),
    avgGrantRange:     col['text_mkztzy5x']?.text || '',
    amountRequesting:  parseFloat(col['numeric_mkztschj']?.text) || 0,
    amountAwarded:     parseFloat(col['numeric_mm0dk1pv']?.text) || 0,
    grantPortalUrl:    parseUrl(col['link_mm0dm1m2']?.value),
    ineligibilityReason: col['text_mkztarsn']?.text || '',
  }
}
