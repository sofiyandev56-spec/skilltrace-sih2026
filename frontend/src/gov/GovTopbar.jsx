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
const TEXT_SIZES = [
  { key: 'small', glyph: 'A', title: 'Decrease text size', titleHi: 'अक्षर आकार घटाएँ' },
  { key: 'normal', glyph: 'A', title: 'Normal text size', titleHi: 'सामान्य अक्षर आकार' },
  { key: 'large', glyph: 'A', title: 'Increase text size', titleHi: 'अक्षर आकार बढ़ाएँ' },
]

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
              className="gov-topbar__reader"
              onClick={() => openPolicy('accessibility')}
            >
              {t('screenReader')}
            </button>
          </div>

          <div className="gov-topbar__right">
            <div className="gov-text-controls" role="group" aria-label={t('textSize')}>
              <span className="gov-text-controls__label">{t('textSize')}</span>
              {TEXT_SIZES.map((size, i) => (
                <button
                  key={size.key}
                  type="button"
                  className="gov-text-btn"
                  aria-pressed={textSize === size.key}
                  aria-label={hi ? size.titleHi : size.title}
                  title={hi ? size.titleHi : size.title}
                  onClick={() => setTextSize(size.key)}
                  style={{ fontSize: 10 + i * 2 }}
                >
                  {size.glyph}
                </button>
              ))}
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

            <div className="gov-lang-switch" role="group" aria-label={t('language')}>
              <button
                type="button"
                className="gov-lang-btn"
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
                className="gov-lang-btn"
                aria-pressed={lang === 'hi'}
                onClick={() => setLang('hi')}
              >
                हिन्दी
              </button>
            </div>

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
          </div>
        </div>
    </div>
  )
}
