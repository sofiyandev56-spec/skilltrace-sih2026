import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { useGov } from '../gov/GovContext.jsx'

/**
 * Ministry sign-in.
 *
 * Deliberately not reachable from the trainee interface and deliberately not
 * an option inside the ordinary login modal: reaching the governance console
 * requires an issued Officer ID, and nothing a citizen can do to their own
 * session grants it.
 */
export default function MinistryLogin() {
  const { t } = useGov()
  const { loginMinistry, isMinistry } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [officerId, setOfficerId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Already signed in — send them where they were headed.
  if (isMinistry) {
    return <Navigate to={location.state?.from || '/ministry'} replace />
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)

    const result = await loginMinistry(officerId, password)
    setBusy(false)

    if (!result.ok) {
      // One message for both failure modes, so the form cannot be used to
      // discover which Officer IDs are real.
      setError(result.reason === 'missing' ? t('mlErrorMissing') : t('mlErrorInvalid'))
      return
    }
    navigate(location.state?.from || '/ministry', { replace: true })
  }

  return (
    <div className="mlogin">
      <div className="mlogin__card">
        <div className="mlogin__head">
          <img src="/state-emblem.png" alt="" className="mlogin__emblem" />
          <p className="mlogin__eyebrow">{t('mlEyebrow')}</p>
          <h1 className="mlogin__title">{t('mlTitle')}</h1>
          <p className="mlogin__sub">{t('mlSubtitle')}</p>
        </div>

        <form className="mlogin__form" onSubmit={submit} noValidate>
          {error ? (
            <p className="mlogin__error" role="alert">
              {error}
            </p>
          ) : null}

          <label className="field">
            <span className="field__label" htmlFor="officer-id">
              {t('mlOfficerId')}
            </span>
            <input
              id="officer-id"
              className="input"
              type="text"
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
              autoComplete="username"
              placeholder={t('mlOfficerIdPlaceholder')}
              aria-describedby={error ? 'mlogin-error' : undefined}
              required
            />
          </label>

          <label className="field">
            <span className="field__label" htmlFor="officer-pw">
              {t('mlPassword')}
            </span>
            <input
              id="officer-pw"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" className="btn btn--primary mlogin__submit" disabled={busy}>
            {busy ? t('mlSigningIn') : t('mlSignIn')}
          </button>
        </form>

        <p className="mlogin__note">{t('mlRestricted')}</p>

        <button type="button" className="mlogin__back" onClick={() => navigate('/client')}>
          {t('mlBackToTrainee')}
        </button>
      </div>
    </div>
  )
}
