import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import { AccessibilityProvider } from './gov/AccessibilityProvider.jsx'
import GovHeader from './gov/GovHeader.jsx'
import GovFooter from './gov/GovFooter.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Disputes from './pages/Disputes.jsx'
import Consent from './pages/Consent.jsx'
import CheckIn from './pages/CheckIn.jsx'
import FollowupQueue from './pages/FollowupQueue.jsx'
import EmployerConfirm from './pages/EmployerConfirm.jsx'
import Policies from './pages/Policies.jsx'

/**
 * The government masthead and footer wrap every route, including the public
 * employer page — GIGW expects the policy links, accessibility controls and
 * ownership statement to be reachable from every page of the portal, not only
 * from the pages behind a login.
 */
export default function App() {
  return (
    <AccessibilityProvider>
      <div className="gov-page">
        <div className="gov-shell">
          <GovHeader />
          <div className="gov-main">
            <Routes>
              {/* Public, no-login page an employer reaches from a link. */}
              <Route path="/employer" element={<EmployerConfirm />} />
              <Route path="/employer/:token" element={<EmployerConfirm />} />

              <Route element={<AppShell />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/disputes" element={<Disputes />} />
                <Route path="/follow-up" element={<FollowupQueue />} />
                <Route path="/check-in" element={<CheckIn />} />
                <Route path="/consent" element={<Consent />} />
                <Route path="/policies" element={<Policies />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </div>
          <GovFooter />
        </div>
      </div>
    </AccessibilityProvider>
  )
}
