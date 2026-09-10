import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Disputes from './pages/Disputes.jsx'
import Consent from './pages/Consent.jsx'
import CheckIn from './pages/CheckIn.jsx'
import FollowupQueue from './pages/FollowupQueue.jsx'
import EmployerConfirm from './pages/EmployerConfirm.jsx'

export default function App() {
  return (
    <Routes>
      {/* Public, no-login page an employer reaches from a link — no app chrome. */}
      <Route path="/employer" element={<EmployerConfirm />} />
      <Route path="/employer/:token" element={<EmployerConfirm />} />

      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/disputes" element={<Disputes />} />
        <Route path="/follow-up" element={<FollowupQueue />} />
        <Route path="/check-in" element={<CheckIn />} />
        <Route path="/consent" element={<Consent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
