import { useState, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, identity } from '../api'

const STEPS = ['Terms', 'Your Address', 'Residents', 'Medical', 'Languages', 'Resources']

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
  { key: 'generator',  label: 'Generator' },
  { key: 'truck',      label: 'Truck / large vehicle' },
  { key: 'first_aid',  label: 'First aid trained' },
  { key: 'spare_room', label: 'Spare room available' },
  { key: 'chainsaw',   label: 'Chainsaw' },
  { key: 'ham_radio',  label: 'Ham radio' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

// Nominatim returns full state names — map them to abbreviations
const STATE_ABBR = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
  'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA',
  'Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD',
  'Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS',
  'Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH',
  'New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC',
  'North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA',
  'Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN',
  'Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA',
  'West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY','District of Columbia':'DC',
}

function StepIndicator({ current, labels }) {
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

// Address autocomplete using Nominatim (OpenStreetMap) — no API key needed
function AddressAutocomplete({ value, onChange, onSelect }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const debounceRef = useRef(null)

  function handleInput(e) {
    const q = e.target.value
    onChange(q)
    setNoResults(false)

    clearTimeout(debounceRef.current)
    if (q.length < 6) { setSuggestions([]); setOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(q)}&format=json&countrycodes=us&addressdetails=1&limit=6`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'CrisisGrid/1.0' } }
        )
        const data = await res.json()
        setSuggestions(data)
        setOpen(data.length > 0)
        setNoResults(data.length === 0)
      } catch {
        // Network error — user can still fill in manually
      } finally {
        setSearching(false)
      }
    }, 600) // 600ms debounce respects Nominatim's 1 req/s policy
  }

  function pick(item) {
    const a = item.address
    const house = a.house_number || ''
    const road  = a.road || a.pedestrian || a.footway || a.path || ''
    const street = [house, road].filter(Boolean).join(' ')
    const city   = a.city || a.town || a.village || a.municipality || a.county || ''
    const state  = STATE_ABBR[a.state] || a.state || ''
    const zip    = (a.postcode || '').split('-')[0]
    const neighborhood = a.neighbourhood || a.suburb || a.quarter || ''

    onSelect({
      street: street || city,  // fallback so the field is never blank
      city,
      state,
      zip,
      neighborhood,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    })
    onChange(street || item.display_name)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="form-input"
          value={value}
          onChange={handleInput}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Start typing your street address…"
          autoComplete="off"
        />
        {searching && (
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <div className="spinner" />
          </div>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 6, boxShadow: 'var(--shadow-md)',
          maxHeight: 280, overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => pick(s)}
              style={{
                padding: '9px 14px', cursor: 'pointer', fontSize: 13, lineHeight: 1.4,
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <div style={{ fontWeight: 500 }}>{s.display_name.split(',')[0]}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {s.display_name.split(',').slice(1).join(',').trim()}
              </div>
            </div>
          ))}
        </div>
      )}

      {noResults && value.length >= 6 && !searching && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          No results — you can still fill in the fields below manually.
        </div>
      )}

      <div className="form-hint">
        Powered by OpenStreetMap/Nominatim · US addresses only · No API key required
      </div>
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const [form, setForm] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    neighborhood: '',
    lat: null,
    lng: null,
    contact: '',
    residents_count: 1,
    is_elderly: false,
    has_mobility_limitations: false,
    has_car: true,
    can_help: true,
    medical_equipment: [],
    languages: ['English'],
    resources: {},
  })

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  function handlePlaceSelect(place) {
    setForm(f => ({
      ...f,
      street:       place.street,
      city:         place.city,
      state:        place.state,
      zip:          place.zip,
      neighborhood: place.neighborhood,
      lat:          place.lat,
      lng:          place.lng,
    }))
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
    setForm(f => ({ ...f, resources: { ...f.resources, [key]: !f.resources[key] } }))
  }

  function updateLanguage(i, val) {
    const langs = [...form.languages]
    langs[i] = val
    setForm(f => ({ ...f, languages: langs }))
  }

  function validateStep() {
    if (step === 0) return termsAccepted
    if (step === 1) return form.name.trim() && form.street.trim() && form.city.trim() && form.state
    return true
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const result = await api.register({
        name:                    form.name,
        address:                 form.street,
        city:                    form.city,
        state:                   form.state,
        zip_code:                form.zip || null,
        lat:                     form.lat,
        lng:                     form.lng,
        neighborhood:            form.neighborhood || null,
        contact:                 form.contact || null,
        residents_count:         parseInt(form.residents_count),
        has_mobility_limitations: form.has_mobility_limitations,
        is_elderly:              form.is_elderly,
        has_car:                 form.has_car,
        can_help:                form.can_help,
        medical_equipment:       form.medical_equipment,
        languages:               form.languages.filter(l => l.trim()),
        resources:               form.resources,
        is_captain:              false,
        terms_accepted:          true,
      })
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
            You've been added to your neighborhood zone.
          </div>
          <div style={{ display: 'inline-block', padding: '12px 32px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 24 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: success.score >= 60 ? 'var(--red)' : success.score >= 30 ? 'var(--amber)' : 'var(--green)' }}>
              {Math.round(success.score)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Priority Score</div>
          </div>
          <div className="text-sm text-muted" style={{ marginBottom: 24 }}>
            {success.score >= 60
              ? 'High vulnerability factors noted. Block captains will prioritize you first.'
              : success.score >= 20
              ? 'Some vulnerability factors noted. You\'ll be included in check-in queues.'
              : 'Marked as a potential helper. Thank you for being ready to assist neighbors!'}
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Go to Home</button>
            <Link to="/apply-captain" className="btn btn-outline">Apply as Block Captain</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">Register Your Household</div>
        <div className="page-subtitle">
          Works for all 50 US states. Address lookup is powered by OpenStreetMap — no account or API key needed.
        </div>
      </div>

      <StepIndicator current={step} labels={STEPS} />
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">

        {/* Step 0: Terms */}
        {step === 0 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 12 }}>Before You Register</div>
            <div style={{ background: '#fee2e2', padding: 16, borderRadius: 8, border: '1px solid #fca5a5', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ CrisisGrid is NOT an emergency service</div>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                In any life-threatening emergency, <strong>call 911 first.</strong> CrisisGrid
                is a volunteer community coordination tool only. It does not dispatch emergency
                services or guarantee any response.
              </div>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
              By registering you agree that:
              <ul style={{ marginLeft: 20, marginTop: 8 }}>
                <li>You will always call 911 first in life-threatening situations</li>
                <li>Your vulnerability data will be visible to block captains in your zone</li>
                <li>CrisisGrid and its operators are not liable for any emergency outcomes</li>
                <li>Volunteer responders have no professional obligation to assist you</li>
                <li>You accept the full <Link to="/terms" target="_blank">Terms of Service</Link></li>
              </ul>
            </div>
            <label className="checkbox-item" style={{ fontWeight: 600, fontSize: 15 }}>
              <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
              I have read and accept the Terms of Service
            </label>
            <div className="mt-8">
              <Link to="/terms" className="text-sm" style={{ color: 'var(--blue)' }}>Read full Terms of Service →</Link>
            </div>
          </div>
        )}

        {/* Step 1: Address */}
        {step === 1 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 4 }}>Your Location</div>
            <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
              Start typing your address to get suggestions, or fill in the fields below manually.
              Your zone is auto-assigned based on city and neighborhood.
            </div>

            <div className="form-group">
              <label className="form-label">Household name *</label>
              <input className="form-input" placeholder="e.g. The Smiths or your own name" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Street address *</label>
              <AddressAutocomplete
                value={form.street}
                onChange={v => set('street', v)}
                onSelect={handlePlaceSelect}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City *</label>
                <input className="form-input" placeholder="Portland" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">State *</label>
                <select className="form-select" value={form.state} onChange={e => set('state', e.target.value)}>
                  <option value="">Select…</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">ZIP code</label>
                <input className="form-input" placeholder="97201" maxLength={10} value={form.zip} onChange={e => set('zip', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Neighborhood / block name</label>
                <input className="form-input" placeholder="e.g. Oak Street Block" value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} />
                <div className="form-hint">Used to group your zone. Leave blank to use city.</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contact phone or email</label>
              <input className="form-input" placeholder="555-0100 or name@email.com" value={form.contact} onChange={e => set('contact', e.target.value)} />
            </div>

            {form.lat && (
              <div className="alert alert-success">
                📍 Geocoded: {form.city}, {form.state} ({form.lat.toFixed(4)}, {form.lng.toFixed(4)})
              </div>
            )}
          </div>
        )}

        {/* Step 2: Residents */}
        {step === 2 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 16 }}>Residents in Your Household</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Number of residents</label>
                <input type="number" min="1" max="30" className="form-input" value={form.residents_count} onChange={e => set('residents_count', e.target.value)} />
              </div>
            </div>
            <div className="checkbox-group">
              <label className="checkbox-item">
                <input type="checkbox" checked={form.is_elderly} onChange={e => set('is_elderly', e.target.checked)} />
                Household includes residents 65 or older
              </label>
              <label className="checkbox-item">
                <input type="checkbox" checked={form.has_mobility_limitations} onChange={e => set('has_mobility_limitations', e.target.checked)} />
                Someone has mobility limitations (wheelchair, walker, etc.)
              </label>
              <label className="checkbox-item">
                <input type="checkbox" checked={!form.has_car} onChange={e => set('has_car', !e.target.checked)} />
                No vehicle — cannot self-evacuate
              </label>
              <label className="checkbox-item">
                <input type="checkbox" checked={form.can_help} onChange={e => set('can_help', e.target.checked)} />
                We are able to help neighbors during emergencies
              </label>
            </div>
            <div className="alert alert-info mt-16">
              Used only to prioritize check-ins. Visible only to your block captain.
            </div>
          </div>
        )}

        {/* Step 3: Medical */}
        {step === 3 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 4 }}>Medical Equipment Dependencies</div>
            <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
              Equipment requiring electricity — raises your priority during power outages.
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

        {/* Step 4: Languages */}
        {step === 4 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 4 }}>Languages Spoken</div>
            <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
              First language listed is used for matching bilingual volunteers.
            </div>
            <div className="stack">
              {form.languages.map((lang, i) => (
                <div key={i} className="row">
                  <input className="form-input" style={{ flex: 1 }}
                    placeholder={i === 0 ? 'Primary language (e.g. English)' : 'Additional language'}
                    value={lang} onChange={e => updateLanguage(i, e.target.value)} />
                  {i > 0 && <button className="btn btn-outline btn-sm" onClick={() => setForm(f => ({ ...f, languages: f.languages.filter((_, j) => j !== i) }))}>✕</button>}
                </div>
              ))}
              {form.languages.length < 4 && (
                <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setForm(f => ({ ...f, languages: [...f.languages, ''] }))}>
                  + Add language
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Resources */}
        {step === 5 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 4 }}>Resources You Can Offer</div>
            <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
              Block captains use this to route tasks to the right helpers.
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
          <button className="btn btn-outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>← Back</button>
          {step < STEPS.length - 1
            ? <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!validateStep()}>Next →</button>
            : <button className="btn btn-success" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Registering…' : '✓ Complete Registration'}</button>
          }
        </div>
      </div>
    </div>
  )
}
