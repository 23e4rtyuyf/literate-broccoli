import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../api'

// Fix Leaflet's default icon path issue with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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

function makeDivIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:${color};border:2.5px solid white;
      box-shadow:0 1px 5px rgba(0,0,0,0.45);
      cursor:pointer;
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  })
}

function popupHtml(h) {
  const color = PRIORITY_COLORS[priorityLevel(h.priority_score)]
  const tags = [
    h.is_captain && '<span style="color:#1a3a5c;font-weight:700">★ Captain</span>',
    h.has_mobility_limitations && '<span style="color:#dc2626">♿ Mobility</span>',
    h.is_elderly && '<span style="color:#d97706">🧓 Elderly</span>',
    h.medical_equipment?.length && `<span style="color:#d97706">⚡ Medical</span>`,
    !h.has_car && '<span style="color:#64748b">🚫 No car</span>',
  ].filter(Boolean).join(' · ')

  return `
    <div style="font-family:-apple-system,sans-serif;min-width:190px;padding:2px">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">${h.name}</div>
      <div style="color:#64748b;font-size:12px">${h.address}</div>
      ${h.city ? `<div style="color:#64748b;font-size:12px">${h.city}, ${h.state || ''} ${h.zip_code || ''}</div>` : ''}
      <div style="margin-top:7px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="background:${color};color:white;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700">
          Priority ${Math.round(h.priority_score)}
        </span>
        <span style="font-size:11px;color:#64748b">${h.residents_count} resident${h.residents_count !== 1 ? 's' : ''}</span>
      </div>
      ${tags ? `<div style="font-size:11px;margin-top:5px;display:flex;flex-wrap:wrap;gap:6px">${tags}</div>` : ''}
      ${h.contact ? `<div style="font-size:11px;color:#64748b;margin-top:4px">📞 ${h.contact}</div>` : ''}
    </div>
  `
}

export default function MapView() {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(null)

  const [households, setHouseholds] = useState([])
  const [crises, setCrises] = useState([])
  const [zones, setZones] = useState([])
  const [selected, setSelected] = useState(null)
  const [filterZone, setFilterZone] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [loading, setLoading] = useState(true)

  // Load data
  useEffect(() => {
    Promise.all([api.getHouseholds(), api.getCrises(), api.getZones()])
      .then(([h, c, z]) => { setHouseholds(h); setCrises(c); setZones(z) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Init map once
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return

    mapRef.current = L.map(mapContainerRef.current, {
      center: [39.5, -98.35],
      zoom: 4,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapRef.current)

    markersRef.current = L.layerGroup().addTo(mapRef.current)

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  // Filtered list
  const filtered = households.filter(h => {
    if (filterZone && String(h.zone_id) !== filterZone) return false
    if (filterLevel && priorityLevel(h.priority_score) !== filterLevel) return false
    return true
  })

  // Update markers whenever filtered changes
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return
    markersRef.current.clearLayers()

    const withCoords = filtered.filter(h => h.lat && h.lng)
    if (withCoords.length > 0) {
      const bounds = L.latLngBounds(withCoords.map(h => [h.lat, h.lng]))
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }

    withCoords.forEach(h => {
      const color = PRIORITY_COLORS[priorityLevel(h.priority_score)]
      const marker = L.marker([h.lat, h.lng], { icon: makeDivIcon(color) })
        .bindPopup(L.popup({ maxWidth: 240 }).setContent(popupHtml(h)))

      marker.on('click', () => setSelected(h))
      markersRef.current.addLayer(marker)
    })
  }, [filtered])

  const counts = {
    critical: households.filter(h => priorityLevel(h.priority_score) === 'critical').length,
    high:     households.filter(h => priorityLevel(h.priority_score) === 'high').length,
    medium:   households.filter(h => priorityLevel(h.priority_score) === 'medium').length,
    low:      households.filter(h => priorityLevel(h.priority_score) === 'low').length,
  }

  const withGps = households.filter(h => h.lat && h.lng).length
  const activeCrises = crises.filter(c => c.status === 'active')

  if (loading) return <div className="loading"><div className="spinner" /> Loading map…</div>

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Neighborhood Map</div>
        <div className="page-subtitle">
          {households.length} households · {withGps} with GPS · powered by OpenStreetMap
        </div>
      </div>

      {activeCrises.length > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          🚨 <strong>{activeCrises.length} active crisis{activeCrises.length !== 1 ? 'es' : ''}</strong>{' — '}
          {activeCrises.map(c => (
            <Link key={c.id} to={`/crisis/${c.id}`} style={{ color: 'var(--red)', fontWeight: 600, marginRight: 8 }}>
              View {c.type} task board →
            </Link>
          ))}
        </div>
      )}

      {/* Legend + filters */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row-between flex-wrap" style={{ gap: 10 }}>
          <div className="row flex-wrap gap-8">
            {Object.entries(PRIORITY_COLORS).map(([level, color]) => (
              <button
                key={level}
                onClick={() => setFilterLevel(filterLevel === level ? '' : level)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: filterLevel === level ? color + '18' : 'transparent',
                  border: `1.5px solid ${filterLevel === level ? color : 'var(--border)'}`,
                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                {level.charAt(0).toUpperCase() + level.slice(1)} ({counts[level]})
              </button>
            ))}
          </div>
          <select className="form-select" style={{ width: 'auto', minWidth: 200 }} value={filterZone} onChange={e => setFilterZone(e.target.value)}>
            <option value="">All zones</option>
            {zones.map(z => <option key={z.id} value={String(z.id)}>{z.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>

        {/* Map */}
        <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', height: 540, boxShadow: 'var(--shadow)' }}>
          {withGps === 0 && !loading && (
            <div style={{ position: 'absolute', zIndex: 500, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'white', padding: '16px 24px', borderRadius: 8, boxShadow: 'var(--shadow-md)', textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 32 }}>📍</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
                No GPS coordinates yet.<br />Register households with addresses to see markers.
              </div>
            </div>
          )}
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Selected detail */}
          {selected && (
            <div className="card" style={{ borderLeft: `4px solid ${PRIORITY_COLORS[priorityLevel(selected.priority_score)]}` }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{selected.name}</div>
              <div className="text-sm text-muted">{selected.address}</div>
              {selected.city && <div className="text-sm text-muted">{selected.city}, {selected.state} {selected.zip_code}</div>}
              {selected.lat && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</div>}
              <hr className="divider" />
              <div>
                <span style={{ background: PRIORITY_COLORS[priorityLevel(selected.priority_score)], color: 'white', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                  {priorityLabel(selected.priority_score)} — {Math.round(selected.priority_score)}
                </span>
              </div>
              <div className="stack" style={{ marginTop: 8, gap: 3 }}>
                <div className="text-sm"><span className="text-muted">Residents:</span> {selected.residents_count}</div>
                {selected.is_elderly       && <div className="text-sm text-amber">🧓 Elderly</div>}
                {selected.has_mobility_limitations && <div className="text-sm text-red">♿ Mobility limitations</div>}
                {selected.medical_equipment?.length > 0 && <div className="text-sm text-amber">⚡ {selected.medical_equipment.join(', ')}</div>}
                {!selected.has_car        && <div className="text-sm text-muted">🚫 No vehicle</div>}
                {selected.is_captain      && <div className="text-sm" style={{ color: 'var(--navy)', fontWeight: 600 }}>★ Block Captain</div>}
                {selected.contact         && <div className="text-sm text-muted">📞 {selected.contact}</div>}
              </div>
              <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={() => setSelected(null)}>✕ Close</button>
            </div>
          )}

          {/* Household list */}
          <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>
              {filtered.length} household{filtered.length !== 1 ? 's' : ''} shown
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 380 }}>
              {filtered.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No households match the current filter.</div>
              )}
              {[...filtered].sort((a, b) => b.priority_score - a.priority_score).map(h => {
                const color = PRIORITY_COLORS[priorityLevel(h.priority_score)]
                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      setSelected(h)
                      if (h.lat && h.lng && mapRef.current) {
                        mapRef.current.setView([h.lat, h.lng], 17)
                        markersRef.current?.eachLayer(m => {
                          const pos = m.getLatLng?.()
                          if (pos && Math.abs(pos.lat - h.lat) < 0.0001 && Math.abs(pos.lng - h.lng) < 0.0001) {
                            m.openPopup()
                          }
                        })
                      }
                    }}
                    style={{
                      padding: '9px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                      background: selected?.id === h.id ? '#f0f4ff' : 'white',
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.address}{h.city ? `, ${h.city}` : ''}
                    </div>
                    {!h.lat && <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>No GPS — enter full address to pin</div>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
