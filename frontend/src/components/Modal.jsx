import { useCallback, useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible dialog, built on the portal's existing `gov-modal` styling.
 *
 * Handles the things a dialog has to get right for keyboard and screen-reader
 * users: focus moves in on open and returns to whatever opened it on close,
 * Tab is trapped inside, Escape dismisses, and the page behind is inert to
 * assistive technology.
 */
export default function Modal({ open, onClose, title, subtitle, children, footer, labelId = 'modal-title' }) {
  const cardRef = useRef(null)
  const returnTo = useRef(null)

  const handleKey = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !cardRef.current) return
      const items = [...cardRef.current.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return undefined
    returnTo.current = document.activeElement
    const body = document.body
    const prevOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    // Focus the first meaningful control rather than the close button.
    const t = setTimeout(() => {
      const items = cardRef.current?.querySelectorAll(FOCUSABLE)
      const target = items?.[1] || items?.[0]
      target?.focus()
    }, 20)

    return () => {
      clearTimeout(t)
      body.style.overflow = prevOverflow
      if (returnTo.current instanceof HTMLElement) returnTo.current.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="gov-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="gov-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        ref={cardRef}
        onKeyDown={handleKey}
      >
        <div className="gov-modal__header">
          <div>
            <h2 id={labelId} className="gov-modal__title">
              {title}
            </h2>
            {subtitle ? <p className="gov-modal__subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" className="gov-modal__close" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>

        <div className="gov-modal__body">{children}</div>

        {footer ? <div className="gov-modal__footer">{footer}</div> : null}
      </div>
    </div>
  )
}
