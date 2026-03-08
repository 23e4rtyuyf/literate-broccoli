import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api, identity } from '../api'

const CRISIS_LABELS = { storm: 'Storm', outage: 'Power Outage', flood: 'Flood', wildfire: 'Wildfire', missing_person: 'Missing Person' }
const CRISIS_ICONS = { storm: '⛈️', outage: '⚡', flood: '🌊', wildfire: '🔥', missing_person: '🔍' }
const STATUS_TABS = ['all', 'pending', 'claimed', 'completed', 'flagged']

function priorityLevel(score) {
  if (score >= 70) return 'critical'
  if (score >= 40) return 'high'
  if (score >= 15) return 'medium'
  return 'low'
}

function PriorityIndicator({ score }) {
  const colors = { critical: 'var(--red)', high: 'var(--orange)', medium: 'var(--amber)', low: 'var(--green)' }
  const level = priorityLevel(score)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[level] }} />
      <span style={{ fontSize: 12, color: colors[level], fontWeight: 700 }}>{Math.round(score)}</span>
    </div>
  )
}

function FlagModal({ task, onConfirm, onCancel }) {
  const [notes, setNotes] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
      <div className="card" style={{ maxWidth: 440, width: '100%' }}>
        <div className="card-title" style={{ marginBottom: 8, color: 'var(--red)' }}>🚩 Flag for Urgent Follow-up</div>
        <div className="text-sm text-muted" style={{ marginBottom: 16 }}>{task.description}</div>
        <div className="form-group">
          <label className="form-label">What's wrong? *</label>
          <textarea className="form-textarea" placeholder="e.g. No answer, door locked, visible damage, needs ambulance…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-danger" onClick={() => onConfirm(notes)} disabled={!notes.trim()}>Flag This Task</button>
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function CompleteModal({ task, onConfirm, onCancel }) {
  const [notes, setNotes] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
      <div className="card" style={{ maxWidth: 440, width: '100%' }}>
        <div className="card-title" style={{ marginBottom: 8, color: 'var(--green)' }}>✅ Mark as Completed</div>
        <div className="text-sm text-muted" style={{ marginBottom: 16 }}>{task.description}</div>
        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <textarea className="form-textarea" placeholder="e.g. Resident is okay. Sharing generator with next door." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-success" onClick={() => onConfirm(notes)}>Confirm Complete</button>
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, me, onClaim, onComplete, onFlag, loading }) {
  const level = priorityLevel(task.priority_score)
  const isMine = task.claimed_by === me?.id

  return (
    <div className={`task-card ${level}`}>
      <PriorityIndicator score={task.priority_score} />
      <div className="task-card-body">
        <div style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.4 }}>{task.description}</div>
        <div className="row flex-wrap gap-8 mt-4">
          <span className={`badge badge-${task.status}`}>
            {task.status === 'pending' ? '⏳ Pending' :
             task.status === 'claimed' ? '🙋 Claimed' :
             task.status === 'completed' ? '✅ Done' : '🚩 Flagged'}
          </span>
          {task.status === 'claimed' && isMine && (
            <span className="text-xs text-muted">You claimed this</span>
          )}
          {task.completed_at && (
            <span className="text-xs text-muted">{new Date(task.completed_at).toLocaleTimeString()}</span>
          )}
        </div>
        {task.notes && (
          <div className="text-sm text-muted mt-4" style={{ fontStyle: 'italic' }}>"{task.notes}"</div>
        )}
      </div>
      <div className="task-card-actions">
        {task.status === 'pending' && me && (
          <button className="btn btn-primary btn-sm" onClick={() => onClaim(task)} disabled={loading}>
            Claim
          </button>
        )}
        {task.status === 'claimed' && isMine && (
          <>
            <button className="btn btn-success btn-sm" onClick={() => onComplete(task)} disabled={loading}>Done</button>
            <button className="btn btn-danger btn-sm" onClick={() => onFlag(task)} disabled={loading}>Flag</button>
          </>
        )}
        {task.status === 'claimed' && !isMine && me?.is_captain && (
          <>
            <button className="btn btn-success btn-sm" onClick={() => onComplete(task)} disabled={loading}>Done</button>
            <button className="btn btn-danger btn-sm" onClick={() => onFlag(task)} disabled={loading}>Flag</button>
          </>
        )}
      </div>
    </div>
  )
}

export default function CrisisBoard() {
  const { id } = useParams()
  const me = identity.get()
  const navigate = useNavigate()
  const [crisis, setCrisis] = useState(null)
  const [tasks, setTasks] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [flagModal, setFlagModal] = useState(null)
  const [completeModal, setCompleteModal] = useState(null)
  const [resolving, setResolving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([api.getCrisis(id), api.getTasks(id)])
      setCrisis(c)
      setTasks(t)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function claim(task) {
    if (!me) return
    setActionLoading(true)
    try {
      await api.claimTask(task.id, me.id)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function complete(task, notes) {
    setActionLoading(true)
    setCompleteModal(null)
    try {
      await api.completeTask(task.id, me?.id || 0, notes)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function flag(task, notes) {
    setActionLoading(true)
    setFlagModal(null)
    try {
      await api.flagTask(task.id, me?.id || 0, notes)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function resolve() {
    setResolving(true)
    try {
      await api.resolveCrisis(id)
      navigate(`/debrief/${id}`)
    } catch (e) {
      setError(e.message)
      setResolving(false)
    }
  }

  const filtered = activeTab === 'all' ? tasks : tasks.filter(t => t.status === activeTab)

  const counts = STATUS_TABS.reduce((acc, s) => {
    acc[s] = s === 'all' ? tasks.length : tasks.filter(t => t.status === s).length
    return acc
  }, {})

  const completedCount = counts.completed
  const coverage = tasks.length > 0 ? Math.round(completedCount / tasks.length * 100) : 0

  if (loading) return <div className="loading"><div className="spinner" /> Loading task board…</div>
  if (!crisis) return <div className="alert alert-error">Crisis not found.</div>

  return (
    <div>
      {flagModal && <FlagModal task={flagModal} onConfirm={(notes) => flag(flagModal, notes)} onCancel={() => setFlagModal(null)} />}
      {completeModal && <CompleteModal task={completeModal} onConfirm={(notes) => complete(completeModal, notes)} onCancel={() => setCompleteModal(null)} />}

      {/* Header */}
      <div className="page-header">
        <div className="row-between">
          <div>
            <div className="row gap-8 items-center" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 28 }}>{CRISIS_ICONS[crisis.type] || '⚠️'}</span>
              <div className="page-title">{CRISIS_LABELS[crisis.type] || crisis.type}</div>
              <span className={`badge badge-${crisis.status}`}>
                {crisis.status === 'active' ? '🔴 Active' : '✅ Resolved'}
              </span>
            </div>
            {crisis.description && <div className="text-muted">{crisis.description}</div>}
            <div className="text-sm text-muted">Declared {new Date(crisis.declared_at).toLocaleString()}</div>
          </div>
          {crisis.status === 'active' && me?.is_captain && (
            <button className="btn btn-outline" onClick={resolve} disabled={resolving}>
              {resolving ? 'Resolving…' : '✓ Mark Resolved'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!me && (
        <div className="alert alert-warning">
          <span>👤</span>
          <span>Select your household on the <Link to="/">home page</Link> to claim tasks.</span>
        </div>
      )}

      {/* Coverage stats */}
      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-value">{counts.all}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--green)' }}>{counts.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: counts.flagged > 0 ? 'var(--red)' : 'var(--text)' }}>{counts.flagged}</div>
          <div className="stat-label">Flagged</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: coverage >= 80 ? 'var(--green)' : coverage >= 50 ? 'var(--amber)' : 'var(--red)' }}>
            {coverage}%
          </div>
          <div className="stat-label">Coverage</div>
        </div>
      </div>

      {/* Coverage bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <span className="text-sm font-semibold">Coverage Progress</span>
          <span className="text-sm text-muted">{completedCount} of {tasks.length} households checked</span>
        </div>
        <div className="progress">
          <div className="progress-fill" style={{ width: `${coverage}%`, background: coverage >= 80 ? 'var(--green)' : coverage >= 50 ? 'var(--amber)' : 'var(--red)' }} />
        </div>
        {counts.flagged > 0 && (
          <div className="alert alert-error mt-8" style={{ marginTop: 8 }}>
            🚩 {counts.flagged} task{counts.flagged !== 1 ? 's' : ''} flagged for urgent follow-up
          </div>
        )}
      </div>

      {/* Task board */}
      <div className="card">
        <div className="tabs">
          {STATUS_TABS.map(s => (
            <button key={s} className={`tab ${activeTab === s ? 'active' : ''}`} onClick={() => setActiveTab(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {counts[s] > 0 && <span style={{ marginLeft: 6, background: 'var(--border)', padding: '0 6px', borderRadius: 99, fontSize: 11 }}>{counts[s]}</span>}
            </button>
          ))}
        </div>

        <div className="stack">
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div>No tasks in this category.</div>
            </div>
          )}
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              me={me}
              onClaim={claim}
              onComplete={(t) => setCompleteModal(t)}
              onFlag={(t) => setFlagModal(t)}
              loading={actionLoading}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Link to={`/debrief/${id}`} className="btn btn-outline">View Debrief Report</Link>
      </div>
    </div>
  )
}
