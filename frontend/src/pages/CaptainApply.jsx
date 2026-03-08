import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, identity } from '../api'

const ROLES = [
  'CERT (Community Emergency Response Team) Member',
  'Neighborhood Association Officer',
  'HOA Board Member',
  'Volunteer Fire / EMS',
  'Medical Professional',
  'Military / First Responder (Current/Retired)',
  'Neighborhood Watch Captain',
  'Other (describe in statement)',
]

const TRAINING = [
  'FEMA IS-100 (Introduction to Incident Command)',
  'FEMA IS-700 (National Incident Management System)',
  'CERT Basic Training',
  'Red Cross Disaster Training',
  'CPR / First Aid Certified',
  'Ham Radio Licensed (ARRL)',
]

export default function CaptainApply() {
  const me = identity.get()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [households, setHouseholds] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [termsChecked, setTermsChecked] = useState(false)
  const [form, setForm] = useState({
    household_id: me?.id || '',
    role: '',
    organization: '',
    years_resident: '',
    training: [],
    statement: '',
  })

  useEffect(() => {
    api.getHouseholds().then(setHouseholds).catch(() => {})
  }, [])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleTraining(item) {
    setForm(f => ({
      ...f,
      training: f.training.includes(item)
        ? f.training.filter(t => t !== item)
        : [...f.training, item],
    }))
  }

  function validate() {
    if (step === 0) return termsChecked
    if (step === 1) return form.household_id && form.role
    if (step === 2) return form.statement.length >= 100
    return true
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      await api.captainApply({
        household_id: parseInt(form.household_id),
        role: form.role,
        organization: form.organization,
        years_resident: form.years_resident ? parseInt(form.years_resident) : null,
        training: form.training.join(', ') || null,
        statement: form.statement,
      })
      setSubmitted(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
          <div className="page-title" style={{ marginBottom: 8 }}>Application Submitted</div>
          <div className="text-muted" style={{ marginBottom: 24, lineHeight: 1.7 }}>
            Your block captain application is under review. An existing captain in your zone
            will review it within 48 hours. You will receive a message in CrisisGrid when
            a decision is made.
          </div>
          <div className="alert alert-warning" style={{ textAlign: 'left', marginBottom: 24 }}>
            <div>
              <strong>While pending:</strong> You can still register as a household and
              participate in check-in tasks as a neighbor. Captain privileges will be granted
              after approval.
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 12 }}>
            <Link to="/" className="btn btn-primary">Go to Home</Link>
            <Link to="/messages" className="btn btn-outline">Check Messages</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">Apply to be a Block Captain</div>
        <div className="page-subtitle">
          Block captains coordinate emergency response for their neighborhood.
          This is a volunteer role with serious responsibilities.
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="alert alert-warning" style={{ marginBottom: 24 }}>
        <div>
          <strong>This is not a registration form.</strong> Block captain status requires
          review and approval by an existing captain or zone administrator.
          Misrepresenting your credentials is a violation of the{' '}
          <Link to="/terms">Terms of Service</Link>.
        </div>
      </div>

      {/* Step indicator */}
      <div className="steps" style={{ marginBottom: 24 }}>
        {['Terms', 'Credentials', 'Statement', 'Review'].map((label, i) => (
          <div key={i} className={`step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
            <div className="step-dot">{i < step ? '✓' : i + 1}</div>
            <div className="step-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        {/* Step 0: Terms */}
        {step === 0 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 12 }}>Captain Responsibilities</div>
            <div style={{ lineHeight: 1.8, fontSize: 14, color: 'var(--text)' }}>
              <p>As a block captain you agree to:</p>
              <ul style={{ marginLeft: 20, marginTop: 8 }}>
                <li>Act as a private volunteer in a personal capacity — not as a representative of CrisisGrid or any government agency</li>
                <li>Direct all life-threatening situations to 911 immediately, before taking any other action</li>
                <li>Maintain accurate and up-to-date household records in your zone</li>
                <li>Be reachable during declared emergencies to the best of your ability</li>
                <li>Review and approve (or deny) incoming captain applications in a timely manner</li>
                <li>Not share household vulnerability data with any third party</li>
                <li>Abide by all terms in the <Link to="/terms" target="_blank">CrisisGrid Terms of Service</Link></li>
              </ul>
              <div style={{ marginTop: 16, padding: 16, background: '#fee2e2', borderRadius: 8, border: '1px solid #fca5a5' }}>
                <strong>Liability:</strong> CrisisGrid and its operators are not liable for any
                outcomes resulting from your actions or inactions as a block captain.
                You accept full personal responsibility for any volunteer activities.
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 20 }}>
              <label className="checkbox-item" style={{ fontWeight: 600 }}>
                <input type="checkbox" checked={termsChecked} onChange={e => setTermsChecked(e.target.checked)} />
                I have read and agree to all of the above responsibilities and the Terms of Service
              </label>
            </div>
          </div>
        )}

        {/* Step 1: Credentials */}
        {step === 1 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 4 }}>Your Credentials</div>
            <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
              This information will be reviewed by an existing captain before your application is approved.
            </div>

            <div className="form-group">
              <label className="form-label">Your household *</label>
              {me ? (
                <div className="form-input" style={{ background: '#f8fafc', color: 'var(--muted)' }}>
                  {me.name} — {me.address}
                </div>
              ) : (
                <select className="form-select" value={form.household_id} onChange={e => set('household_id', e.target.value)}>
                  <option value="">Select your household…</option>
                  {households.map(h => <option key={h.id} value={h.id}>{h.name} — {h.address}</option>)}
                </select>
              )}
              {!me && <div className="form-hint">Can't find yours? <Link to="/register">Register first.</Link></div>}
            </div>

            <div className="form-group">
              <label className="form-label">Your role / qualification *</label>
              <select className="form-select" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="">Select your role…</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Organization / affiliation</label>
                <input className="form-input" placeholder="e.g. Portland CERT Team 4" value={form.organization} onChange={e => set('organization', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Years in this neighborhood</label>
                <input type="number" min="0" max="99" className="form-input" value={form.years_resident} onChange={e => set('years_resident', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Emergency training completed (check all that apply)</label>
              <div className="checkbox-group" style={{ marginTop: 8 }}>
                {TRAINING.map(t => (
                  <label key={t} className="checkbox-item">
                    <input type="checkbox" checked={form.training.includes(t)} onChange={() => toggleTraining(t)} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Statement */}
        {step === 2 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 4 }}>Personal Statement</div>
            <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
              Explain why you want to be a block captain and what you can offer your neighborhood.
              Minimum 100 characters. Be specific — this is reviewed by a human.
            </div>
            <div className="form-group">
              <label className="form-label">Statement *</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: 200 }}
                placeholder="e.g. I've lived on Oak Street for 12 years and went through the 2023 storm knowing three of my neighbors had no way to call for help. I completed CERT training in 2024 and want to make sure no one on our block is left without someone checking in..."
                value={form.statement}
                onChange={e => set('statement', e.target.value)}
              />
              <div className="form-hint" style={{ color: form.statement.length < 100 ? 'var(--red)' : 'var(--muted)' }}>
                {form.statement.length} / 100 characters minimum
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 16 }}>Review Your Application</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <tbody>
                {[
                  ['Household', me ? `${me.name} — ${me.address}` : `ID ${form.household_id}`],
                  ['Role', form.role],
                  ['Organization', form.organization || '—'],
                  ['Years in neighborhood', form.years_resident || '—'],
                  ['Training', form.training.length > 0 ? form.training.join(', ') : '—'],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--muted)', width: 180, fontWeight: 500 }}>{label}</td>
                    <td style={{ padding: '8px 0' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 16 }}>
              <div className="text-sm font-semibold" style={{ marginBottom: 4 }}>Statement</div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, fontSize: 13, lineHeight: 1.6 }}>
                {form.statement}
              </div>
            </div>
            <div className="alert alert-info" style={{ marginTop: 16 }}>
              Your application will be reviewed by an existing block captain in your zone.
              You will be notified via CrisisGrid messages.
            </div>
          </div>
        )}

        <hr className="divider" />
        <div className="row-between">
          <button className="btn btn-outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            ← Back
          </button>
          {step < 3 ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!validate()}>
              Next →
            </button>
          ) : (
            <button className="btn btn-success" onClick={submit} disabled={submitting}>
              {submitting ? 'Submitting…' : '✓ Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
