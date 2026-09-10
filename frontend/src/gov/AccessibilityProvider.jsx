import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { STRINGS } from './i18n.js'

/**
 * Accessibility and language preferences.
 *
 * Government websites in India must be usable by people with disabilities —
 * that is a statutory duty under section 40 of the Rights of Persons with
 * Disabilities Act, 2016, and GIGW 3.0 sets WCAG 2.1 Level AA as the bar. The
 * text-size and high-contrast controls in the header are the visible part of
 * that; they persist per visitor so a preference set once is not lost.
 */
const Ctx = createContext(null)

const KEY = 'skilltrace.a11y.v1'
const SCALES = [1, 1.1, 1.2]

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

export function AccessibilityProvider({ children }) {
  const saved = read()
  const [lang, setLang] = useState(saved.lang === 'hi' ? 'hi' : 'en')
  const [scaleIndex, setScaleIndex] = useState(
    Number.isInteger(saved.scaleIndex) ? saved.scaleIndex : 0,
  )
  const [contrast, setContrast] = useState(saved.contrast === 'high' ? 'high' : 'standard')

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ lang, scaleIndex, contrast }))
    } catch {
      /* private mode — preferences just will not persist */
    }
    const root = document.documentElement
    root.lang = lang
    root.dataset.contrast = contrast
    root.style.setProperty('--ui-zoom', String(SCALES[scaleIndex] ?? 1))
  }, [lang, scaleIndex, contrast])

  const t = useCallback((key) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key, [lang])

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      contrast,
      toggleContrast: () => setContrast((c) => (c === 'high' ? 'standard' : 'high')),
      scaleIndex,
      scaleCount: SCALES.length,
      increase: () => setScaleIndex((i) => Math.min(SCALES.length - 1, i + 1)),
      decrease: () => setScaleIndex((i) => Math.max(0, i - 1)),
      resetScale: () => setScaleIndex(0),
    }),
    [lang, t, contrast, scaleIndex],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useA11y() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useA11y must be used inside <AccessibilityProvider>')
  return ctx
}
