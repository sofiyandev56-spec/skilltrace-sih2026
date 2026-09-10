import React from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

export default function ProtectedRoute({ allowedRoles = ['government', 'client'], children }) {
  const { user, isAuthenticated, role, openLogin, switchDemoRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!isAuthenticated) {
    return (
      <div className="auth-guard-panel">
        <div className="auth-guard-card">
          <div className="auth-guard-icon">&#128274;</div>
          <h3>Authentication Required</h3>
          <p>You must sign in to view this section of the SkillTrace portal.</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => openLogin('select')}
            >
              Sign In to SkillTrace
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="auth-guard-panel">
        <div className="auth-guard-card">
          <div className="auth-guard-icon" style={{ color: '#b43838' }}>&#9940;</div>
          <h3>Access Restricted &middot; Government Officials Only</h3>
          <p>
            You are currently signed in as a <strong>Citizen / Trainee ({user.name})</strong>. Administrative
            oversight, disputes adjudication, and follow-up assignments require verified <strong>Government
            Officer</strong> credentials.
          </p>

          <div className="callout-rule" style={{ textAlign: 'left', margin: '16px 0' }}>
            <div>
              <strong>Digital Personal Data Protection (DPDPA 2023) Safeguard:</strong> Administrative
              views contain aggregated and multi-district intelligence intended solely for accredited
              evaluation officers of the Ministry of Skill Development and Entrepreneurship.
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'center', gap: 12, marginTop: 18 }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => navigate('/client')}
            >
              &larr; Return to My Client Dashboard
            </button>
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => switchDemoRole('government')}
            >
              Switch to Government Officer Demo
            </button>
          </div>
        </div>
      </div>
    )
  }

  return children
}
