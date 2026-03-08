const BASE = '/api'

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

const post = (path, body) => req(path, { method: 'POST', body: JSON.stringify(body) })

export const api = {
  health: () => req('/health'),

  // Zones
  getZones: () => req('/zones'),
  createZone: (data) => post('/zones', data),

  // Households
  register: (data) => post('/households', data),
  getHouseholds: (zoneId) => req(`/households${zoneId ? `?zone_id=${zoneId}` : ''}`),
  getHousehold: (id) => req(`/households/${id}`),

  // Crisis
  activateCrisis: (data) => post('/crisis', data),
  getCrises: () => req('/crisis'),
  getCrisis: (id) => req(`/crisis/${id}`),
  resolveCrisis: (id) => post(`/crisis/${id}/resolve`, {}),

  // Tasks
  getTasks: (crisisId, status) =>
    req(`/crisis/${crisisId}/tasks${status ? `?status=${status}` : ''}`),
  claimTask: (taskId, householdId) => post(`/tasks/${taskId}/claim`, { household_id: householdId }),
  completeTask: (taskId, householdId, notes) =>
    post(`/tasks/${taskId}/complete`, { household_id: householdId, notes }),
  flagTask: (taskId, householdId, notes) =>
    post(`/tasks/${taskId}/flag`, { household_id: householdId, notes }),

  // Debrief
  getDebrief: (crisisId) => req(`/crisis/${crisisId}/debrief`),

  // Seed
  seed: () => post('/seed', {}),
}

// Simple identity stored in localStorage
export const identity = {
  get: () => {
    try {
      return JSON.parse(localStorage.getItem('cg_household') || 'null')
    } catch {
      return null
    }
  },
  set: (household) => localStorage.setItem('cg_household', JSON.stringify(household)),
  clear: () => localStorage.removeItem('cg_household'),
}
