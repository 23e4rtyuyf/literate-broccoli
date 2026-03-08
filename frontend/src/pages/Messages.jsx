import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, identity } from '../api'

export default function Messages() {
  const me = identity.get()
  const navigate = useNavigate()
  const [inbox, setInbox] = useState([])
  const [sent, setSent] = useState([])
  const [households, setHouseholds] = useState([])
  const [zones, setZones] = useState([])
  const [tab, setTab] = useState('inbox')
  const [selected, setSelected] = useState(null)
  const [showCompose, setShowCompose] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  const [compose, setCompose] = useState({
    to_household_id: '',
    subject: '',
    content: '',
    broadcast_zone_id: '',
    is_broadcast: false,
  })

  useEffect(() => {
    if (!me) { navigate('/'); return }
    load()
    // Poll every 30s for new messages
    pollRef.current = setInterval(() => loadInbox(), 30000)
    return () => clearInterval(pollRef.current)
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [i, s, h, z] = await Promise.all([
        api.getInbox(me.id),
        api.getSent(me.id),
        api.getHouseholds(),
        api.getZones(),
      ])
      setInbox(i)
      setSent(s)
      setHouseholds(h.filter(h => h.id !== me.id))
      setZones(z)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadInbox() {
    try {
      const i = await api.getInbox(me.id)
      setInbox(i)
      window.dispatchEvent(new Event('cg:messages'))
    } catch {}
  }

  async function markRead(msg) {
    if (msg.is_read) return
    try {
      await api.markRead(msg.id)
      setInbox(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: 1 } : m))
      window.dispatchEvent(new Event('cg:messages'))
    } catch {}
  }

  function openMessage(msg) {
    setSelected(msg)
    markRead(msg)
  }

  async function handleSend() {
    if (!compose.content.trim()) return
    setSending(true)
    setError(null)
    try {
      if (compose.is_broadcast && compose.broadcast_zone_id) {
        await api.broadcastToZone({
          from_household_id: me.id,
          zone_id: parseInt(compose.broadcast_zone_id),
          subject: compose.subject,
          content: compose.content,
        })
      } else {
        if (!compose.to_household_id) throw new Error('Please select a recipient')
        await api.sendMessage({
          from_household_id: me.id,
          to_household_id: parseInt(compose.to_household_id),
          subject: compose.subject,
          content: compose.content,
        })
      }
      setCompose({ to_household_id: '', subject: '', content: '', broadcast_zone_id: '', is_broadcast: false })
      setShowCompose(false)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  async function replyTo(msg) {
    setCompose({
      to_household_id: String(msg.from_household_id),
      subject: msg.subject ? `Re: ${msg.subject}` : 'Re: (no subject)',
      content: '',
      broadcast_zone_id: '',
      is_broadcast: false,
    })
    setSelected(null)
    setShowCompose(true)
  }

  if (!me) return null

  const unread = inbox.filter(m => !m.is_read).length
  const displayList = tab === 'inbox' ? inbox : sent

  return (
    <div>
      <div className="page-header row-between">
        <div>
          <div className="page-title">
            Messages {unread > 0 && <span style={{ fontSize: 16, background: 'var(--red)', color: 'white', borderRadius: 99, padding: '2px 10px', marginLeft: 8 }}>{unread}</span>}
          </div>
          <div className="page-subtitle">Coordinate with neighbors and your block captain</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCompose(true); setSelected(null) }}>
          ✉️ Compose
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 500 }}>

        {/* Left: message list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="tabs" style={{ padding: '0 12px', margin: 0 }}>
            <button className={`tab ${tab === 'inbox' ? 'active' : ''}`} onClick={() => setTab('inbox')}>
              Inbox {unread > 0 && <span style={{ marginLeft: 4, background: 'var(--red)', color: 'white', borderRadius: 99, padding: '0 5px', fontSize: 10 }}>{unread}</span>}
            </button>
            <button className={`tab ${tab === 'sent' ? 'active' : ''}`} onClick={() => setTab('sent')}>Sent</button>
          </div>

          {loading && <div className="loading"><div className="spinner" /></div>}

          <div style={{ overflowY: 'auto', maxHeight: 600 }}>
            {displayList.length === 0 && !loading && (
              <div className="empty-state" style={{ padding: 32 }}>
                <div style={{ fontSize: 32 }}>📭</div>
                <div className="text-sm" style={{ marginTop: 8 }}>No messages yet</div>
              </div>
            )}
            {displayList.map(msg => (
              <div
                key={msg.id}
                onClick={() => { openMessage(msg); setShowCompose(false) }}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: selected?.id === msg.id ? '#f0f4ff' : (tab === 'inbox' && !msg.is_read ? '#fffbeb' : 'white'),
                  transition: 'background 0.15s',
                }}
              >
                <div className="row-between" style={{ marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: tab === 'inbox' && !msg.is_read ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                    {tab === 'inbox' ? (msg.sender_name || 'Unknown') : (msg.recipient_name || 'Unknown')}
                  </span>
                  {tab === 'inbox' && !msg.is_read && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', display: 'inline-block', flexShrink: 0 }} />
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {msg.subject || '(no subject)'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {msg.content}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                  {new Date(msg.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: message detail or compose */}
        <div className="card">
          {showCompose ? (
            <div>
              <div className="card-title" style={{ marginBottom: 16 }}>New Message</div>

              <div className="form-group">
                <label className="form-label">
                  <input type="checkbox" checked={compose.is_broadcast} onChange={e => setCompose(f => ({ ...f, is_broadcast: e.target.checked }))} style={{ marginRight: 8 }} />
                  Zone broadcast (send to all households in a zone)
                </label>
              </div>

              {compose.is_broadcast ? (
                <div className="form-group">
                  <label className="form-label">Broadcast to zone</label>
                  <select className="form-select" value={compose.broadcast_zone_id} onChange={e => setCompose(f => ({ ...f, broadcast_zone_id: e.target.value }))}>
                    <option value="">Select zone…</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                  {!me.is_captain && (
                    <div className="form-hint text-amber">Only block captains should send zone broadcasts.</div>
                  )}
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">To</label>
                  <select className="form-select" value={compose.to_household_id} onChange={e => setCompose(f => ({ ...f, to_household_id: e.target.value }))}>
                    <option value="">Select recipient…</option>
                    {households.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.name} — {h.address}{h.is_captain ? ' (Captain)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Subject</label>
                <input className="form-input" placeholder="Subject…" value={compose.subject} onChange={e => setCompose(f => ({ ...f, subject: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-textarea" style={{ minHeight: 160 }} placeholder="Your message…" value={compose.content} onChange={e => setCompose(f => ({ ...f, content: e.target.value }))} />
              </div>

              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-primary" onClick={handleSend} disabled={sending || !compose.content.trim()}>
                  {sending ? 'Sending…' : '📤 Send'}
                </button>
                <button className="btn btn-outline" onClick={() => setShowCompose(false)}>Cancel</button>
              </div>
            </div>
          ) : selected ? (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{selected.subject || '(no subject)'}</div>
                <div className="text-sm text-muted">
                  {tab === 'inbox'
                    ? <>From: <strong>{selected.sender_name}</strong> ({selected.sender_address})</>
                    : <>To: <strong>{selected.recipient_name}</strong> ({selected.recipient_address})</>}
                </div>
                <div className="text-xs text-muted">{new Date(selected.created_at).toLocaleString()}</div>
              </div>
              <hr className="divider" />
              <div style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap', fontSize: 14 }}>{selected.content}</div>
              <hr className="divider" />
              {tab === 'inbox' && (
                <button className="btn btn-outline btn-sm" onClick={() => replyTo(selected)}>
                  ↩ Reply
                </button>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <div>Select a message or compose a new one</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCompose(true)}>
                ✉️ Compose
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="alert alert-info" style={{ marginTop: 16 }}>
        <span>🔒</span>
        <span>Messages are visible only to the sender and recipient. In an emergency, always call 911 first.</span>
      </div>
    </div>
  )
}
