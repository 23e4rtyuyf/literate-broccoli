import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, identity } from '../api'

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

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
  { key: 'generator', label: 'Generator' },
  { key: 'truck', label: 'Truck / large vehicle' },
  { key: 'first_aid', label: 'First aid trained' },
  { key: 'spare_room', label: 'Spare room available' },
  { key: 'chainsaw', label: 'Chainsaw' },
  { key: 'ham_radio', label: 'Ham radio' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

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

// Load Google Maps script once
let mapsScriptLoading = false
let mapsScriptLoaded = !!window.google?.maps

function useMapsLoader(enabled) {
  const [loaded, setLoaded] = useState(mapsScriptLoaded)

  useEffect(() => {
    if (!enabled || mapsScriptLoaded || mapsScriptLoading) {
      if (mapsScriptLoaded) setLoaded(true)
      return
    }
    mapsScriptLoading = true
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`
    script.async = true
    script.onload = () => {
      mapsScriptLoaded = true
      mapsScriptLoading = false
      setLoaded(true)
    }
    document.head.appendChild(script)
  }, [enabled])

  return loaded
}

// Address autocomplete powered by Google Places
function AddressAutocomplete({ value, onChange, onPlaceSelect }) {
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)

  useEffect(() => {
    if (!inputRef.current || !window.google?.maps?.places) return
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'us' },
      types: ['address'],
      fields: ['address_components', 'geometry', 'formatted_address'],
    })
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace()
      if (!place.geometry) return

      const components = place.address_components
      const get = (type) =>
        components.find(c => c.types.includes(type))?.long_name || ''
      const getShort = (type) =>
        components.find(c => c.types.includes(type))?.short_name || ''

      const streetNumber = get('street_number')
      const route = get('route')
      const street = streetNumber && route ? `${streetNumber} ${route}` : route || streetNumber
      const city = get('locality') || get('sublocality') || get('administrative_area_level_3')
      const state = getShort('administrative_area_level_1')
      const zip = get('postal_code')
      const neighborhood = get('neighborhood') || get('sublocality_level_1') || ''
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      onPlaceSelect({ street, city, state, zip, neighborhood, lat, lng, formatted: place.formatted_address })
    })
  }, [])

  return (
    <input
      ref={inputRef}
      className="form-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Start typing your address…"
      autoComplete="off"
    />
  )
}

export default function Register() {
  const navigate = useNavigate()
  const mapsLoaded = useMapsLoader(!!GMAPS_KEY)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const [form, setForm] = useState({
    name: '',
    // address fields
    street: '',
    city: '',
    state: '',
    zip: '',
    neighborhood: '',
    lat: null,
    lng: null,
    // contact
    contact: '',
    // residents
    residents_count: 1,
    is_elderly: false,
    has_mobility_limitations: false,
    has_car: true,
    can_help: true,
    // medical
    medical_equipment: [],
    // languages
    languages: ['English'],
    // resources
    resources: {},
  })

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handlePlaceSelect(place) {
    setForm(f => ({
      ...f,
      street: place.street,
      city: place.city,
      state: place.state,
      zip: place.zip,
      neighborhood: place.neighborhood,
      lat: place.lat,
      lng: place.lng,
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

  function updateLanguage(index, value) {
    const langs = [...form.languages]
    langs[index] = value
    setForm(f => ({ ...f, languages: langs }))
  }

  function addLanguage() {
    if (form.languages.length < 4) {
      setForm(f => ({ ...f, languages: [...f.languages, ''] }))
    }
  }

  function removeLanguage(index) {
    setForm(f => ({ ...f, languages: f.languages.filter((_, i) => i !== index) }))
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
      const payload = {
        name: form.name,
        address: form.street,
        city: form.city,
        state: form.state,
        zip_code: form.zip,
        lat: form.lat,
        lng: form.lng,
        neighborhood: form.neighborhood || null,
        contact: form.contact || null,
        residents_count: parseInt(form.residents_count),
        has_mobility_limitations: form.has_mobility_limitations,
        is_elderly: form.is_elderly,
        has_car: form.has_car,
        can_help: form.can_help,
        medical_equipment: form.medical_equipment,
        languages: form.languages.filter(l => l.trim()),
        resources: form.resources,
        is_captain: false,
        terms_accepted: true,
      }
      const result = await api.register(payload)
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
              ? 'Your household has high vulnerability factors. Block captains will prioritize checking on you first.'
              : success.score >= 20
              ? 'Some vulnerability factors noted. You will be included in check-in queues.'
              : 'Your household is marked as a potential helper. Thank you for being ready to assist neighbors!'}
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
          Covers all 50 US states. Your info is only visible to your zone's block captain during an emergency.
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
                services, guarantee any response, or verify the accuracy of user-provided data.
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
              Enter your full US address. Your zone is auto-assigned based on your city and neighborhood.
            </div>

            <div className="form-group">
              <label className="form-label">Household name *</label>
              <input className="form-input" placeholder="e.g. The Smiths or your own name" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">
                Street address *
                {GMAPS_KEY && mapsLoaded && <span className="text-xs text-muted" style={{ marginLeft: 8 }}>🗺️ Google Maps autocomplete active</span>}
              </label>
              {GMAPS_KEY && mapsLoaded ? (
                <AddressAutocomplete
                  value={form.street}
                  onChange={v => set('street', v)}
                  onPlaceSelect={handlePlaceSelect}
                />
              ) : (
                <input
                  className="form-input"
                  placeholder="123 Main Street"
                  value={form.street}
                  onChange={e => set('street', e.target.value)}
                />
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City *</label>
                <input className="form-input" placeholder="Portland" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">State *</label>
                <select className="form-select" value={form.state} onChange={e => set('state', e.target.value)}>
                  <option value="">Select state…</option>
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
                📍 Location confirmed: {form.city}, {form.state} ({form.lat.toFixed(4)}, {form.lng.toFixed(4)})
              </div>
            )}

            {!GMAPS_KEY && (
              <div className="alert alert-info" style={{ fontSize: 12 }}>
                Google Maps autocomplete is disabled. Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in{' '}
                <code>frontend/.env</code> to enable address suggestions.
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
              This data is used only to prioritize check-ins. It is only shown to your block captain.
            </div>
          </div>
        )}

        {/* Step 3: Medical */}
        {step === 3 && (
          <div>
            <div className="font-semibold" style={{ marginBottom: 4 }}>Medical Equipment Dependencies</div>
            <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
              Equipment that requires electricity. Raises your priority during power outages.
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
              First language listed is used for matching with bilingual volunteers.
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
                  {i > 0 && <button className="btn btn-outline btn-sm" onClick={() => removeLanguage(i)}>✕</button>}
                </div>
              ))}
              {form.languages.length < 4 && (
                <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={addLanguage}>
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
