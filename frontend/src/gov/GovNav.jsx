import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useGov } from './GovContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'

export default function GovNav({ counts = { disputes: 0, followup: 0 }, onResetDemo }) {
  const { lang, openPolicy } = useGov()
  const { role } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Role-specific navigation links
  const govItems = [
    {
      path: '/',
      labelEn: 'Governance Dashboard',
      labelHi: 'प्रशासन डैशबोर्ड',
      badge: null,
    },
    {
      path: '/disputes',
      labelEn: 'Disputed Records',
      labelHi: 'विवादित रिकॉर्ड',
      badge: counts.disputes > 0 ? counts.disputes : null,
      badgeClass: 'nav-badge--danger',
    },
    {
      path: '/follow-up',
      labelEn: 'Follow-up Queue',
      labelHi: 'अनुवर्ती सूची',
      badge: counts.followup > 0 ? counts.followup : null,
      badgeClass: 'nav-badge--warning',
    },
    {
      path: '/check-in',
      labelEn: 'Check-in Simulator',
      labelHi: 'चेक-इन सिम्युलेटर',
      badge: null,
    },
    {
      path: '/client',
      labelEn: 'Trainee Portal (View)',
      labelHi: 'प्रशिक्षार्थी पोर्टल',
      badge: null,
    },
  ]

  const clientItems = [
    {
      path: '/client',
      labelEn: 'My Client Dashboard',
      labelHi: 'मेरा डैशबोर्ड',
      badge: null,
    },
    {
      path: '/consent',
      labelEn: 'My Consent & Rights',
      labelHi: 'सहमति एवं अधिकार',
      badge: null,
    },
    {
      path: '/check-in',
      labelEn: 'Submit Check-in',
      labelHi: 'चेक-इन दर्ज करें',
      badge: null,
    },
  ]

  const navItems = role === 'client' ? clientItems : govItems

  return (
    <nav className="gov-nav" aria-label="Primary Navigation">
      <div className="gov-nav__inner">
        {/* Mobile menu toggle */}
        <button
          type="button"
          className="gov-nav__mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          <span className="gov-nav__hamburger-icon" aria-hidden="true">☰</span>
          <span>{lang === 'hi' ? 'मेन्यू' : 'Menu'}</span>
        </button>

        {/* Links list */}
        <ul className={`gov-nav__list ${mobileMenuOpen ? 'is-open' : ''}`}>
          {navItems.map((item) => (
            <li key={item.path} className="gov-nav__item">
              <NavLink
                to={item.path}
                end={item.path === '/' || item.path === '/client'}
                className={({ isActive }) =>
                  `gov-nav__link ${isActive ? 'is-active' : ''}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{lang === 'hi' ? item.labelHi : item.labelEn}</span>
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
              <span>{lang === 'hi' ? 'नीतियां एवं DPDPA' : 'Policies & DPDPA'}</span>
            </button>
          </li>
        </ul>

        {/* Right action in nav bar */}
        <div className="gov-nav__right">
          <button
            type="button"
            className="gov-nav__reset-btn"
            onClick={onResetDemo}
            title="Reset dataset to seeded initial state"
          >
            <span aria-hidden="true">&#8635;</span>
            <span>{lang === 'hi' ? 'डेमो डेटा रीसेट' : 'Reset demo data'}</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
