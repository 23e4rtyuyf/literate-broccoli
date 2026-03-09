import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, identity } from '../api'

const ACTION_LABELS = {
  household_registered: 'Household registered',
  household_updated: 'Household updated',
  household_deleted: 'Household deleted',
  crisis_activated: 'Crisis activated',
  crisis_resolved: 'Crisis resolved',
  task_claimed: 'Task claimed',
  task_completed: 'Task completed',
  task_flagged: 'Task flagged',
  captain_application_submitted: 'Captain application submitted',
  captain_application_approved: 'Captain application approved',
  captain_application_denied: 'Captain application denied',
  system_seeded: 'System seeded (demo data)',
}

const ACTION_COLORS = {
  crisis_activated: '#dc2626',
  crisis_resolved: '#16a34a',
  household_deleted: '#dc2626',
  task_flagged: '#d97706',
  captain_application_approved: '#16a34a',
  captain_application_denied: '#dc2626',
}

export default function Admin() {
  const me = identity.get()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [auditLog, setAuditLog] = useState([])
  const [applications, setApplications] = useState([])
  const [crises, setCrises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!me) { navigate('/'); return }
    if (!me.is_admin) { navigate('/'); return }
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [s, log, apps, c] = await Promise.all([
        api.getAdminStats(),
        api.getAuditLog(50),
        api.getCaptainApplications('pending'),
        api.getCrises(),
      ])
      setStats(s)
      setAuditLog(log)
      setApplications(apps)
      setCrises(c)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
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

  if (!me || !me.is_admin) return null
  if (loading) return <div className="loading"><div className="spinner" /> Loading admin dashboard…</div>

  const activeCrises = crises.filter(c => c.status === 'active' && !c.is_drill)
  const activeDrills = crises.filter(c => c.status === 'active' && c.is_drill)
  const resolvedCrises = crises.filter(c => c.status === 'resolved' && !c.is_drill)

  return (
    <div>
      <div className="page-header row-between">
        <div>
          <h1 className="page-title">🏛️ City Admin Dashboard</h1>
          <div className="page-subtitle">{me.name} · Emergency Management Command Center</div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-outline" onClick={() => api.exportHouseholdsCsv()} aria-label="Download all households as CSV">
            ⬇ Households CSV
          </button>
          <Link to="/dashboard" className="btn btn-outline">Captain Dashboard →</Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Stats strip */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-value">{stats.total_zones}</div>
            <div className="stat-label">Zones</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.total_households}</div>
            <div className="stat-label">Households</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: activeCrises.length > 0 ? 'var(--red)' : undefined }}>
              {stats.active_crises}
            </div>
            <div className="stat-label">Active Crises</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: stats.coverage_rate >= 80 ? 'var(--green)' : stats.coverage_rate >= 50 ? 'var(--amber)' : 'var(--red)' }}>
              {stats.coverage_rate}%
            </div>
            <div className="stat-label">Overall Coverage</div>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid-4" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--amber)' }}>{stats.active_drills}</div>
            <div className="stat-label">Active Drills</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--green)' }}>{stats.resolved_crises}</div>
            <div className="stat-label">Resolved Crises</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: stats.pending_applications > 0 ? 'var(--amber)' : undefined }}>
              {stats.pending_applications}
            </div>
            <div className="stat-label">Pending Applications</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{crises.length}</div>
            <div className="stat-label">Total Incidents</div>
          </div>
        </div>
      )}

      {/* Tab nav */}
      <div className="tabs" style={{ marginBottom: 0 }} role="tablist">
        {[
          { id: 'overview', label: 'Zones Overview' },
          { id: 'applications', label: `Applications${applications.length > 0 ? ` (${applications.length})` : ''}` },
          { id: 'crises', label: 'Incidents' },
          { id: 'audit', label: 'Audit Log' },
        ].map(({ id, label }) => (
          <button
            key={id}
            className={`tab ${activeTab === id ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Zones overview tab */}
      {activeTab === 'overview' && stats && (
        <div className="card" style={{ borderTopLeftRadius: 0 }}>
          <h2 className="card-title" style={{ marginBottom: 12 }}>Zones & Coverage</h2>
          {stats.zones.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🗺️</div><div>No zones yet.</div></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', color: 'var(--muted)', fontWeight: 600 }}>Zone</th>
                    <th style={{ padding: '8px 12px', color: 'var(--muted)', fontWeight: 600 }}>Captain</th>
                    <th style={{ padding: '8px 12px', color: 'var(--muted)', fontWeight: 600 }}>Households</th>
                    <th style={{ padding: '8px 12px', color: 'var(--muted)', fontWeight: 600 }}>High Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.zones.map(z => (
                    <tr key={z.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{z.name}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {z.captain_count > 0
                          ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ {z.captain_count} captain{z.captain_count !== 1 ? 's' : ''}</span>
                          : <span style={{ color: 'var(--red)' }}>⚠ None</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{z.household_count}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {z.high_priority_count > 0
                          ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>{z.high_priority_count}</span>
                          : <span style={{ color: 'var(--muted)' }}>0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Applications tab */}
      {activeTab === 'applications' && (
        <div className="card" style={{ borderTopLeftRadius: 0 }}>
          <h2 className="card-title" style={{ marginBottom: 12 }}>Pending Captain Applications</h2>
          {applications.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📋</div><div>No pending applications.</div></div>
          ) : (
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
          )}
        </div>
      )}

      {/* Crises tab */}
      {activeTab === 'crises' && (
        <div className="card" style={{ borderTopLeftRadius: 0 }}>
          <h2 className="card-title" style={{ marginBottom: 12 }}>Incident History</h2>
          {crises.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📋</div><div>No incidents recorded.</div></div>
          ) : (
            <div className="stack">
              {crises.map(c => (
                <div key={c.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }} className="row-between">
                  <div>
                    <div className="row gap-8 items-center">
                      <span className="font-semibold">{c.type.replace('_', ' ')}</span>
                      {c.is_drill && <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>DRILL</span>}
                      <span className={`badge badge-${c.status}`}>{c.status}</span>
                    </div>
                    {c.description && <div className="text-sm text-muted">{c.description}</div>}
                    <div className="text-xs text-muted">{new Date(c.declared_at).toLocaleString()}</div>
                  </div>
                  <div className="row gap-8">
                    <Link to={`/crisis/${c.id}`} className="btn btn-outline btn-sm">Task Board</Link>
                    <button className="btn btn-outline btn-sm" onClick={() => api.exportDebriefCsv(c.id)} aria-label={`Download CSV for crisis ${c.id}`}>
                      ⬇ CSV
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit log tab */}
      {activeTab === 'audit' && (
        <div className="card" style={{ borderTopLeftRadius: 0 }}>
          <h2 className="card-title" style={{ marginBottom: 12 }}>Audit Log — Last 50 Actions</h2>
          {auditLog.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📋</div><div>No audit entries yet.</div></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px', color: 'var(--muted)', fontWeight: 600 }}>When</th>
                    <th style={{ padding: '6px 10px', color: 'var(--muted)', fontWeight: 600 }}>Who</th>
                    <th style={{ padding: '6px 10px', color: 'var(--muted)', fontWeight: 600 }}>Action</th>
                    <th style={{ padding: '6px 10px', color: 'var(--muted)', fontWeight: 600 }}>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map(entry => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '7px 10px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '7px 10px', fontWeight: 500 }}>
                        {entry.household_name || '—'}
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ color: ACTION_COLORS[entry.action] || 'var(--text)' }}>
                          {ACTION_LABELS[entry.action] || entry.action}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', color: 'var(--muted)' }}>
                        {entry.target_type ? `${entry.target_type} #${entry.target_id}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
