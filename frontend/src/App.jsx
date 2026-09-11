import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { api, mock } from './api/client.js'
import { subscribe } from './api/mock/store.js'
import { useGov } from './gov/GovContext.jsx'
import GovTopbar from './gov/GovTopbar.jsx'
import GovIdentity from './gov/GovIdentity.jsx'
import GovNav from './gov/GovNav.jsx'
import GovBreadcrumbs from './gov/GovBreadcrumbs.jsx'
import GovFooter from './gov/GovFooter.jsx'
import GovPolicyModal from './gov/GovPolicyModal.jsx'
import AuthModal from './auth/AuthModal.jsx'
import { ToastProvider } from './components/Toast.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import { ROUTE_META } from './routes.js'
import Dashboard from './pages/Dashboard.jsx'
import Disputes from './pages/Disputes.jsx'
import Consent from './pages/Consent.jsx'
import CheckIn from './pages/CheckIn.jsx'
import FollowupQueue from './pages/FollowupQueue.jsx'
import ClientDashboard from './pages/ClientDashboard.jsx'
import EmployerDashboard from './pages/EmployerDashboard.jsx'
import MasterPortal from './pages/MasterPortal.jsx'
import GovAuditLogs from './pages/GovAuditLogs.jsx'
/** Keeps the browser tab title in step with the page and the language. */
function useDocumentTitle() {
  const { pathname } = useLocation()
  const { lang } = useGov()
  useEffect(() => {
    const meta = ROUTE_META[pathname]
    const title = meta ? (lang === 'hi' && meta.titleHi ? meta.titleHi : meta.title) : 'SkillTrace'
    document.title = `${title} — SkillTrace`
  }, [pathname, lang])
}

/** Badge counts for the primary navigation, kept current after any change. */
function useNavCounts() {
  const [counts, setCounts] = useState({ disputes: 0, followup: 0 })
  useEffect(() => {
    let alive = true
    const load = async () => {
      const [d, f] = await Promise.all([api.getDisputes(), api.getFollowupQueue()])
      if (!alive) return
      setCounts({
        disputes: (d || []).filter((x) => x.status !== 'resolved').length,
        followup: (f || []).filter((x) => !x.assigned_to).length,
      })
    }
    load()
    const off = subscribe(load)
    return () => {
      alive = false
      off()
    }
  }, [])
  return counts
}

export default function App() {
  const { t } = useGov()
  const counts = useNavCounts()
  useDocumentTitle()

    const resetDemo = async () => {
    try {
      if (api.resetAll) await api.resetAll()
      if (api.resetWhatsAppSession) await api.resetWhatsAppSession('all')
    } catch {}
    mock.resetAll()
    try {
      sessionStorage.clear()
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('skilltrace')) localStorage.removeItem(k)
      })
    } catch {}
    window.location.reload()
  }

  return (
    <ToastProvider>
      <div className="gov-layout-root">
        {/* First focusable element on the page, whatever order the chrome
            bands are rendered in below. */}
        <a className="gov-skip-link" href="#main-content">
          {t('skipToMain')}
        </a>

      <GovTopbar />
      <GovNav counts={counts} onResetDemo={resetDemo} />

      <GovIdentity />
      <GovBreadcrumbs />

      <main className="gov-main-content" id="main-content" tabIndex={-1}>
        <Routes>
          {/* Administrative oversight — accredited officers only. */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['government']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/disputes"
            element={
              <ProtectedRoute allowedRoles={['government']}>
                <Disputes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/follow-up"
            element={
              <ProtectedRoute allowedRoles={['government']}>
                <FollowupQueue />
              </ProtectedRoute>
            }
          />

          {/* The trainee's own record, and the rights they hold over it. */}
          <Route
            path="/client"
            element={
              <ProtectedRoute allowedRoles={['client', 'government']}>
                <ClientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consent"
            element={
              <ProtectedRoute allowedRoles={['client', 'government']}>
                <Consent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/check-in"
            element={
              <ProtectedRoute allowedRoles={['client', 'government']}>
                <CheckIn />
              </ProtectedRoute>
            }
          />

          {/* The employer portal — enterprise candidate retention & milestone verification */}
          <Route
            path="/employer"
            element={
              <ProtectedRoute allowedRoles={['employer', 'government']}>
                <EmployerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Master Sovereign Government Portal — user access control & role assignment */}
          <Route
            path="/master-portal"
            element={
              <ProtectedRoute allowedRoles={['government']}>
                <MasterPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['government']}>
                <GovAuditLogs />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <GovFooter />

      <GovPolicyModal />
      <AuthModal />
      </div>
    </ToastProvider>
  )
}
