import React, { useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

export default function ProtectedRoute({ allowedRoles = ['government', 'client'], children }) {
  const { user, isAuthenticated, role, isMasterAdmin, openLogin, logout, checkVerificationStatus } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Auto-poll verification status while on the pending approval gate so it unlocks immediately
  useEffect(() => {
    if (!isMasterAdmin && user?.verified === false) {
      const interval = setInterval(() => {
        checkVerificationStatus()
      }, 1200)
      return () => clearInterval(interval)
    }
  }, [isMasterAdmin, user?.verified, checkVerificationStatus])

  if (!isAuthenticated) {
    return (
      <div className="auth-guard-panel">
        <div className="auth-guard-card">
          <div className="auth-guard-icon">&#128274;</div>
          <h3>Authentication Required</h3>
          <p>You must sign in with Google to access the SkillTrace National Portal.</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => openLogin('select')}
            >
              Sign In with Google
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Master government admin always bypasses verification gate
  if (!isMasterAdmin && user?.verified === false) {
    return (
      <div className="auth-guard-panel">
        <div className="auth-guard-card" style={{ maxWidth: 580, borderTop: '4px solid #f59e0b' }}>
          <div className="auth-guard-icon" style={{ color: '#d97706', fontSize: '3rem' }}>&#9203;</div>
          <div style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, marginBottom: 10, letterSpacing: '0.04em' }}>
            STATUS: PENDING SOVEREIGN APPROVAL
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '8px 0 10px', color: '#1e293b' }}>
            Authorization Pending Master Approval
          </h2>
          <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6 }}>
            Your Google Account <strong>{user?.email}</strong> ({user?.name}) has been registered in the National Registry, but <strong>no access role has been granted yet</strong>.
          </p>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, margin: '18px 0', textAlign: 'left', fontSize: '0.86rem' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>&#127963;</span> Ministry of Skill Development & Entrepreneurship Policy
            </div>
            <p style={{ margin: 0, color: '#64748b' }}>
              Direct access to Trainee and Employer portals is strictly restricted. Only the Master Government Administrator (<strong>shlok.borad11@gmail.com</strong>) can authorize user accounts and assign operational roles.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => {
                checkVerificationStatus()
                window.location.reload()
              }}
            >
              &#8635; Check Status / Refresh
            </button>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={logout}
            >
              Sign Out
            </button>
          </div>
          <div style={{ marginTop: 14, fontSize: '0.78rem', color: '#94a3b8' }}>
            Contact master officer: <a href="mailto:shlok.borad11@gmail.com" style={{ color: '#2563eb', fontWeight: 600 }}>shlok.borad11@gmail.com</a>
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
          <h3>Access Restricted &middot; Authorization Required</h3>
          <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6 }}>
            You are currently signed in as <strong>{user?.name}</strong>. Access to this partition is restricted under sovereign security policies.
          </p>

          <div className="callout-rule" style={{ textAlign: 'left', margin: '16px 0' }}>
            <div>
              <strong>Digital Personal Data Protection (DPDPA 2023) Safeguard:</strong> This portal
              strictly enforces role segregation between National Government Oversight, Trainee Self-Records,
              and Corporate Employer Verification.
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => navigate(role === 'employer' ? '/employer' : role === 'client' ? '/client' : '/')}
            >
              &larr; Return to My Portal
            </button>
            {isMasterAdmin && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => navigate('/master-portal')}
              >
                Open Master Admin Portal &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return children
}
