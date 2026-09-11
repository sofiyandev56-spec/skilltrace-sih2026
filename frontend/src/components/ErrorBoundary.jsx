import React from 'react'

/**
 * Production-grade Error Boundary compliant with GIGW 3.0 standards.
 * Catches any unhandled render-tree errors, prevents blank screens,
 * and gives the user a clear recovery path without losing context.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('SkillTrace ErrorBoundary caught an exception:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    } else {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <main
          id="main-content"
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
          }}
        >
          <div
            style={{
              maxWidth: 540,
              width: '100%',
              background: '#ffffff',
              border: '1px solid var(--border-strong, #cbd5e1)',
              borderTop: '4px solid var(--accent, #d97706)',
              borderRadius: 6,
              padding: '28px 24px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#fef3c7',
                  color: '#92400e',
                  fontWeight: 700,
                  fontSize: 18,
                }}
                aria-hidden="true"
              >
                !
              </span>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 600 }}>
                  Service Interruption
                </h2>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  SkillTrace — Skilling Outcomes Tracking System
                </span>
              </div>
            </div>

            <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.5, marginBottom: 20 }}>
              An unexpected error occurred while displaying this section. Your underlying data and
              verified credentials remain safe.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={this.handleReset}
                style={{ minHeight: 40, padding: '8px 16px' }}
              >
                Refresh View
              </button>
              <a
                href="/client"
                className="btn btn--secondary"
                style={{
                  minHeight: 40,
                  padding: '8px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                }}
              >
                Return to Portal Home
              </a>
            </div>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
