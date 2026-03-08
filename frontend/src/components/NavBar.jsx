import { NavLink, useNavigate } from 'react-router-dom'
import { identity } from '../api'
import { useState, useEffect } from 'react'

export default function NavBar() {
  const [me, setMe] = useState(identity.get())
  const navigate = useNavigate()

  useEffect(() => {
    const sync = () => setMe(identity.get())
    window.addEventListener('cg:identity', sync)
    return () => window.removeEventListener('cg:identity', sync)
  }, [])

  function signOut() {
    identity.clear()
    setMe(null)
    window.dispatchEvent(new Event('cg:identity'))
    navigate('/')
  }

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        🆘 Crisis<span>Grid</span>
      </NavLink>
      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink>
        {!me && <NavLink to="/register" className={({ isActive }) => isActive ? 'active' : ''}>Register</NavLink>}
        {me?.is_captain && (
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
        )}
      </div>
      <div className="navbar-identity">
        {me ? (
          <>
            <span>Signed in as <strong>{me.name}</strong>{me.is_captain ? ' · Captain' : ''}</span>
            <button className="btn btn-outline btn-sm" style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }} onClick={signOut}>
              Sign out
            </button>
          </>
        ) : (
          <span style={{ fontSize: 13 }}>Not signed in</span>
        )}
      </div>
    </nav>
  )
}
