import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useGov } from '../gov/GovContext.jsx'

const ToastCtx = createContext(null)

/**
 * Minimal toast queue. Messages are announced politely rather than
 * interrupting, and each one stays long enough to be read by someone using a
 * screen reader before it is dismissed.
 */
export function ToastProvider({ children }) {
  const { t } = useGov()
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (message, { tone = 'success', detail = null, duration = 5000 } = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((t) => [...t, { id, message, tone, detail }])
      if (duration) setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss])

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toastItem) => (
          <div key={toastItem.id} className={`toast toast--${toastItem.tone}`}>
            <span className="toast__icon" aria-hidden="true">
              {toastItem.tone === 'success' ? '✓' : toastItem.tone === 'error' ? '!' : 'i'}
            </span>
            <div className="toast__text">
              <strong>{toastItem.message}</strong>
              {toastItem.detail ? <span>{toastItem.detail}</span> : null}
            </div>
            <button
              type="button"
              className="toast__close"
              onClick={() => dismiss(toastItem.id)}
              aria-label={typeof t === 'function' ? (t('dismiss') || t('close') || 'Dismiss') : 'Dismiss'}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
