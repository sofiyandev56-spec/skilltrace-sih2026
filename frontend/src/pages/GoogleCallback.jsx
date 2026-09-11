import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { useGov } from '../gov/GovContext.jsx'

/**
 * Where Google sends the browser back to.
 *
 * The backend has already exchanged the code and verified the identity; all
 * that arrives here is the application's own session token, in the URL
 * fragment so it never reaches a server log or a Referer header. It is read
 * once, seated, and stripped from the address bar.
 */
export default function GoogleCallback() {
  const { completeGoogle } = useAuth()
  const { t } = useGov()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const params = new URLSearchParams(location.search)
    const failed = params.get('error')
    if (failed) {
      setError(failed)
      return
    }

    const token = new URLSearchParams(location.hash.replace(/^#/, '')).get('token')
    if (!token) {
      setError('missing')
      return
    }

    window.history.replaceState({}, '', '/auth/google')
    completeGoogle(token).then((res) => {
      if (!res.ok) setError('session')
    })
  }, [completeGoogle, location.hash, location.search])

  if (error) {
    return (
      <div className="auth-guard-panel">
        <div className="auth-guard-card">
          <div className="auth-guard-icon" style={{ color: 'var(--tier-conflict)' }}>
            &#9888;
          </div>
          <h3>{t('gcFailedTitle')}</h3>
          <p>{t(error === 'state' ? 'gcFailedState' : 'gcFailedBody')}</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
            <button type="button" className="btn btn--primary" onClick={() => navigate('/client')}>
              {t('gcBack')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-guard-panel">
      <div className="auth-guard-card">
        <h3>{t('gcSigningIn')}</h3>
        <div className="skeleton" style={{ height: 60, marginTop: 14 }} />
      </div>
    </div>
  )
}
