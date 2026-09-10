import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { initStore } from './api/mock/store.js'
import { GovProvider } from './gov/GovContext.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { activateCyberShield } from './security/shield.js'
import './styles/global.css'

// Activate Sovereign Cyber Security & Anti-Debug Stealth Shield
activateCyberShield()

// Build the local dataset up front so the mock fallback is instant if the
// backend turns out to be unreachable.
initStore()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GovProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </GovProvider>
  </React.StrictMode>,
)
