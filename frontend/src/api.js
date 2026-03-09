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
const put = (path, body = {}) => req(path, { method: 'PUT', body: JSON.stringify(body) })
const del = (path) => req(path, { method: 'DELETE' })

export const api = {
  health: () => req('/health'),

  // Zones
  getZones: () => req('/zones'),
  createZone: (data) => post('/zones', data),

  // Households
  register: (data) => post('/households', data),
  getHouseholds: (zoneId) => req(`/households${zoneId ? `?zone_id=${zoneId}` : ''}`),
  getHousehold: (id) => req(`/households/${id}`),
  updateHousehold: (id, data) => req(`/households/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHousehold: (id) => del(`/households/${id}`),
  exportHouseholdsCsv: () => {
    window.open(`${BASE}/households/export.csv`, '_blank')
  },

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
  exportDebriefCsv: (crisisId) => {
    window.open(`${BASE}/crisis/${crisisId}/debrief/export.csv`, '_blank')
  },

  // Messages
  sendMessage: (data) => post('/messages', data),
  broadcastToZone: (data) => post('/messages/broadcast', data),
  getInbox: (householdId) => req(`/messages/inbox/${householdId}`),
  getSent: (householdId) => req(`/messages/sent/${householdId}`),
  getUnreadCount: (householdId) => req(`/messages/unread/${householdId}`),
  markRead: (msgId) => put(`/messages/${msgId}/read`),
  markAllRead: (householdId) => put(`/messages/read-all/${householdId}`),

  // Captain applications
  captainApply: (data) => post('/captain-apply', data),
  getCaptainApplications: (status) =>
    req(`/captain-applications${status ? `?status=${status}` : ''}`),
  approveApplication: (id) => put(`/captain-applications/${id}/approve`),
  denyApplication: (id) => put(`/captain-applications/${id}/deny`),

  // Admin
  getAdminStats: () => req('/admin/stats'),
  getAuditLog: (limit = 100) => req(`/admin/audit-log?limit=${limit}`),

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
