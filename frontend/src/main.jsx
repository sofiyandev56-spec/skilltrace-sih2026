import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { initStore } from './api/mock/store.js'
import './styles/global.css'

// Build the local dataset up front so the mock fallback is instant if the
// backend turns out to be unreachable.
initStore()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
