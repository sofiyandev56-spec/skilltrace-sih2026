/**
 * Sovereign Cyber Security & Anti-Inspection Stealth Shield
 * Digital Personal Data Protection (DPDPA 2023) & GIGW 3.0 Compliance
 *
 * Implements strict runtime anti-debugging, console neutralization,
 * React DevTools hook blanking, and keyboard/contextmenu inspection prevention.
 */

export function activateCyberShield() {
  if (typeof window === 'undefined') return

  // 1. Total Console Neutralization (Zero trace, zero logs, zero endpoint leaks)
  const noop = () => {}
  const methods = [
    'log',
    'info',
    'warn',
    'error',
    'debug',
    'trace',
    'table',
    'dir',
    'dirxml',
    'group',
    'groupCollapsed',
    'groupEnd',
    'time',
    'timeLog',
    'timeEnd',
    'count',
    'countReset',
    'assert',
    'profile',
    'profileEnd',
  ]

  methods.forEach((m) => {
    try {
      window.console[m] = noop
    } catch (e) {}
  })

  try {
    window.console.clear()
  } catch (e) {}

  // 2. Global Error & Promise Rejection Suppression (No stack traces leak to crackers)
  window.addEventListener('error', (e) => {
    e.preventDefault()
    e.stopPropagation()
    return true
  }, { capture: true })

  window.addEventListener('unhandledrejection', (e) => {
    e.preventDefault()
    e.stopPropagation()
    return true
  }, { capture: true })

  // 3. Neutralize React DevTools Global Hook
  try {
    if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
      for (const prop in window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__[prop] === 'function') {
          window.__REACT_DEVTOOLS_GLOBAL_HOOK__[prop] = noop
        }
      }
    } else {
      Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
        value: {
          supportsFiber: true,
          renderers: new Map(),
          inject: noop,
          onCommitFiberRoot: noop,
          onCommitFiberUnmount: noop,
        },
        configurable: false,
        writable: false,
      })
    }
  } catch (e) {}

  // 4. Anti-Inspection Keyboard Shortcuts (Blocks F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U)
  document.addEventListener('keydown', (e) => {
    // Block F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    const isCtrlOrMeta = e.ctrlKey || e.metaKey

    // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (isCtrlOrMeta && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    // Block Ctrl+U (View Source)
    if (isCtrlOrMeta && (e.key === 'u' || e.key === 'U' || e.keyCode === 85)) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    // Block Ctrl+S (Save Page)
    if (isCtrlOrMeta && (e.key === 's' || e.key === 'S' || e.keyCode === 83)) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }, { capture: true })

  // 5. Anti-Contextmenu (Right-click Inspect Element protection)
  document.addEventListener('contextmenu', (e) => {
    // Only prevent on non-input elements to allow typing/pasting if needed
    const tag = (e.target?.tagName || '').toLowerCase()
    if (tag !== 'input' && tag !== 'textarea') {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }, { capture: true })
}

/**
 * Mask internal role names to official institutional designations.
 * Ensures external observers/crackers cannot discern internal database roles.
 */
export function getMaskedRoleLabel(role, isMaster = false) {
  if (isMaster) return 'National Sovereign Authority'
  switch (role) {
    case 'client':
      return 'Digital Skill Passport'
    case 'employer':
      return 'Accredited Enterprise Partner'
    case 'government':
      return 'National Oversight Authority'
    default:
      return 'Verified Sovereign User'
  }
}
