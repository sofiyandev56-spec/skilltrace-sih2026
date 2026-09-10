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
  const { user, isAuthenticated, role, openLogin, logout, switchDemoRole } = useAuth()
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
                >
                  <span className={`gov-user-chip__badge gov-user-chip__badge--${role}`}>
                    {role === 'government' ? 'GOV' : 'CIT'}
                  </span>
                  <span className="gov-user-chip__name">{user.name}</span>
                  <span className="gov-user-chip__caret" aria-hidden="true">
                    ▾
                  </span>
                </button>

                {menuOpen && (
                  <div className="gov-user-dropdown">
                    <div className="gov-user-dropdown__header">
                      <strong>{user.name}</strong>
                      <span>
                        {role === 'government'
                          ? hi
                            ? 'सरकारी अधिकारी'
                            : 'Government officer'
                          : hi
                            ? 'नागरिक / प्रशिक्षार्थी'
                            : 'Citizen / trainee'}
                      </span>
                    </div>
                    <div className="gov-user-dropdown__actions">
                      <button
                        type="button"
                        className="gov-user-dropdown__item"
                        onClick={() => {
                          setMenuOpen(false)
                          switchDemoRole(role === 'government' ? 'client' : 'government')
                        }}
                      >
                        {role === 'government'
                          ? hi
                            ? 'प्रशिक्षार्थी दृश्य पर जाएँ'
                            : 'Switch to trainee view'
                          : hi
                            ? 'अधिकारी दृश्य पर जाएँ'
                            : 'Switch to officer view'}
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
              <button type="button" className="gov-contrast-btn" onClick={() => openLogin('select')}>
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
