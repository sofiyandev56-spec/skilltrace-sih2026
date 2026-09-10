import React from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { useGov } from '../gov/GovContext.jsx'

/**
 * Route guards for the two interfaces.
 *
 * Separation is enforced here, not by hiding links. Typing a ministry URL as a
 * trainee reaches this code and is refused; there is no path from the trainee
 * session to a governance page that does not pass through Officer credentials.
 */

/** Governance pages. Requires an authenticated ministry officer. */
export function MinistryRoute({ children }) {
  const { isMinistry } = useAuth()
  const { t } = useGov()
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  if (isMinistry) return children

  // A signed-in trainee gets an explanation rather than a login form: the
  // credentials they hold can never open this page, so offering the ministry
  // sign-in as the next step would be misleading.
  if (isAuthenticated) {
    return (
      <div className="auth-guard-panel">
        <div className="auth-guard-card">
          <div className="auth-guard-icon" style={{ color: 'var(--tier-conflict)' }}>
            &#9940;
          </div>
          <h3>{t('guardRestrictedTitle')}</h3>
          <p>{t('guardRestrictedBody')}</p>

          <div className="callout-rule" style={{ textAlign: 'left', margin: '16px 0' }}>
            <div>
              <strong>{t('guardDpdpaTitle')}</strong> {t('guardDpdpaBody')}
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
            <button type="button" className="btn btn--primary" onClick={() => navigate('/client')}>
              &larr; {t('guardBackToClient')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Nobody signed in: send them to the ministry sign-in, remembering where
  // they were going so the redirect lands correctly afterwards.
  return <Navigate to="/ministry/login" replace state={{ from: location.pathname }} />
}

/** Trainee pages. Requires a client session. */
export function ClientRoute({ children }) {
  const { isAuthenticated, isMinistry, openLogin } = useAuth()
  const { t } = useGov()
  const navigate = useNavigate()

  if (isAuthenticated) return children

  // An officer is not a trainee and has no personal record to show.
  if (isMinistry) {
    return (
      <div className="auth-guard-panel">
        <div className="auth-guard-card">
          <div className="auth-guard-icon">&#128100;</div>
          <h3>{t('guardOfficerOnClientTitle')}</h3>
          <p>{t('guardOfficerOnClientBody')}</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button type="button" className="btn btn--primary" onClick={() => navigate('/ministry')}>
              &larr; {t('guardBackToMinistry')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-guard-panel">
      <div className="auth-guard-card">
        <div className="auth-guard-icon">&#128274;</div>
        <h3>{t('guardAuthRequiredTitle')}</h3>
        <p>{t('guardAuthRequiredBody')}</p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
          <button
            type="button"
            className="btn btn--primary btn--lg"
            onClick={() => openLogin('select')}
          >
            {t('guardSignIn')}
          </button>
        </div>
      </div>
    </div>
  )
}
