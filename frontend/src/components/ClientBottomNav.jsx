import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { useGov } from '../gov/GovContext.jsx'

export default function ClientBottomNav() {
  const { isAuthenticated, role } = useAuth()
  const { t } = useGov()
  const location = useLocation()

  // Display only for authenticated client / trainee session on mobile screens
  if (!isAuthenticated || role !== 'client') return null

  const isClientRoute = location.pathname.startsWith('/client') || 
                        location.pathname === '/consent' || 
                        location.pathname === '/check-in'

  if (!isClientRoute) return null

  return (
    <nav className="client-bottom-nav" aria-label="Mobile Trainee Navigation">
      <NavLink
        to="/client"
        end
        className={({ isActive }) =>
          `client-bottom-nav__item ${isActive ? 'is-active' : ''}`
        }
      >
        <span className="client-bottom-nav__icon" aria-hidden="true">📊</span>
        <span className="client-bottom-nav__label">{t('navMyDashboard')}</span>
      </NavLink>

      <NavLink
        to="/client/check-in"
        className={({ isActive }) =>
          `client-bottom-nav__item ${isActive ? 'is-active' : ''}`
        }
      >
        <span className="client-bottom-nav__icon" aria-hidden="true">✓</span>
        <span className="client-bottom-nav__label">{t('navSubmitCheckin')}</span>
      </NavLink>

      <NavLink
        to="/client/consent"
        className={({ isActive }) =>
          `client-bottom-nav__item ${isActive ? 'is-active' : ''}`
        }
      >
        <span className="client-bottom-nav__icon" aria-hidden="true">🔒</span>
        <span className="client-bottom-nav__label">{t('navMyConsent')}</span>
      </NavLink>
    </nav>
  )
}
