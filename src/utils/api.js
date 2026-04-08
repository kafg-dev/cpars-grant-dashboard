const API_KEY       = import.meta.env.VITE_MONDAY_API_KEY
const TASKS_API_KEY = import.meta.env.VITE_MONDAY_TASKS_API_KEY || API_KEY

async function monday(query, variables = {}, apiKey = API_KEY) {
  const res = await fetch('/monday-api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify(Object.keys(variables).length ? { query, variables } : { query }),
  })
  if (!res.ok) throw new Error(`Monday API error: ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data
}

async function mondayTasks(query, variables = {}) {
  console.log('[TASKS key prefix]', TASKS_API_KEY?.slice(0, 20))
  return monday(query, variables, TASKS_API_KEY)
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
            column_values { id text value column { title } }
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
    group: item.group,
    staffName: col['text_mm023fg0']?.text || '',
    info:      col['long_text_mm02ag04']?.text || '',
    date:      col['date4']?.text || '',
    status:    col['status']?.text || '',
    clockIn:   col['text_mm02171']?.text || '',
    clockOut:  col['text_mm02p02j']?.text || '',
  }
}

// ─── Animals ─────────────────────────────────────────────────────────────────

export const ANIMALS_BOARD_ID = '18395842832'

export async function fetchAllAnimals() {
  return fetchAllItems(ANIMALS_BOARD_ID)
}

export async function fetchAnimalUpdates(itemId) {
  const query = `{
    items(ids: [${itemId}]) {
      updates(limit: 50) {
        id
        text_body
        created_at
        assets {
          id
          name
          url
          file_extension
        }
      }
    }
  }`
  const data = await monday(query)
  return data.items?.[0]?.updates || []
}

export function transformAnimal(item) {
  // Map by column title (case-insensitive) — robust across ID changes
  const byTitle = {}
  const byTitleRaw = {}  // keeps raw column object for link parsing
  item.column_values.forEach((c) => {
    const key = (c.column?.title || '').toLowerCase().trim()
    byTitle[key] = c.text || ''
    byTitleRaw[key] = c
  })

  const get = (...titles) => {
    for (const t of titles) {
      const v = byTitle[t.toLowerCase()]
      if (v) return v
    }
    return ''
  }

  const getLink = (...titles) => {
    for (const t of titles) {
      const c = byTitleRaw[t.toLowerCase()]
      if (c?.value) {
        try { return JSON.parse(c.value).url || '' } catch {}
      }
    }
    return ''
  }

  return {
    id: item.id,
    name: item.name,
    group: item.group,
    animalId:    get('animal id'),
    species:     get('species'),
    status:      get('status'),
    forAdoption: get('for adoption'),
    location:    get('sanctuary location'),
    weight:      get('weight (lbs)', 'weight'),
    breed:       get('breed'),
    sex:         get('sex'),
    color:       get('color / markings', 'color'),
    age:         get('estimated dob / age', 'age'),
    intakeDate:  get('intake date'),
    fromLocation:get('from location'),
    photoLink:   getLink('photo link', 'photo'),
    petfinderLink: getLink('petfinder link', 'petfinder'),
    driveLink:   getLink('drive link', 'drive'),
  }
}

// ─── Tasks (Program Management) ──────────────────────────────────────────────

export const TASKS_BOARD_ID = '18398809584'

export async function fetchAllTasks() {
  let items = []
  let cursor = null
  do {
    const cursorArg = cursor ? `, cursor: "${cursor}"` : ''
    const query = `{
      boards(ids: [${TASKS_BOARD_ID}]) {
        items_page(limit: 500${cursorArg}) {
          cursor
          items {
            id name
            group { id title }
            column_values { id text value column { title } }
            subitems { id }
          }
        }
      }
    }`
    const data = await mondayTasks(query)
    const page = data.boards[0].items_page
    if (items.length === 0 && page.items.length > 0) {
      console.log('[TASK columns]', page.items[0].column_values.map(c => `${c.column?.title}(${c.id})`))
    }
    items = items.concat(page.items)
    cursor = page.cursor
  } while (cursor)
  return items
}

export async function fetchSubitems(itemId) {
  const query = `{
    items(ids: [${itemId}]) {
      subitems {
        id name
        column_values { id text value column { title } }
      }
    }
  }`
  const data = await mondayTasks(query)
  const subs = data.items?.[0]?.subitems || []
  return subs.map(transformTask)
}

export function transformTask(item) {
  const byTitle = {}
  const byTitleRaw = {}
  ;(item.column_values || []).forEach((c) => {
    const key = (c.column?.title || '').toLowerCase().trim()
    byTitle[key] = c.text || ''
    byTitleRaw[key] = c
  })

  const get = (...titles) => {
    for (const t of titles) { const v = byTitle[t.toLowerCase()]; if (v) return v }
    return ''
  }
  const getLink = (...titles) => {
    for (const t of titles) {
      const c = byTitleRaw[t.toLowerCase()]
      if (c?.value) { try { return JSON.parse(c.value).url || '' } catch {} }
    }
    return ''
  }

  // Status column: match by title OR fall back to first column whose value has a "label" key (Monday.com status columns store {"label":"..."})
  const statusCol = (item.column_values || []).find(c => {
    const title = (c.column?.title || '').toLowerCase()
    if (['status', 'state', 'progress', 'task status', 'label'].includes(title)) return true
    if (c.value) { try { const v = JSON.parse(c.value); return 'label' in v } catch {} }
    return false
  })

  return {
    id:             item.id,
    name:           item.name,
    group:          item.group,
    status:         statusCol?.text || (() => { try { return JSON.parse(statusCol?.value || '')?.label?.text || '' } catch { return '' } })(),
    statusColumnId: statusCol?.id || '',
    timeline:       get('timeline'),
    notes:          get('notes') || getLink('notes'),
    notesUrl:       getLink('notes'),
    hasSubitems:    (item.subitems?.length ?? 0) > 0,
  }
}

export async function fetchTaskUpdates(itemId) {
  const query = `{
    items(ids: [${itemId}]) {
      updates(limit: 50) {
        id text_body created_at
        assets { id name url file_extension }
      }
    }
  }`
  const data = await mondayTasks(query)
  return data.items?.[0]?.updates || []
}

export async function createTaskUpdate(itemId, body) {
  const query = `
    mutation CreateUpdate($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) { id }
    }
  `
  return mondayTasks(query, { itemId: String(itemId), body })
}

export async function updateTaskStatus(itemId, columnId, label) {
  const query = `
    mutation UpdateStatus($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
    }
  `
  const value = label ? JSON.stringify({ label }) : JSON.stringify({ label: '' })
  return mondayTasks(query, { boardId: String(TASKS_BOARD_ID), itemId: String(itemId), columnId, value })
}

export async function createTask(groupId, name) {
  const query = `
    mutation CreateItem($boardId: ID!, $groupId: String!, $name: String!) {
      create_item(board_id: $boardId, group_id: $groupId, item_name: $name) { id name }
    }
  `
  return mondayTasks(query, { boardId: String(TASKS_BOARD_ID), groupId, name })
}
