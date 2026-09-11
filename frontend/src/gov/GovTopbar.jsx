import { useRef, useState } from 'react'
import { useGov } from './GovContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useDismiss } from '../lib/useApi.js'

/**
 * The accessibility and utility strip that sits above the masthead.
 *
 * Government websites in India must be usable by people with disabilities —
 * a statutory duty under section 40 of the Rights of Persons with Disabilities
 * Act, 2016, with WCAG 2.1 Level AA set as the bar by GIGW 3.0. The skip link,
 * text-size steps and high-contrast toggle here are the visible part of that.
 */
// Text sizes are now handled as a numeric scale for the policy modal
// instead of a global string toggle.

export default function GovTopbar() {
  const { lang, setLang, textSize, setTextSize, contrast, setContrast, t, openPolicy } = useGov()
  const { user, isAuthenticated, role, isMasterAdmin, openLogin, logout, switchDemoRole } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  useDismiss(menuRef, () => setMenuOpen(false), menuOpen)

  const hi = lang === 'hi'

  return (
    <div className="gov-topbar">
      <div className="gov-topbar__inner">
        {/* Utilities only. The government's identity belongs to the masthead
              below, and repeating it here just said the same thing twice. */}
        <div className="gov-topbar__left">
          <button
            type="button"
            className="gov-topbar__reader sr-only"
            onClick={() => openPolicy('accessibility')}
          >
            {t('screenReader')}
          </button>
        </div>

        <div className="gov-topbar__right">
          <div className="gov-lang-switch" role="group" aria-label={t('language')}>
            <button
              type="button"
              className={`gov-lang-btn ${lang === 'en' ? 'is-active' : ''}`}
              aria-pressed={lang === 'en'}
              onClick={() => setLang('en')}
            >
              English
            </button>
            <span className="gov-lang-divider" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              className={`gov-lang-btn ${lang === 'hi' ? 'is-active' : ''}`}
              aria-pressed={lang === 'hi'}
              onClick={() => setLang('hi')}
            >
              हिन्दी
            </button>
          </div>

          <button
            type="button"
            className="gov-contrast-btn"
            aria-pressed={contrast === 'high'}
            onClick={() => setContrast(contrast === 'high' ? 'standard' : 'high')}
          >
            <span className="gov-contrast-btn__icon" aria-hidden="true">
              ◐
            </span>
            {contrast === 'high' ? t('standardContrast') : t('highContrast')}
          </button>

          {isAuthenticated ? (
            <div className="gov-user-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="gov-user-chip"
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  ...(isMasterAdmin ? { border: '1px solid #eab308', background: '#fefce8' } : {})
                }}
              >
                {/* Google Profile Photo Avatar */}
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid #2563eb'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: isMasterAdmin ? '#ca8a04' : '#2563eb',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {(user.name || 'G')[0].toUpperCase()}
                  </div>
                )}

                <span className="gov-user-chip__badge" style={isMasterAdmin ? { background: '#ca8a04', color: '#fff' } : {}}>
                  {isMasterAdmin ? 'GOV' : role === 'government' ? 'AUTHORITY' : role === 'employer' ? 'CORPORATE' : 'PASSPORT'}
                </span>
                <span className="gov-user-chip__name" style={isMasterAdmin ? { color: '#854d0e', fontWeight: 700 } : {}}>{user.name}</span>
                <span className="gov-user-chip__caret" aria-hidden="true">
                  ▾
                </span>
              </button>

              {menuOpen && (
                <div className="gov-user-dropdown">
                  <div className="gov-user-dropdown__header" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name}
                        referrerPolicy="no-referrer"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #2563eb'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: '#2563eb',
                          color: '#fff',
                          fontSize: '18px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {(user.name || 'G')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.95rem' }}>{user.name}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{user.email}</div>
                      <span style={{ fontSize: '0.75rem', marginTop: 2, display: 'block' }}>
                        {isMasterAdmin
                          ? 'GOV'
                          : role === 'government'
                            ? hi
                              ? 'सरकारी अधिकारी (MSDE)'
                              : 'Government Officer (MSDE)'
                            : role === 'employer'
                              ? hi
                                ? `नियोक्ता (${user.company_name || 'Enterprise'})`
                                : `Employer HR (${user.company_name || 'Enterprise'})`
                              : hi
                                ? 'नागरिक / प्रशिक्षार्थी'
                                : 'Citizen / Trainee'}
                      </span>
                    </div>
                  </div>
                  <div className="gov-user-dropdown__actions">
                    {isMasterAdmin && (
                      <a
                        href="/master-portal"
                        className="gov-user-dropdown__item"
                        style={{ color: '#b45309', fontWeight: 700, background: '#fef3c7' }}
                        onClick={() => setMenuOpen(false)}
                      >
                        🏛️ {hi ? 'एडमिन पोर्टल' : 'Admin Portal'}
                      </a>
                    )}
                    <button
                      type="button"
                      className="gov-user-dropdown__item"
                      onClick={() => {
                        setMenuOpen(false)
                        switchDemoRole('government')
                      }}
                    >
                      🏛️ {hi ? 'अधिकारी दृश्य' : 'Government Officer Portal'}
                    </button>
                    <button
                      type="button"
                      className="gov-user-dropdown__item"
                      onClick={() => {
                        setMenuOpen(false)
                        switchDemoRole('client')
                      }}
                    >
                      👤 {hi ? 'प्रशिक्षार्थी दृश्य' : 'Trainee Portal'}
                    </button>
                    <button
                      type="button"
                      className="gov-user-dropdown__item"
                      onClick={() => {
                        setMenuOpen(false)
                        switchDemoRole('employer')
                      }}
                    >
                      🏢 {hi ? 'नियोक्ता दृश्य' : 'Employer Portal'}
                    </button>
                    <button
                      type="button"
                      className="gov-user-dropdown__item gov-user-dropdown__item--logout"
                      onClick={() => {
                        setMenuOpen(false)
                        logout()
                      }}
                    >
                      {hi ? 'साइन आउट' : 'Sign out'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button type="button" className="gov-contrast-btn" onClick={() => openLogin('government')}>
              {hi ? 'साइन इन' : 'Sign in'}
            </button>
          )}

          {/* Text size controls placed at the very end/last */}
          <div className="gov-text-controls" role="group" aria-label={t('textSize')}>
            <span className="gov-text-controls__label">{t('textSize')}</span>
            <button
              type="button"
              className={`gov-text-btn ${textSize < 0.95 ? 'is-active' : ''}`}
              aria-pressed={textSize < 0.95}
              aria-label={t('decrease')}
              title={t('decrease')}
              onClick={() => setTextSize((s) => Math.max(0.75, +(s - 0.15).toFixed(2)))}
              style={{ fontSize: 10 }}
            >
              A-
            </button>
            <button
              type="button"
              className={`gov-text-btn ${Math.abs(textSize - 1) < 0.05 ? 'is-active' : ''}`}
              aria-pressed={Math.abs(textSize - 1) < 0.05}
              aria-label={t('normal')}
              title={t('normal')}
              onClick={() => setTextSize(1)}
              style={{ fontSize: 12 }}
            >
              A
            </button>
            <button
              type="button"
              className={`gov-text-btn ${textSize > 1.05 ? 'is-active' : ''}`}
              aria-pressed={textSize > 1.05}
              aria-label={t('increase')}
              title={t('increase')}
              onClick={() => setTextSize((s) => Math.min(1.75, +(s + 0.15).toFixed(2)))}
              style={{ fontSize: 14 }}
            >
              A+
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
