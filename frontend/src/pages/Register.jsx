import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, identity } from '../api'

const STEPS = ['Basic Info', 'Residents', 'Medical', 'Languages', 'Resources']

const MEDICAL_OPTIONS = [
  'Oxygen concentrator',
  'Dialysis equipment',
  'Ventilator',
  'Power wheelchair charger',
  'Insulin refrigeration',
  'Home infusion pump',
  'CPAP/BiPAP',
  'Nebulizer',
]

const RESOURCE_OPTIONS = [
  { key: 'generator', label: 'Generator' },
  { key: 'truck', label: 'Truck / large vehicle' },
  { key: 'first_aid', label: 'First aid trained' },
  { key: 'spare_room', label: 'Spare room available' },
  { key: 'chainsaw', label: 'Chainsaw' },
  { key: 'ham_radio', label: 'Ham radio' },
]

function StepIndicator({ current, total, labels }) {
  return (
    <div className="steps">
      {labels.map((label, i) => (
        <div key={i} className={`step ${i < current ? 'done' : i === current ? 'active' : ''}`}>
          <div className="step-dot">{i < current ? '✓' : i + 1}</div>
          <div className="step-label">{label}</div>
        </div>
      ))}
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [zones, setZones] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [form, setForm] = useState({
    name: '',
    address: '',
    contact: '',
    zone_id: '',
    residents_count: 1,
    is_elderly: false,
    has_mobility_limitations: false,
    medical_equipment: [],
    languages: ['English'],
    has_car: true,
    can_help: true,
    resources: {},
    is_captain: false,
  })

  useEffect(() => {
    api.getZones().then(setZones).catch(() => {})
  }, [])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleMedical(item) {
    setForm(f => ({
      ...f,
      medical_equipment: f.medical_equipment.includes(item)
        ? f.medical_equipment.filter(x => x !== item)
        : [...f.medical_equipment, item],
    }))
  }

  function toggleResource(key) {
    setForm(f => ({
      ...f,
      resources: { ...f.resources, [key]: !f.resources[key] },
    }))
  }

  function updateLanguage(index, value) {
    const langs = [...form.languages]
    langs[index] = value
    setForm(f => ({ ...f, languages: langs }))
  }

  function addLanguage() {
    setForm(f => ({ ...f, languages: [...f.languages, ''] }))
  }

  function removeLanguage(index) {
    setForm(f => ({ ...f, languages: f.languages.filter((_, i) => i !== index) }))
  }

  function validateStep() {
    if (step === 0) return form.name.trim() && form.address.trim() && form.zone_id
    return true
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        ...form,
        zone_id: parseInt(form.zone_id),
        residents_count: parseInt(form.residents_count),
        languages: form.languages.filter(l => l.trim()),
      }
      const result = await api.register(payload)
      // Fetch the full household to store
      const household = await api.getHousehold(result.id)
      identity.set(household)
      window.dispatchEvent(new Event('cg:identity'))
      setSuccess({ id: result.id, score: result.priority_score, name: form.name })
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <div className="page-title" style={{ marginBottom: 8 }}>Registered!</div>
          <div className="text-muted" style={{ marginBottom: 24 }}>
            Welcome to CrisisGrid, <strong>{success.name}</strong>.
          </div>
          <div className="stat-card" style={{ marginBottom: 24, display: 'inline-block', padding: '12px 32px' }}>
            <div className="stat-value" style={{ color: success.score >= 60 ? 'var(--red)' : success.score >= 30 ? 'var(--amber)' : 'var(--green)' }}>
              {Math.round(success.score)}
            </div>
            <div className="stat-label">Priority Score</div>
          </div>
          <div className="text-sm text-muted" style={{ marginBottom: 24 }}>
            {success.score >= 60
              ? 'Your household has high vulnerability factors. In a crisis, block captains will prioritize checking on you.'
              : success.score >= 20
              ? 'Your household has some vulnerability factors noted.'
              : 'Your household is marked as a potential helper in emergencies. Thank you!'}
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Go to Home</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">Register Your Household</div>
        <div className="page-subtitle">Takes about 3 minutes. Your info is only visible to your zone's block captain during an emergency.</div>
      </div>

      <StepIndicator current={step} total={STEPS.length} labels={STEPS} />

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 16 }}>Basic Information</div>
            <div className="form-group">
              <label className="form-label">Household name *</label>
              <input className="form-input" placeholder="e.g. The Smiths, or your own name" value={form.name} onChange={e => set('name', e.target.value)} />
              <div className="form-hint">This is how your household will appear to your block captain.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Street address *</label>
              <input className="form-input" placeholder="123 Oak Street" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact phone/email</label>
              <input className="form-input" placeholder="555-0100 or name@email.com" value={form.contact} onChange={e => set('contact', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Neighborhood zone *</label>
              <select className="form-select" value={form.zone_id} onChange={e => set('zone_id', e.target.value)}>
                <option value="">Select your zone…</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              {zones.length === 0 && (
                <div className="form-hint text-amber">No zones found. Load demo data on the home page first, or ask your captain to create zones.</div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">
                <input type="checkbox" style={{ marginRight: 8 }} checked={form.is_captain} onChange={e => set('is_captain', e.target.checked)} />
                I am a block captain for my zone
              </label>
            </div>
          </div>
        )}

        {/* Step 1: Residents */}
        {step === 1 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 16 }}>Residents in Your Household</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Number of residents</label>
                <input type="number" min="1" max="20" className="form-input" value={form.residents_count} onChange={e => set('residents_count', e.target.value)} />
              </div>
            </div>
            <div className="checkbox-group">
              <label className="checkbox-item">
                <input type="checkbox" checked={form.is_elderly} onChange={e => set('is_elderly', e.target.checked)} />
                Household includes residents 65 or older
              </label>
              <label className="checkbox-item">
                <input type="checkbox" checked={form.has_mobility_limitations} onChange={e => set('has_mobility_limitations', e.target.checked)} />
                Someone in the household has mobility limitations
              </label>
              <label className="checkbox-item">
                <input type="checkbox" checked={!form.has_car} onChange={e => set('has_car', !e.target.checked)} />
                No vehicle (can't self-evacuate)
              </label>
              <label className="checkbox-item">
                <input type="checkbox" checked={form.can_help} onChange={e => set('can_help', e.target.checked)} />
                We're able to help neighbors during emergencies
              </label>
            </div>
            <div className="alert alert-info mt-16">
              This information is used only to prioritize check-ins during an emergency. It is encrypted and only visible to your block captain.
            </div>
          </div>
        )}

        {/* Step 2: Medical */}
        {step === 2 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 4 }}>Medical Equipment Dependencies</div>
            <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
              Select any equipment that requires electricity to operate. This raises your priority score during power outages.
            </div>
            <div className="checkbox-group">
              {MEDICAL_OPTIONS.map(item => (
                <label key={item} className="checkbox-item">
                  <input type="checkbox" checked={form.medical_equipment.includes(item)} onChange={() => toggleMedical(item)} />
                  {item}
                </label>
              ))}
            </div>
            {form.medical_equipment.length > 0 && (
              <div className="alert alert-warning mt-16">
                ⚡ Your household will be flagged as high priority during power outages.
              </div>
            )}
          </div>
        )}

        {/* Step 3: Languages */}
        {step === 3 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 4 }}>Languages Spoken</div>
            <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
              The first language listed will be used for alerts. Block captains will be matched with helpers who speak your language.
            </div>
            <div className="stack">
              {form.languages.map((lang, i) => (
                <div key={i} className="row">
                  <input
                    className="form-input"
                    placeholder={i === 0 ? 'Primary language (e.g. English)' : 'Additional language'}
                    value={lang}
                    onChange={e => updateLanguage(i, e.target.value)}
                    style={{ flex: 1 }}
                  />
                  {i > 0 && (
                    <button className="btn btn-outline btn-sm" onClick={() => removeLanguage(i)}>✕</button>
                  )}
                </div>
              ))}
              {form.languages.length < 4 && (
                <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={addLanguage}>+ Add language</button>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Resources */}
        {step === 4 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 4 }}>Resources You Can Offer</div>
            <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
              Block captains use this to route tasks. E.g., someone with a truck may be asked to help evacuate a neighbor.
            </div>
            <div className="checkbox-group">
              {RESOURCE_OPTIONS.map(({ key, label }) => (
                <label key={key} className="checkbox-item">
                  <input type="checkbox" checked={!!form.resources[key]} onChange={() => toggleResource(key)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        <hr className="divider" />
        <div className="row-between">
          <button className="btn btn-outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!validateStep()}>
              Next →
            </button>
          ) : (
            <button className="btn btn-success" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Registering…' : '✓ Complete Registration'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
