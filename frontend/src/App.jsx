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
import { useAuth } from './auth/AuthContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { ClientRoute, EmployerRoute, MinistryRoute } from './auth/ProtectedRoute.jsx'
import { routeMetaFor } from './routes.js'
import Dashboard from './pages/Dashboard.jsx'
import Disputes from './pages/Disputes.jsx'
import Consent from './pages/Consent.jsx'
import CheckIn from './pages/CheckIn.jsx'
import FollowupQueue from './pages/FollowupQueue.jsx'
import ClientDashboard from './pages/ClientDashboard.jsx'
import MinistryLogin from './pages/MinistryLogin.jsx'
import ProviderDetail from './pages/ProviderDetail.jsx'
import AuditTrail from './pages/AuditTrail.jsx'
import ChatbotWidget from './chatbot/ChatbotWidget.jsx'
import EmployerDashboard from './pages/EmployerDashboard.jsx'
import MasterPortal from './pages/MasterPortal.jsx'
import GovAuditLogs from './pages/GovAuditLogs.jsx'
import GoogleCallback from './pages/GoogleCallback.jsx'
import ClientBottomNav from './components/ClientBottomNav.jsx'

/** Keeps the browser tab title in step with the page and the language. */
function useDocumentTitle() {
  const { pathname } = useLocation()
  const { lang, t } = useGov()
  useEffect(() => {
    const meta = routeMetaFor(pathname)
    document.title = `${t(meta.titleKey)} — SkillTrace`
  }, [pathname, lang, t])
}

/** Badge counts for the primary navigation, kept current after any change. */
function useNavCounts() {
  const [counts, setCounts] = useState({ disputes: 0, followup: 0 })
  const { officer } = useAuth()
  useEffect(() => {
    let alive = true
    const districtFilter = officer?.district ? { district: officer.district } : {}
    const load = async () => {
      const [d, f] = await Promise.all([api.getDisputes(districtFilter), api.getFollowupQueue(districtFilter)])
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
  }, [officer?.district])
  return counts
}

export default function App() {
  const { t } = useGov()
  const counts = useNavCounts()
  const { pathname } = useLocation()
  useDocumentTitle()

  // Authentication pages carry only the government identity and the global
  // accessibility controls. Showing the governance navigation to someone who
  // has not signed in would advertise the console's shape and make the page
  // feel like the inside of the application before any credential is checked.
  const isAuthPage = pathname === '/ministry/login'

  const resetDemo = () => {
    mock.resetAll()
    window.location.reload()
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className={`gov-layout-root${isAuthPage ? ' gov-layout-root--auth' : ''}`}>
          {/* First focusable element on the page, whatever order the chrome
              bands are rendered in below. */}
          <a className="gov-skip-link" href="#main-content">
            {t('skipToMain')}
          </a>

          <GovTopbar />
          {isAuthPage ? null : <GovNav counts={counts} onResetDemo={resetDemo} />}

          <div className="gov-tricolor" aria-hidden="true">
            <span className="gov-tricolor__saffron" />
            <span className="gov-tricolor__white" />
            <span className="gov-tricolor__green" />
          </div>

          <GovIdentity compact={isAuthPage} />
          {isAuthPage ? null : <GovBreadcrumbs />}

          <main
            className={`gov-main-content${isAuthPage ? ' gov-main-content--auth' : ''}`}
            id="main-content"
            tabIndex={-1}
          >
            <Routes>
              {/* ---- Ministry: governance, analytics, adjudication ---- */}
              <Route path="/ministry/login" element={<MinistryLogin />} />

              {/* Where Google returns the browser after sign-in. */}
              <Route path="/auth/google" element={<GoogleCallback />} />
              <Route path="/ministry" element={<MinistryRoute><Dashboard /></MinistryRoute>} />
              <Route path="/ministry/disputes" element={<MinistryRoute><Disputes /></MinistryRoute>} />
              <Route path="/ministry/follow-up" element={<MinistryRoute><FollowupQueue /></MinistryRoute>} />
              <Route path="/ministry/audit" element={<MinistryRoute><AuditTrail /></MinistryRoute>} />
              <Route
                path="/ministry/providers/:id"
                element={<MinistryRoute><ProviderDetail /></MinistryRoute>}
              />

              <Route
                path="/ministry/master-portal"
                element={<MinistryRoute><MasterPortal /></MinistryRoute>}
              />
              <Route
                path="/ministry/audit-logs"
                element={<MinistryRoute><GovAuditLogs /></MinistryRoute>}
              />

              {/* ---- Employer: confirming their own people ---- */}
              <Route path="/employer" element={<EmployerRoute><EmployerDashboard /></EmployerRoute>} />

              {/* ---- Client: the trainee's own record and rights ---- */}
              <Route path="/client" element={<ClientRoute><ClientDashboard /></ClientRoute>} />
              <Route path="/client/consent" element={<ClientRoute><Consent /></ClientRoute>} />
              <Route path="/client/check-in" element={<ClientRoute><CheckIn /></ClientRoute>} />

              {/* ---- Legacy paths, kept so old links and bookmarks still land ---- */}
              <Route path="/" element={<Navigate to="/ministry" replace />} />
              <Route path="/disputes" element={<Navigate to="/ministry/disputes" replace />} />
              <Route path="/follow-up" element={<Navigate to="/ministry/follow-up" replace />} />
              <Route path="/audit" element={<Navigate to="/ministry/audit" replace />} />
              <Route path="/consent" element={<Navigate to="/client/consent" replace />} />
              <Route path="/check-in" element={<Navigate to="/client/check-in" replace />} />

              <Route path="*" element={<Navigate to="/ministry" replace />} />
            </Routes>
          </main>

          <GovFooter compact={isAuthPage} />

          <div className="gov-tricolor gov-tricolor--bottom" aria-hidden="true">
            <span className="gov-tricolor__saffron" />
            <span className="gov-tricolor__white" />
            <span className="gov-tricolor__green" />
          </div>

          <GovPolicyModal />
          <AuthModal />
          <ChatbotWidget />
          <ClientBottomNav />
        </div>
      </ToastProvider>
    </ErrorBoundary>
  )
}
