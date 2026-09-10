import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useGov } from './GovContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'

export default function GovNav({ counts = { disputes: 0, followup: 0 }, onResetDemo }) {
  const { t, openPolicy } = useGov()
  const { role, isMinistry, logoutMinistry } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Governance only. The trainee interface is a separate product reached with
  // separate credentials, so nothing here links into it.
  const ministryItems = [
    { path: '/ministry', key: 'navGovDashboard', badge: null },
    {
      path: '/ministry/disputes',
      key: 'navDisputedRecords',
      badge: counts.disputes > 0 ? counts.disputes : null,
      badgeClass: 'nav-badge--danger',
    },
    {
      path: '/ministry/follow-up',
      key: 'navFollowupQueue',
      badge: counts.followup > 0 ? counts.followup : null,
      badgeClass: 'nav-badge--warning',
    },
    { path: '/ministry/audit', key: 'navAuditTrail', badge: null },
  ]

  const clientItems = [
    { path: '/client', key: 'navMyDashboard', badge: null },
    { path: '/client/consent', key: 'navMyConsent', badge: null },
    { path: '/client/check-in', key: 'navSubmitCheckin', badge: null },
  ]

  const navItems = isMinistry ? ministryItems : role === 'client' ? clientItems : []

  return (
    <nav className="gov-nav" aria-label="Primary Navigation">
      <div className="gov-nav__inner">
        {/* Mobile menu toggle */}
        <button
          type="button"
          className="gov-nav__mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label={t('navToggleMenu')}
        >
          <span className="gov-nav__hamburger-icon" aria-hidden="true">☰</span>
          <span>{t('navMenu')}</span>
        </button>

        {/* Links list */}
        <ul className={`gov-nav__list ${mobileMenuOpen ? 'is-open' : ''}`}>
          {navItems.map((item) => (
            <li key={item.path} className="gov-nav__item">
              <NavLink
                to={item.path}
                end={item.path === '/ministry' || item.path === '/client'}
                className={({ isActive }) =>
                  `gov-nav__link ${isActive ? 'is-active' : ''}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{t(item.key)}</span>
                {item.badge && (
                  <span className={`gov-nav__badge num ${item.badgeClass || ''}`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          ))}

          {/* Quick policy link */}
          <li className="gov-nav__item">
            <button
              type="button"
              className="gov-nav__link gov-nav__link--action"
              onClick={() => {
                setMobileMenuOpen(false)
                openPolicy('privacy')
              }}
            >
              <span>{t('navPoliciesDPDPA')}</span>
            </button>
          </li>
        </ul>

        {/* Right action in nav bar */}
        <div className="gov-nav__right">
          <button
            type="button"
            className="gov-nav__reset-btn"
            onClick={onResetDemo}
            title={t('navResetTitle')}
          >
            <span aria-hidden="true">&#8635;</span>
            <span>{t('navResetDemo')}</span>
          </button>
          {isMinistry ? (
            <button type="button" className="gov-nav__reset-btn" onClick={logoutMinistry}>
              <span aria-hidden="true">&#8594;]</span>
              <span>{t('navSignOut')}</span>
            </button>
          ) : null}
        </div>
      </div>
    </nav>
  )
}
