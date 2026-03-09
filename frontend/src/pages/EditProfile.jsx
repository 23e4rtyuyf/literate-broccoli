import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, identity } from '../api'

const MEDICAL_OPTIONS = ['oxygen concentrator', 'dialysis equipment', 'power wheelchair charger', 'ventilator', 'nebulizer', 'insulin pump']
const RESOURCE_OPTIONS = [
  { key: 'generator', label: '🔌 Generator' },
  { key: 'truck', label: '🚛 Truck / large vehicle' },
  { key: 'first_aid', label: '🩺 First aid trained' },
  { key: 'spare_room', label: '🛏️ Spare room' },
  { key: 'chainsaw', label: '🪚 Chainsaw' },
  { key: 'ham_radio', label: '📻 Ham radio' },
]

export default function EditProfile() {
  const navigate = useNavigate()
  const me = identity.get()

  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!me) { navigate('/'); return }
    api.getHousehold(me.id)
      .then(h => {
        setForm({
          name: h.name || '',
          address: h.address || '',
          city: h.city || '',
          state: h.state || '',
          zip_code: h.zip_code || '',
          contact: h.contact || '',
          email: h.email || '',
          residents_count: h.residents_count || 1,
          has_mobility_limitations: !!h.has_mobility_limitations,
          medical_equipment: h.medical_equipment || [],
          languages: h.languages || ['English'],
          has_car: h.has_car !== false,
          is_elderly: !!h.is_elderly,
          can_help: h.can_help !== false,
          resources: h.resources || {},
        })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
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

  function setLanguage(index, value) {
    setForm(f => {
      const langs = [...f.languages]
      langs[index] = value
      return { ...f, languages: langs.filter(Boolean) }
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await api.updateHousehold(me.id, form)
      // Refresh identity with new data
      const updated = await api.getHousehold(me.id)
      identity.set({ ...me, ...updated })
      window.dispatchEvent(new Event('cg:identity'))
      setSuccess(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await api.deleteHousehold(me.id)
      identity.clear()
      window.dispatchEvent(new Event('cg:identity'))
      navigate('/')
    } catch (e) {
      setError(e.message)
      setDeleting(false)
    }
  }

  if (!me) return null
  if (loading) return <div className="loading"><div className="spinner" /> Loading profile…</div>
  if (!form) return <div className="alert alert-error">{error || 'Could not load profile.'}</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Edit Profile</h1>
        <div className="page-subtitle">Update your household information</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-info">Profile saved successfully.</div>}

      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 className="card-title" style={{ marginBottom: 16 }}>Contact Information</h2>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="ep-name">Household name *</label>
              <input
                id="ep-name"
                className="form-input"
                required
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ep-contact">Phone / contact</label>
              <input
                id="ep-contact"
                className="form-input"
                value={form.contact}
                onChange={e => set('contact', e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ep-email">Email address (for crisis notifications)</label>
            <input
              id="ep-email"
              type="email"
              className="form-input"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ep-address">Street address</label>
            <input
              id="ep-address"
              className="form-input"
              value={form.address}
              onChange={e => set('address', e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="ep-city">City</label>
              <input id="ep-city" className="form-input" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ep-state">State</label>
              <input id="ep-state" className="form-input" value={form.state} onChange={e => set('state', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ep-zip">ZIP code</label>
              <input id="ep-zip" className="form-input" value={form.zip_code} onChange={e => set('zip_code', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ep-residents">Number of residents</label>
            <input
              id="ep-residents"
              type="number"
              min="1"
              max="20"
              className="form-input"
              style={{ width: 80 }}
              value={form.residents_count}
              onChange={e => set('residents_count', parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h2 className="card-title" style={{ marginBottom: 16 }}>Vulnerability &amp; Needs</h2>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="form-label" style={{ marginBottom: 8 }}>Household characteristics</legend>
            <div className="checkbox-group">
              <label className="checkbox-item">
                <input type="checkbox" checked={form.has_mobility_limitations} onChange={e => set('has_mobility_limitations', e.target.checked)} />
                Has mobility limitations
              </label>
              <label className="checkbox-item">
                <input type="checkbox" checked={form.is_elderly} onChange={e => set('is_elderly', e.target.checked)} />
                Elderly resident(s) (65+)
              </label>
              <label className="checkbox-item">
                <input type="checkbox" checked={!form.has_car} onChange={e => set('has_car', !e.target.checked)} />
                No personal vehicle
              </label>
              <label className="checkbox-item">
                <input type="checkbox" checked={form.can_help} onChange={e => set('can_help', e.target.checked)} />
                Can help neighbors during an emergency
              </label>
            </div>
          </fieldset>

          <fieldset style={{ border: 'none', padding: 0, margin: '16px 0 0' }}>
            <legend className="form-label" style={{ marginBottom: 8 }}>Medical equipment that requires power</legend>
            <div className="checkbox-group">
              {MEDICAL_OPTIONS.map(item => (
                <label key={item} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={form.medical_equipment.includes(item)}
                    onChange={() => toggleMedical(item)}
                  />
                  {item}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label" htmlFor="ep-lang">Primary language spoken at home</label>
            <input
              id="ep-lang"
              className="form-input"
              value={form.languages[0] || ''}
              onChange={e => setLanguage(0, e.target.value)}
              placeholder="e.g. English, Spanish, Mandarin"
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h2 className="card-title" style={{ marginBottom: 16 }}>Resources You Can Offer</h2>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="form-label" style={{ marginBottom: 8 }}>Available resources</legend>
            <div className="checkbox-group">
              {RESOURCE_OPTIONS.map(({ key, label }) => (
                <label key={key} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={!!form.resources[key]}
                    onChange={() => toggleResource(key)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div className="row gap-8">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : '✓ Save Changes'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>Cancel</button>
          </div>
        </div>
      </form>

      {/* Delete account */}
      <div className="card" style={{ borderColor: 'var(--red)', borderWidth: 2 }}>
        <h2 className="card-title" style={{ color: 'var(--red)', marginBottom: 8 }}>Delete Account</h2>
        <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
          Removing your household permanently deletes your data from CrisisGrid. This cannot be undone.
          Emergency tasks generated before deletion will remain in crisis records for accountability.
        </div>
        {!confirmDelete ? (
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
            Delete My Account
          </button>
        ) : (
          <div>
            <div className="alert alert-error" style={{ marginBottom: 12 }}>
              Are you sure? This will permanently delete your household data.
            </div>
            <div className="row gap-8">
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, permanently delete'}
              </button>
              <button className="btn btn-outline" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
