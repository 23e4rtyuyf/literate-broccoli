import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, identity } from '../api'

const CRISIS_TYPES = [
  { value: 'storm', label: '⛈️ Storm' },
  { value: 'outage', label: '⚡ Power Outage' },
  { value: 'flood', label: '🌊 Flood' },
  { value: 'wildfire', label: '🔥 Wildfire' },
  { value: 'missing_person', label: '🔍 Missing Person' },
]
const CRISIS_ICONS = { storm: '⛈️', outage: '⚡', flood: '🌊', wildfire: '🔥', missing_person: '🔍' }

function PriorityBadge({ score }) {
  const [color, bg] = score >= 70 ? ['var(--red)', '#fee2e2'] :
                      score >= 40 ? ['#c2410c', '#ffedd5'] :
                      score >= 15 ? ['var(--amber)', 'var(--amber-bg)'] :
                                    ['var(--green)', 'var(--green-bg)']
  return (
    <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
      {Math.round(score)}
    </span>
  )
}

function ResourceTags({ resources }) {
  const icons = { generator: '🔌', truck: '🚛', first_aid: '🩺', spare_room: '🛏️', chainsaw: '🪚', ham_radio: '📻' }
  const active = Object.entries(resources).filter(([, v]) => v).map(([k]) => k)
  if (!active.length) return null
  return (
    <span className="row flex-wrap gap-8" style={{ marginTop: 4 }}>
      {active.map(k => <span key={k} style={{ fontSize: 12 }}>{icons[k] || k}</span>)}
    </span>
  )
}

export default function Dashboard() {
  const me = identity.get()
  const navigate = useNavigate()
  const [households, setHouseholds] = useState([])
  const [crises, setCrises] = useState([])
  const [zones, setZones] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCrisisForm, setShowCrisisForm] = useState(false)
  const [activatingCrisis, setActivatingCrisis] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('households')
  const [crisisForm, setCrisisForm] = useState({ type: 'storm', description: '', affected_zones: [], is_drill: false })
  const [lastCrisisResult, setLastCrisisResult] = useState(null)

  useEffect(() => {
    if (!me) { navigate('/'); return }
    if (!me.is_captain) { navigate('/'); return }
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [h, c, z, apps] = await Promise.all([
        api.getHouseholds(me.zone_id || null),
        api.getCrises(),
        api.getZones(),
        api.getCaptainApplications('pending'),
      ])
      setHouseholds(h)
      setCrises(c)
      setZones(z)
      setApplications(apps)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function activateCrisis() {
    setActivatingCrisis(true)
    setError(null)
    try {
      const result = await api.activateCrisis({
        ...crisisForm,
        declared_by: me.id,
        affected_zones: crisisForm.affected_zones.map(Number),
      })
      setLastCrisisResult(result)
      setShowCrisisForm(false)
      navigate(`/crisis/${result.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setActivatingCrisis(false)
    }
  }

  async function handleApplication(appId, action) {
    try {
      if (action === 'approve') await api.approveApplication(appId)
      else await api.denyApplication(appId)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  function toggleZone(zoneId) {
    setCrisisForm(f => ({
      ...f,
      affected_zones: f.affected_zones.includes(zoneId)
        ? f.affected_zones.filter(z => z !== zoneId)
        : [...f.affected_zones, zoneId],
    }))
  }

  if (!me) return null
  if (loading) return <div className="loading"><div className="spinner" /> Loading dashboard…</div>

  const highPriority = households.filter(h => h.priority_score >= 40)
  const helpers = households.filter(h => h.can_help && h.priority_score < 20)
  const activeCrises = crises.filter(c => c.status === 'active')

  return (
    <div>
      <div className="page-header row-between">
        <div>
          <div className="page-title">Captain Dashboard</div>
          <div className="page-subtitle">{me.name} · {me.address}{me.city ? `, ${me.city}, ${me.state}` : ''}</div>
        </div>
        <div className="row gap-8">
          <Link to="/map" className="btn btn-outline">🗺️ Map View</Link>
          <button className="btn btn-danger" onClick={() => setShowCrisisForm(true)} disabled={showCrisisForm}>
            🚨 Activate Emergency
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {applications.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          📋 <strong>{applications.length} pending captain application{applications.length !== 1 ? 's' : ''}</strong> awaiting your review.
          <button className="btn btn-sm btn-outline" style={{ marginLeft: 12 }} onClick={() => setActiveTab('applications')}>
            Review Now
          </button>
        </div>
      )}

      {showCrisisForm && (
        <div className="card mb-16" style={{ marginBottom: 16, borderColor: 'var(--red)', borderWidth: 2 }}>
          <div className="card-title" style={{ marginBottom: 16, color: 'var(--red)' }}>🚨 Activate Emergency</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Emergency type</label>
              <select className="form-select" value={crisisForm.type} onChange={e => setCrisisForm(f => ({ ...f, type: e.target.value }))}>
                {CRISIS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Affected zones</label>
              <div className="checkbox-group">
                {zones.map(z => (
                  <label key={z.id} className="checkbox-item">
                    <input type="checkbox" checked={crisisForm.affected_zones.includes(z.id)} onChange={() => toggleZone(z.id)} />
                    {z.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <input className="form-input" placeholder="Brief situation description…" value={crisisForm.description} onChange={e => setCrisisForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="checkbox-item" style={{ fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={crisisForm.is_drill}
                onChange={e => setCrisisForm(f => ({ ...f, is_drill: e.target.checked }))}
              />
              🟡 This is a drill (practice exercise — residents will see a DRILL banner)
            </label>
          </div>
          <div className="alert alert-warning">
            This will generate a check-in task for every household in the selected zones.
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button className="btn btn-danger" onClick={activateCrisis} disabled={activatingCrisis || crisisForm.affected_zones.length === 0}>
              {activatingCrisis ? 'Activating…' : '🚨 Confirm'}
            </button>
            <button className="btn btn-outline" onClick={() => setShowCrisisForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Active crises */}
      {activeCrises.length > 0 && (
        <div className="card mb-16" style={{ marginBottom: 16 }}>
          <div className="card-title text-red" style={{ marginBottom: 12 }}>Active Emergencies</div>
          <div className="stack">
            {activeCrises.map(c => (
              <div key={c.id} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="row gap-8">
                  <span style={{ fontSize: 20 }}>{CRISIS_ICONS[c.type] || '⚠️'}</span>
                  <div>
                    <div className="font-semibold">{CRISIS_TYPES.find(t => t.value === c.type)?.label || c.type}</div>
                    <div className="text-xs text-muted">{new Date(c.declared_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="row gap-8">
                  <Link to={`/crisis/${c.id}`} className="btn btn-danger btn-sm">Task Board</Link>
                  <Link to={`/debrief/${c.id}`} className="btn btn-outline btn-sm">Debrief</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="stat-card"><div className="stat-value">{households.length}</div><div className="stat-label">Households</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--red)' }}>{highPriority.length}</div><div className="stat-label">High Priority</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: 'var(--green)' }}>{helpers.length}</div><div className="stat-label">Potential Helpers</div></div>
        <div className="stat-card"><div className="stat-value" style={{ color: applications.length > 0 ? 'var(--amber)' : undefined }}>{applications.length}</div><div className="stat-label">Pending Apps</div></div>
      </div>

      {/* Tab nav */}
      <div className="tabs" style={{ marginBottom: 0 }}>
        <button className={`tab ${activeTab === 'households' ? 'active' : ''}`} onClick={() => setActiveTab('households')}>
          Households ({households.length})
        </button>
        <button className={`tab ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>
          Captain Applications {applications.length > 0 && <span style={{ marginLeft: 4, background: 'var(--amber)', color: 'white', borderRadius: 99, padding: '0 6px', fontSize: 11 }}>{applications.length}</span>}
        </button>
      </div>

      {/* Households tab */}
      {activeTab === 'households' && (
        <div className="card" style={{ borderTopLeftRadius: 0 }}>
          <div className="card-subtitle" style={{ marginBottom: 12 }}>Sorted by vulnerability — highest risk first</div>
          <div className="stack">
            {households.length === 0 && (
              <div className="empty-state"><div className="empty-state-icon">🏘️</div><div>No households registered in your zone yet.</div></div>
            )}
            {households.map(h => (
              <div key={h.id} className="household-card">
                <div className="household-avatar">{h.name[0]}</div>
                <div className="household-card-body">
                  <div className="row-between">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row gap-8 items-center">
                        <span className="font-semibold">{h.name}</span>
                        {h.is_captain && <span className="badge badge-active" style={{ fontSize: 11 }}>Captain</span>}
                      </div>
                      <div className="text-sm text-muted">{h.address}{h.city ? `, ${h.city}, ${h.state}` : ''}</div>
                      <div className="row flex-wrap gap-8 mt-4">
                        {h.is_elderly && <span className="text-xs" style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>Elderly</span>}
                        {h.has_mobility_limitations && <span className="text-xs" style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>Mobility</span>}
                        {!h.has_car && <span className="text-xs" style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>No car</span>}
                        {h.medical_equipment?.length > 0 && (
                          <span className="text-xs" style={{ background: 'var(--amber-bg)', padding: '1px 6px', borderRadius: 4, color: 'var(--amber)' }}>⚡ Medical</span>
                        )}
                        {h.languages?.[0] && h.languages[0] !== 'English' && (
                          <span className="text-xs" style={{ background: 'var(--blue-bg)', padding: '1px 6px', borderRadius: 4, color: 'var(--blue)' }}>
                            {h.languages[0]}
                          </span>
                        )}
                      </div>
                      <ResourceTags resources={h.resources} />
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <PriorityBadge score={h.priority_score} />
                      <div className="text-xs text-muted mt-4">{h.residents_count} resident{h.residents_count !== 1 ? 's' : ''}</div>
                      {h.contact && <div className="text-xs text-muted">{h.contact}</div>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Applications tab */}
      {activeTab === 'applications' && (
        <div className="card" style={{ borderTopLeftRadius: 0 }}>
          {applications.length === 0 && (
            <div className="empty-state"><div className="empty-state-icon">📋</div><div>No pending applications.</div></div>
          )}
          <div className="stack">
            {applications.map(app => (
              <div key={app.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="row-between" style={{ marginBottom: 8 }}>
                  <div>
                    <div className="font-semibold">{app.applicant_name}</div>
                    <div className="text-sm text-muted">{app.address}</div>
                  </div>
                  <div className="row gap-8">
                    <button className="btn btn-success btn-sm" onClick={() => handleApplication(app.id, 'approve')}>✓ Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleApplication(app.id, 'deny')}>✕ Deny</button>
                  </div>
                </div>
                <div className="grid-2" style={{ fontSize: 13, gap: 8 }}>
                  <div><span className="text-muted">Role: </span>{app.role}</div>
                  {app.organization && <div><span className="text-muted">Org: </span>{app.organization}</div>}
                  {app.years_resident && <div><span className="text-muted">Years resident: </span>{app.years_resident}</div>}
                  {app.training && <div><span className="text-muted">Training: </span>{app.training}</div>}
                </div>
                {app.statement && (
                  <div style={{ marginTop: 8, padding: '10px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 13, lineHeight: 1.6, fontStyle: 'italic' }}>
                    "{app.statement}"
                  </div>
                )}
                <div className="text-xs text-muted" style={{ marginTop: 6 }}>
                  Applied {new Date(app.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
