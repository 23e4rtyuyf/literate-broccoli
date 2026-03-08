import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

const CRISIS_LABELS = { storm: 'Storm', outage: 'Power Outage', flood: 'Flood', wildfire: 'Wildfire', missing_person: 'Missing Person' }
const CRISIS_ICONS = { storm: '⛈️', outage: '⚡', flood: '🌊', wildfire: '🔥', missing_person: '🔍' }

function StatBlock({ value, label, color }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function TaskRow({ task, variant }) {
  const bg = variant === 'flagged' ? 'var(--red-bg)' : variant === 'completed' ? 'var(--green-bg)' : 'transparent'
  const icon = variant === 'flagged' ? '🚩' : '✅'
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14 }}>{task.description}</div>
        {task.notes && (
          <div className="text-sm text-muted" style={{ marginTop: 2, fontStyle: 'italic' }}>"{task.notes}"</div>
        )}
        {task.completed_at && (
          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
            Completed {new Date(task.completed_at).toLocaleString()}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>
        Score: {Math.round(task.priority_score)}
      </div>
    </div>
  )
}

export default function Debrief() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getDebrief(id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading"><div className="spinner" /> Generating debrief…</div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!data) return null

  const { crisis, summary, high_priority_unchecked, flagged_tasks, completed_tasks, generated_at } = data
  const coverageColor = summary.coverage_rate >= 80 ? 'var(--green)' : summary.coverage_rate >= 50 ? 'var(--amber)' : 'var(--red)'

  return (
    <div>
      <div className="page-header">
        <div className="row gap-8 items-center" style={{ marginBottom: 8 }}>
          <Link to={crisis.status === 'active' ? `/crisis/${id}` : '/'} className="btn btn-outline btn-sm">← Back</Link>
        </div>
        <div className="row gap-8 items-center" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 28 }}>{CRISIS_ICONS[crisis.type] || '⚠️'}</span>
          <div className="page-title">
            {CRISIS_LABELS[crisis.type] || crisis.type} — Incident Debrief
          </div>
          <span className={`badge badge-${crisis.status}`}>
            {crisis.status === 'active' ? '🔴 Active' : '✅ Resolved'}
          </span>
        </div>
        {crisis.description && <div className="text-muted">{crisis.description}</div>}
        <div className="text-sm text-muted">
          Declared: {new Date(crisis.declared_at).toLocaleString()}
          {crisis.resolved_at && ` · Resolved: ${new Date(crisis.resolved_at).toLocaleString()}`}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid-4" style={{ marginBottom: 16 }}>
        <StatBlock value={summary.total_tasks} label="Households Assigned" />
        <StatBlock value={summary.completed} label="Checked In" color="var(--green)" />
        <StatBlock value={summary.flagged} label="Flagged" color={summary.flagged > 0 ? 'var(--red)' : undefined} />
        <StatBlock value={`${summary.coverage_rate}%`} label="Coverage Rate" color={coverageColor} />
      </div>

      {/* Coverage bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <span className="font-semibold">Coverage Progress</span>
          <span className="text-sm text-muted">{summary.completed} of {summary.total_tasks} completed</span>
        </div>
        <div className="progress" style={{ height: 14 }}>
          <div className="progress-fill" style={{ width: `${summary.coverage_rate}%`, background: coverageColor }} />
        </div>
        <div className="row flex-wrap gap-8 mt-8" style={{ marginTop: 12 }}>
          <span style={{ fontSize: 13 }}><span style={{ color: 'var(--green)', fontWeight: 700 }}>■</span> {summary.completed} completed</span>
          <span style={{ fontSize: 13 }}><span style={{ color: 'var(--blue)', fontWeight: 700 }}>■</span> {summary.claimed} in progress</span>
          <span style={{ fontSize: 13 }}><span style={{ color: '#94a3b8', fontWeight: 700 }}>■</span> {summary.pending} pending</span>
          {summary.flagged > 0 && <span style={{ fontSize: 13 }}><span style={{ color: 'var(--red)', fontWeight: 700 }}>■</span> {summary.flagged} flagged</span>}
        </div>
      </div>

      {/* Flagged tasks — urgent */}
      {flagged_tasks.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--red)', borderWidth: 2 }}>
          <div className="card-title text-red" style={{ marginBottom: 4 }}>🚩 Flagged — Requires Follow-up</div>
          <div className="text-sm text-muted" style={{ marginBottom: 16 }}>These households could not be confirmed safe. Immediate action required.</div>
          {flagged_tasks.map(t => <TaskRow key={t.id} task={t} variant="flagged" />)}
        </div>
      )}

      {/* High priority not yet checked */}
      {high_priority_unchecked.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--amber)', borderWidth: 2 }}>
          <div className="card-title" style={{ marginBottom: 4, color: 'var(--amber)' }}>⚠️ High Priority — Not Yet Confirmed</div>
          <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
            Vulnerable households (priority score ≥ 40) that have not been completed.
          </div>
          {high_priority_unchecked.map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>⏳</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14 }}>{t.description}</div>
                <span className={`badge badge-${t.status}`} style={{ marginTop: 4 }}>{t.status}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', flexShrink: 0 }}>
                Score: {Math.round(t.priority_score)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed tasks */}
      {completed_tasks.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title" style={{ color: 'var(--green)' }}>✅ Completed Check-ins</div>
            <span className="badge badge-completed">{completed_tasks.length} total</span>
          </div>
          {completed_tasks.map(t => <TaskRow key={t.id} task={t} variant="completed" />)}
        </div>
      )}

      {completed_tasks.length === 0 && flagged_tasks.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div>No tasks have been completed yet.</div>
          {crisis.status === 'active' && (
            <Link to={`/crisis/${id}`} className="btn btn-primary" style={{ marginTop: 16 }}>Go to Task Board</Link>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 24 }}>
        Report generated {new Date(generated_at).toLocaleString()} · CrisisGrid Incident #{id}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
        {crisis.status === 'active' && (
          <Link to={`/crisis/${id}`} className="btn btn-danger">Return to Task Board</Link>
        )}
        <button className="btn btn-outline" onClick={() => window.print()}>Print Report</button>
        <Link to="/" className="btn btn-outline">Home</Link>
      </div>
    </div>
  )
}
