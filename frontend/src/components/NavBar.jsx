import { NavLink, useNavigate, Link } from 'react-router-dom'
import { identity, api } from '../api'
import { useState, useEffect } from 'react'

export default function NavBar() {
  const [me, setMe] = useState(identity.get())
  const [unread, setUnread] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const sync = () => setMe(identity.get())
    window.addEventListener('cg:identity', sync)
    return () => window.removeEventListener('cg:identity', sync)
  }, [])

  useEffect(() => {
    const syncUnread = () => {
      const current = identity.get()
      if (current) {
        api.getUnreadCount(current.id)
          .then(d => setUnread(d.count))
          .catch(() => {})
      } else {
        setUnread(0)
      }
    }
    syncUnread()
    window.addEventListener('cg:identity', syncUnread)
    window.addEventListener('cg:messages', syncUnread)
    const iv = setInterval(syncUnread, 30000)
    return () => {
      clearInterval(iv)
      window.removeEventListener('cg:identity', syncUnread)
      window.removeEventListener('cg:messages', syncUnread)
    }
  }, [])

  function signOut() {
    identity.clear()
    setMe(null)
    setUnread(0)
    window.dispatchEvent(new Event('cg:identity'))
    navigate('/')
  }

  const navLink = ({ isActive }) => (isActive ? 'active' : '')

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        🆘 Crisis<span>Grid</span>
      </NavLink>

      <div className="navbar-links">
        <NavLink to="/" end className={navLink}>Home</NavLink>
        <NavLink to="/map" className={navLink}>🗺️ Map</NavLink>
        {!me && <NavLink to="/register" className={navLink}>Register</NavLink>}
        {me && (
          <NavLink to="/messages" className={navLink} style={{ position: 'relative' }}>
            💬 Messages
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: -2,
                background: '#dc2626', color: 'white',
                borderRadius: '99px', fontSize: 10, fontWeight: 700,
                padding: '1px 5px', lineHeight: 1.4,
              }}>
                {unread}
              </span>
            )}
          </NavLink>
        )}
        {me?.is_captain && <NavLink to="/dashboard" className={navLink}>Dashboard</NavLink>}
        <NavLink to="/terms" className={navLink} style={{ fontSize: 12 }}>Terms</NavLink>
      </div>

      <div className="navbar-identity">
        {me ? (
          <>
            <span>
              {me.name}
              {me.is_captain && <span style={{ color: 'var(--orange-light)', marginLeft: 4 }}>★</span>}
            </span>
            <button
              className="btn btn-outline btn-sm"
              style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }}
              onClick={signOut}
            >
              Sign out
            </button>
          </>
        ) : (
          <Link to="/apply-captain" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textDecoration: 'none' }}>
            Apply as Captain →
          </Link>
        )}
      </div>
    </nav>
  )
}
