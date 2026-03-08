import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, identity } from '../api'

const CRISIS_ICONS = {
  storm: '⛈️',
  outage: '⚡',
  flood: '🌊',
  wildfire: '🔥',
  missing_person: '🔍',
}

const CRISIS_LABELS = {
  storm: 'Storm',
  outage: 'Power Outage',
  flood: 'Flood',
  wildfire: 'Wildfire',
  missing_person: 'Missing Person',
}

function PriorityBar({ score }) {
  const level = score >= 70 ? 'critical' : score >= 40 ? 'high' : score >= 20 ? 'medium' : 'low'
  return (
    <span className={`priority-bar ${level}`} title={`Priority: ${Math.round(score)}/100`}>
      <span className="priority-bar-fill" style={{ width: `${score}%` }} />
    </span>
  )
}

export default function Home() {
  const [me, setMe] = useState(identity.get())
  const [crises, setCrises] = useState([])
  const [households, setHouseholds] = useState([])
  const [seeding, setSeeding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    try {
      const [c, h] = await Promise.all([api.getCrises(), api.getHouseholds()])
      setCrises(c)
      setHouseholds(h)
    } catch {
      // Backend may not be running yet
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSeed() {
    setSeeding(true)
    setError(null)
    try {
      await api.seed()
      identity.clear()
      setMe(null)
      window.dispatchEvent(new Event('cg:identity'))
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSeeding(false)
    }
  }

  function selectIdentity(household) {
    identity.set(household)
    setMe(household)
    window.dispatchEvent(new Event('cg:identity'))
    if (household.is_captain) navigate('/dashboard')
  }

  const activeCrises = crises.filter(c => c.status === 'active')

  return (
    <div>
      <div className="hero">
        <div className="hero-title">
          Neighborhood emergency<br /><span>coordination</span> — not chaos.
        </div>
        <div className="hero-subtitle">
          CrisisGrid gives communities a structured ops layer when 911 is overloaded
          and group texts collapse. Verified block captains. Priority task queues.
          No neighbor left unchecked.
        </div>
        <div className="hero-actions">
          {!me && (
            <Link to="/register" className="btn btn-orange btn-lg">
              Register Your Household
            </Link>
          )}
          {me?.is_captain && (
            <Link to="/dashboard" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
              Captain Dashboard →
            </Link>
          )}
          <button
            className="btn btn-lg"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}
            onClick={handleSeed}
            disabled={seeding}
          >
            {seeding ? 'Loading…' : '🧪 Load Demo Data'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Identity selector */}
      {!me && households.length > 0 && (
        <div className="card mb-16">
          <div className="card-header">
            <div>
              <div className="card-title">Who are you?</div>
              <div className="card-subtitle">Select your household to get started</div>
            </div>
          </div>
          <div className="stack">
            {households.map(h => (
              <div key={h.id} className="household-card" style={{ cursor: 'pointer' }} onClick={() => selectIdentity(h)}>
                <div className="household-avatar">{h.name[0]}</div>
                <div className="household-card-body">
                  <div className="row-between">
                    <div>
                      <div className="font-semibold">{h.name}</div>
                      <div className="text-sm text-muted">{h.address}</div>
                    </div>
                    <div className="row gap-8">
                      {h.is_captain && <span className="badge badge-active">Captain</span>}
                      <PriorityBar score={h.priority_score} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {me && (
        <div className="alert alert-info mb-16" style={{ marginBottom: 16 }}>
          <span>👋</span>
          <span>
            Signed in as <strong>{me.name}</strong> — {me.address}
            {me.is_captain && <strong> · Block Captain</strong>}
          </span>
        </div>
      )}

      {/* Active crises */}
      {activeCrises.length > 0 && (
        <div className="card mb-16" style={{ marginBottom: 16, borderColor: '#fca5a5', borderWidth: 2 }}>
          <div className="card-header">
            <div className="card-title text-red">🚨 Active Emergencies</div>
          </div>
          <div className="stack">
            {activeCrises.map(c => (
              <div key={c.id} className="row-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="row gap-8">
                  <span style={{ fontSize: 24 }}>{CRISIS_ICONS[c.type] || '⚠️'}</span>
                  <div>
                    <div className="font-semibold">{CRISIS_LABELS[c.type] || c.type}</div>
                    <div className="text-sm text-muted">{c.description || 'Active emergency in progress'}</div>
                    <div className="text-xs text-muted">Declared {new Date(c.declared_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="row gap-8">
                  <Link to={`/crisis/${c.id}`} className="btn btn-danger btn-sm">View Task Board</Link>
                  <Link to={`/debrief/${c.id}`} className="btn btn-outline btn-sm">Debrief</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          { icon: '🏠', title: 'Register', desc: 'Households self-report vulnerability info and available resources.' },
          { icon: '👮', title: 'Captains coordinate', desc: 'Verified block captains activate events and manage task queues.' },
          { icon: '✅', title: 'Neighbors act', desc: 'Residents claim and complete check-in tasks. No one falls through the cracks.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
            <div className="font-semibold" style={{ marginBottom: 6 }}>{title}</div>
            <div className="text-sm text-muted">{desc}</div>
          </div>
        ))}
      </div>

      {loading && <div className="loading"><div className="spinner" /> Loading…</div>}
    </div>
  )
}
