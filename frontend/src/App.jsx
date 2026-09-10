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
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import { ROUTE_META } from './routes.js'
import Dashboard from './pages/Dashboard.jsx'
import Disputes from './pages/Disputes.jsx'
import Consent from './pages/Consent.jsx'
import CheckIn from './pages/CheckIn.jsx'
import FollowupQueue from './pages/FollowupQueue.jsx'
import EmployerConfirm from './pages/EmployerConfirm.jsx'
import ClientDashboard from './pages/ClientDashboard.jsx'

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
  const counts = useNavCounts()
  const { pathname } = useLocation()
  useDocumentTitle()

  const resetDemo = () => {
    mock.resetAll()
    window.location.reload()
  }

  // The public employer page is reached from a link with no login, so it gets
  // the government chrome but neither the internal navigation nor breadcrumbs.
  const isPublic = pathname.startsWith('/employer')

  return (
    <div className="gov-layout-root">
      <div className="gov-tricolor" aria-hidden="true">
        <span className="gov-tricolor__saffron" />
        <span className="gov-tricolor__white" />
        <span className="gov-tricolor__green" />
      </div>

      <GovTopbar />
      <GovIdentity />

      {!isPublic && (
        <>
          <GovNav counts={counts} onResetDemo={resetDemo} />
          <GovBreadcrumbs />
        </>
      )}

      <main className="gov-main-content" id="main-content" tabIndex={-1}>
        <Routes>
          {/* Public — an employer follows a link and confirms without an account. */}
          <Route path="/employer" element={<EmployerConfirm />} />
          <Route path="/employer/:token" element={<EmployerConfirm />} />

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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <GovFooter />

      <div className="gov-tricolor gov-tricolor--bottom" aria-hidden="true">
        <span className="gov-tricolor__saffron" />
        <span className="gov-tricolor__white" />
        <span className="gov-tricolor__green" />
      </div>

      <GovPolicyModal />
      <AuthModal />
    </div>
  )
}
