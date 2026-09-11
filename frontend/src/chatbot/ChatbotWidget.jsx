import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { useGov } from '../gov/GovContext.jsx'
import ChatbotPanel from './ChatbotPanel.jsx'
import './chatbot.css'

/**
 * The assistant's launcher, and the thing that decides which assistant you get.
 *
 * The role comes from the session, never from the URL. Deriving it from the
 * path would mean anyone who typed /ministry/login — a page that requires no
 * credential to reach — was handed the governance assistant and its aggregate
 * data. Signed out, there is no assistant at all: the chatbot answers from
 * real trainee and provider records, so it needs someone to be authenticated
 * before it will say anything.
 */
export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const { user, officer, isAuthenticated, isMinistry } = useAuth()
  const { t } = useGov()

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  // A session that ends while the panel is open must take the panel with it.
  useEffect(() => {
    if (!isMinistry && !isAuthenticated) setIsOpen(false)
  }, [isMinistry, isAuthenticated])

  const activeRole = isMinistry ? 'ministry' : isAuthenticated ? 'client' : null
  if (!activeRole) return null

  // A trainee may only ever be the subject of their own queries. There is no
  // fallback id: without a session there is nothing to ask about.
  const currentUserId = activeRole === 'client' ? user?.id ?? null : null

  let pageContext = 'dashboard'
  const path = location.pathname
  if (path.includes('/providers')) pageContext = 'providers'
  else if (path.includes('/disputes')) pageContext = 'disputes'
  else if (path.includes('/follow-up')) pageContext = 'followup'
  else if (path.includes('/consent')) pageContext = 'consent'
  else if (path.includes('/check-in')) pageContext = 'checkin'

  const label = isOpen ? t('cbCloseAssistant') : t('cbOpenAssistant')

  return (
    <>
      <button
        type="button"
        className="st-chatbot-launcher"
        onClick={() => setIsOpen((prev) => !prev)}
        title={label}
        aria-label={label}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <svg className="st-chatbot-launcher__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <circle cx="9" cy="10" r="1" fill="currentColor" />
              <circle cx="15" cy="10" r="1" fill="currentColor" />
            </svg>
            <span className="st-chatbot-launcher__badge">AI</span>
          </>
        )}
      </button>

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
