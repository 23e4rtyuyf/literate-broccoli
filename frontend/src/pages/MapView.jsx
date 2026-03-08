import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const PRIORITY_COLORS = {
  critical: '#dc2626',
  high: '#e85d00',
  medium: '#d97706',
  low: '#16a34a',
}

function priorityLevel(score) {
  if (score >= 70) return 'critical'
  if (score >= 40) return 'high'
  if (score >= 15) return 'medium'
  return 'low'
}

function priorityLabel(score) {
  if (score >= 70) return 'Critical'
  if (score >= 40) return 'High'
  if (score >= 15) return 'Medium'
  return 'Low / Helper'
}

// Haversine distance in miles
function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Google Maps component (only rendered when API key is present) ─────────────
function GoogleMapsView({ households, crises, selected, onSelect }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const infoWindowRef = useRef(null)

  useEffect(() => {
    if (!window.google || !mapRef.current) return

    const georef = households.find(h => h.lat && h.lng)
    const center = georef ? { lat: georef.lat, lng: georef.lng } : { lat: 39.5, lng: -98.35 }
    const zoom = georef ? 15 : 4

    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    })

    infoWindowRef.current = new window.google.maps.InfoWindow()
  }, [])

  useEffect(() => {
    if (!mapInstance.current) return
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    households.filter(h => h.lat && h.lng).forEach(h => {
      const level = priorityLevel(h.priority_score)
      const color = PRIORITY_COLORS[level]
      const marker = new window.google.maps.Marker({
        position: { lat: h.lat, lng: h.lng },
        map: mapInstance.current,
        title: h.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: 'white',
          strokeWeight: 2,
        },
      })
      marker.addListener('click', () => {
        onSelect(h)
        const content = `
          <div style="font-family:sans-serif;max-width:220px;padding:4px">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px">${h.name}</div>
            <div style="font-size:12px;color:#64748b">${h.address}</div>
            ${h.city ? `<div style="font-size:12px;color:#64748b">${h.city}, ${h.state || ''} ${h.zip_code || ''}</div>` : ''}
            <div style="margin-top:6px;font-size:12px">
              <span style="background:${color};color:white;padding:2px 8px;border-radius:99px;font-weight:700">
                Priority: ${Math.round(h.priority_score)}
              </span>
            </div>
            ${h.is_captain ? '<div style="margin-top:4px;font-size:11px;color:#1a3a5c;font-weight:600">★ Block Captain</div>' : ''}
            ${h.has_mobility_limitations ? '<div style="font-size:11px;color:#dc2626">♿ Mobility limitations</div>' : ''}
            ${h.is_elderly ? '<div style="font-size:11px;color:#d97706">🧓 Elderly resident</div>' : ''}
          </div>
        `
        infoWindowRef.current.setContent(content)
        infoWindowRef.current.open(mapInstance.current, marker)
      })
      markersRef.current.push(marker)
    })
  }, [households])

  return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
}

// ── Fallback static list view when no API key ─────────────────────────────────
function StaticMapFallback({ households, selected, onSelect }) {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Google Maps API key not configured</div>
      <div className="text-sm text-muted" style={{ marginBottom: 16, maxWidth: 400, margin: '0 auto 16px' }}>
        Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>frontend/.env</code> to enable the interactive map.
        Showing location list instead.
      </div>
      <div className="stack" style={{ textAlign: 'left', maxHeight: 400, overflowY: 'auto' }}>
        {households.filter(h => h.lat && h.lng).map(h => {
          const level = priorityLevel(h.priority_score)
          return (
            <div
              key={h.id}
              className="household-card"
              style={{ cursor: 'pointer', borderLeft: `4px solid ${PRIORITY_COLORS[level]}`, background: selected?.id === h.id ? '#f0f4ff' : 'white' }}
              onClick={() => onSelect(h)}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: PRIORITY_COLORS[level], flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{h.name}</div>
                <div className="text-sm text-muted">{h.address}{h.city ? `, ${h.city}, ${h.state}` : ''}</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: PRIORITY_COLORS[level] }}>
                {Math.round(h.priority_score)}
              </span>
            </div>
          )
        })}
        {households.filter(h => !h.lat && !h.lng).length > 0 && (
          <div className="text-sm text-muted" style={{ textAlign: 'center', padding: 8 }}>
            + {households.filter(h => !h.lat && !h.lng).length} households without GPS coordinates
          </div>
        )}
      </div>
    </div>
  )
}

export default function MapView() {
  const [households, setHouseholds] = useState([])
  const [crises, setCrises] = useState([])
  const [zones, setZones] = useState([])
  const [selected, setSelected] = useState(null)
  const [filterZone, setFilterZone] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [loading, setLoading] = useState(true)
  const [mapsLoaded, setMapsLoaded] = useState(!!window.google?.maps)

  useEffect(() => {
    Promise.all([api.getHouseholds(), api.getCrises(), api.getZones()])
      .then(([h, c, z]) => { setHouseholds(h); setCrises(c); setZones(z) })
      .catch(console.error)
      .finally(() => setLoading(false))

    // Load Google Maps script if key available and not yet loaded
    if (GMAPS_KEY && !window.google?.maps) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`
      script.async = true
      script.onload = () => setMapsLoaded(true)
      document.head.appendChild(script)
    }
  }, [])

  const filtered = households.filter(h => {
    if (filterZone && String(h.zone_id) !== filterZone) return false
    if (filterLevel && priorityLevel(h.priority_score) !== filterLevel) return false
    return true
  })

  const counts = {
    critical: households.filter(h => priorityLevel(h.priority_score) === 'critical').length,
    high: households.filter(h => priorityLevel(h.priority_score) === 'high').length,
    medium: households.filter(h => priorityLevel(h.priority_score) === 'medium').length,
    low: households.filter(h => priorityLevel(h.priority_score) === 'low').length,
  }

  const activeCrises = crises.filter(c => c.status === 'active')

  if (loading) return <div className="loading"><div className="spinner" /> Loading map data…</div>

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Neighborhood Map</div>
        <div className="page-subtitle">
          {households.length} registered households · {households.filter(h => h.lat).length} with GPS
        </div>
      </div>

      {activeCrises.length > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          🚨 <strong>{activeCrises.length} active crisis{activeCrises.length !== 1 ? 'es' : ''}</strong> —{' '}
          {activeCrises.map(c => (
            <Link key={c.id} to={`/crisis/${c.id}`} style={{ color: 'var(--red)', fontWeight: 600, marginRight: 8 }}>
              View {c.type} task board →
            </Link>
          ))}
        </div>
      )}

      {/* Legend + filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row-between flex-wrap" style={{ gap: 12 }}>
          <div className="row flex-wrap gap-8">
            {Object.entries(PRIORITY_COLORS).map(([level, color]) => (
              <button
                key={level}
                onClick={() => setFilterLevel(filterLevel === level ? '' : level)}
                className="row gap-8 items-center"
                style={{
                  background: filterLevel === level ? color + '20' : 'transparent',
                  border: `1px solid ${filterLevel === level ? color : 'var(--border)'}`,
                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer'
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {level.charAt(0).toUpperCase() + level.slice(1)} ({counts[level]})
                </span>
              </button>
            ))}
          </div>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 180 }}
            value={filterZone}
            onChange={e => setFilterZone(e.target.value)}
          >
            <option value="">All zones</option>
            {zones.map(z => <option key={z.id} value={String(z.id)}>{z.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>

        {/* Map */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 520 }}>
          {GMAPS_KEY && mapsLoaded ? (
            <GoogleMapsView
              households={filtered}
              crises={activeCrises}
              selected={selected}
              onSelect={setSelected}
            />
          ) : (
            <StaticMapFallback households={filtered} selected={selected} onSelect={setSelected} />
          )}
        </div>

        {/* Sidebar: detail + list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selected && (
            <div className="card" style={{ borderLeft: `4px solid ${PRIORITY_COLORS[priorityLevel(selected.priority_score)]}` }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{selected.name}</div>
              <div className="text-sm text-muted">{selected.address}</div>
              {selected.city && <div className="text-sm text-muted">{selected.city}, {selected.state} {selected.zip_code}</div>}
              {selected.lat && <div className="text-xs text-muted">{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</div>}
              <hr className="divider" />
              <div className="row flex-wrap gap-8">
                <span style={{ background: PRIORITY_COLORS[priorityLevel(selected.priority_score)], color: 'white', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                  Priority {Math.round(selected.priority_score)} — {priorityLabel(selected.priority_score)}
                </span>
              </div>
              <div className="stack" style={{ marginTop: 10, gap: 4 }}>
                <div className="text-sm"><span className="text-muted">Residents:</span> {selected.residents_count}</div>
                {selected.is_elderly && <div className="text-sm text-amber">🧓 Elderly</div>}
                {selected.has_mobility_limitations && <div className="text-sm text-red">♿ Mobility limitations</div>}
                {selected.medical_equipment?.length > 0 && <div className="text-sm text-amber">⚡ {selected.medical_equipment.join(', ')}</div>}
                {!selected.has_car && <div className="text-sm text-muted">🚫 No vehicle</div>}
                {selected.is_captain && <div className="text-sm" style={{ color: 'var(--navy)', fontWeight: 600 }}>★ Block Captain</div>}
                {selected.contact && <div className="text-sm text-muted">📞 {selected.contact}</div>}
              </div>
            </div>
          )}

          <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>
              Households ({filtered.length})
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 400 }}>
              {filtered.sort((a, b) => b.priority_score - a.priority_score).map(h => {
                const level = priorityLevel(h.priority_score)
                return (
                  <div
                    key={h.id}
                    onClick={() => setSelected(h)}
                    style={{
                      padding: '10px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: selected?.id === h.id ? '#f0f4ff' : 'white',
                      borderLeft: `3px solid ${PRIORITY_COLORS[level]}`,
                    }}
                  >
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{h.address}{h.city ? `, ${h.city}` : ''}</div>
                    {!h.lat && <div style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>No GPS</div>}
                  </div>
                )
              })}
            </div>
          </div>

          {!GMAPS_KEY && (
            <div className="alert alert-info" style={{ fontSize: 12 }}>
              <div>
                <strong>Enable Google Maps:</strong> add <code>VITE_GOOGLE_MAPS_API_KEY=your_key</code> to{' '}
                <code>frontend/.env</code> and restart the dev server.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
