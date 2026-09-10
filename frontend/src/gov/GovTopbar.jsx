import React, { useRef, useState } from 'react'
import { LANGS } from './i18n.js'
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
  { key: 'small', glyph: 'A', labelKey: 'decrease' },
  { key: 'normal', glyph: 'A', labelKey: 'normal' },
  { key: 'large', glyph: 'A', labelKey: 'increase' },
]

export default function GovTopbar() {
  const { lang, setLang, textSize, setTextSize, contrast, setContrast, t, openPolicy } = useGov()
  const { user, officer, isAuthenticated, isMinistry, openLogin, logout, logoutMinistry } = useAuth()
  // The chip shows whichever session owns the page you are on.
  const identity = isMinistry ? officer : user
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
                  aria-label={t(size.labelKey)}
                  title={t(size.labelKey)}
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
              {Object.entries(LANGS).map(([code, label], i) => (
                <React.Fragment key={code}>
                  {i > 0 ? (
                    <span className="gov-lang-divider" aria-hidden="true">
                      |
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="gov-lang-btn"
                    aria-pressed={lang === code}
                    lang={code}
                    onClick={() => setLang(code)}
                  >
                    {label}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {identity ? (
              <div className="gov-user-menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  className="gov-user-chip"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-expanded={menuOpen}
                >
                  <span
                    className={`gov-user-chip__badge gov-user-chip__badge--${isMinistry ? 'ministry' : 'client'}`}
                  >
                    {isMinistry ? 'GOV' : 'CIT'}
                  </span>
                  <span className="gov-user-chip__name">{identity.name}</span>
                  <span className="gov-user-chip__caret" aria-hidden="true">
                    ▾
                  </span>
                </button>

                {menuOpen && (
                  <div className="gov-user-dropdown">
                    <div className="gov-user-dropdown__header">
                      <strong>{identity.name}</strong>
                      <span>
                        {isMinistry
                          ? `${identity.designation} · ${identity.officer_id}`
                          : t('citizenTrainee')}
                      </span>
                      {isMinistry && identity.phone_no && (
                        <span className="mono small faint" style={{ marginTop: 2 }}>
                          📞 +91 {identity.phone_no}
                        </span>
                      )}
                      {isMinistry && identity.district && (
                        <span className="small" style={{ color: '#13529d', fontWeight: 600, marginTop: 2 }}>
                          📍 {identity.district} District
                        </span>
                      )}
                    </div>
                    <div className="gov-user-dropdown__actions">
                      <button
                        type="button"
                        className="gov-user-dropdown__item gov-user-dropdown__item--logout"
                        onClick={() => {
                          setMenuOpen(false)
                          if (isMinistry) logoutMinistry()
                          else logout()
                        }}
                      >
                        {t('signOut')}
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
