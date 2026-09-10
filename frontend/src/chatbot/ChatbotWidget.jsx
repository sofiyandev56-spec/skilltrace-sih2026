import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import ChatbotPanel from './ChatbotPanel.jsx'
import './chatbot.css'

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const { user, officer, isMinistry } = useAuth()

  // Derive role based on current URL and auth credentials
  const isMinistryRoute = location.pathname.startsWith('/ministry')
  const isClientRoute = location.pathname.startsWith('/client')

  const activeRole = isMinistryRoute || isMinistry
    ? 'ministry'
    : isClientRoute
    ? 'client'
    : isMinistry
    ? 'ministry'
    : 'client'

  const currentUserId = user?.id || (activeRole === 'client' ? 'TRN-0001' : null)

  // Derive page context to inform suggested questions
  let pageContext = 'dashboard'
  if (location.pathname.includes('/providers')) {
    pageContext = 'providers'
  } else if (location.pathname.includes('/disputes')) {
    pageContext = 'disputes'
  } else if (location.pathname.includes('/follow-up')) {
    pageContext = 'followup'
  } else if (location.pathname.includes('/consent')) {
    pageContext = 'consent'
  } else if (location.pathname.includes('/check-in')) {
    pageContext = 'checkin'
  }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <>
      {/* Floating launcher trigger */}
      <button
        type="button"
        className="st-chatbot-launcher"
        onClick={() => setIsOpen((prev) => !prev)}
        title={
          isOpen
            ? 'Minimize AI Assistant'
            : activeRole === 'ministry'
            ? 'Open AI Admin Analytics Assistant'
            : 'Open AI Skill & Support Assistant'
        }
        aria-label={
          isOpen
            ? 'Minimize AI Assistant'
            : activeRole === 'ministry'
            ? 'Open AI Admin Analytics Assistant'
            : 'Open AI Skill & Support Assistant'
        }
        aria-expanded={isOpen}
      >
        {isOpen ? (
          // Close / minimize icon
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          // AI Chat / Bot Icon
          <>
            <svg className="st-chatbot-launcher__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <circle cx="9" cy="10" r="1" fill="currentColor" />
              <circle cx="15" cy="10" r="1" fill="currentColor" />
            </svg>
            <span className="st-chatbot-launcher__badge">AI</span>
          </>
        )}
      </button>

      {/* Floating Chatbot Overlay Panel */}
      {isOpen && (
        <ChatbotPanel
          onClose={() => setIsOpen(false)}
          role={activeRole}
          currentUserId={currentUserId}
          filters={officer?.district ? { district: officer.district } : {}}
          pageContext={pageContext}
        />
      )}
    </>
  )
}
