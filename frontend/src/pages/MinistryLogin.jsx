import { useId, useRef, useState } from 'react'
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
 *
 * Presentation only — every credential decision belongs to ministryAuth, which
 * this page reaches through loginMinistry and never inspects directly.
 */
export default function MinistryLogin() {
  const { t } = useGov()
  const { loginMinistry, isMinistry } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [officerId, setOfficerId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const errorId = useId()
  const passwordRef = useRef(null)

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
      // discover which Officer IDs are real. The entered ID is kept; only the
      // password is cleared, which is the field worth retyping.
      setError(result.reason === 'missing' ? t('mlErrorMissing') : t('mlErrorInvalid'))
      setPassword('')
      passwordRef.current?.focus()
      return
    }
    navigate(location.state?.from || '/ministry', { replace: true })
  }

  return (
    <div className="mlogin">
      <div className="mlogin__grid">
        {/* Government identity and the terms of access, stated before the
            form rather than buried under it. */}
        <section className="mlogin__aside">
          <p className="mlogin__eyebrow">{t('mlEyebrow')}</p>
          <h1 className="mlogin__heading">{t('mlAccessHeading')}</h1>
          <p className="mlogin__lede">{t('mlSubtitle')}</p>

          <div className="mlogin__notice">
            <span className="mlogin__notice-icon" aria-hidden="true">
              &#128274;
            </span>
            <div>
              <strong className="mlogin__notice-title">{t('mlRestricted')}</strong>
              <span className="mlogin__notice-body">{t('mlSecurityNotice')}</span>
            </div>
          </div>
        </section>

        <section className="mlogin__panel">
          <div className="mlogin__card">
            <h2 className="mlogin__title">{t('mlTitle')}</h2>

            <form
              className="mlogin__form"
              onSubmit={submit}
              aria-label={t('mlFormLabel')}
              noValidate
            >
              {error ? (
                <p className="mlogin__error" id={errorId} role="alert">
                  <span className="mlogin__error-label">{t('mlErrorLabel')}</span>
                  <span>{error}</span>
                </p>
              ) : null}

              <div className="mlogin__field">
                <label className="mlogin__label" htmlFor="officer-id">
                  {t('mlOfficerId')}
                </label>
                <input
                  id="officer-id"
                  className="mlogin__input"
                  type="text"
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="characters"
                  spellCheck="false"
                  placeholder={t('mlOfficerIdPlaceholder')}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  required
                />
              </div>

              <div className="mlogin__field">
                <label className="mlogin__label" htmlFor="officer-pw">
                  {t('mlPassword')}
                </label>
                <div className="mlogin__pw">
                  <input
                    id="officer-pw"
                    ref={passwordRef}
                    className="mlogin__input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    required
                  />
                  <button
                    type="button"
                    className="mlogin__pw-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-pressed={showPassword}
                    aria-controls="officer-pw"
                  >
                    {showPassword ? t('mlHidePassword') : t('mlShowPassword')}
                  </button>
                </div>
              </div>

              <button type="submit" className="mlogin__submit" disabled={busy}>
                {busy ? t('mlSigningIn') : t('mlSignIn')}
              </button>
            </form>
          </div>

          <p className="mlogin__trainee">
            <span>{t('mlTraineePrompt')}</span>{' '}
            <button
              type="button"
              className="mlogin__trainee-link"
              onClick={() => navigate('/client')}
            >
              {t('mlTraineeLink')}
            </button>
          </p>
        </section>
      </div>
    </div>
  )
}
