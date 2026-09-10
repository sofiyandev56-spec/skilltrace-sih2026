import React, { createContext, useContext, useEffect, useState } from 'react'
import { STRINGS } from './i18n.js'

const GovContext = createContext(null)

export function GovProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('skilltrace.lang') || 'en')
  const [textSize, setTextSize] = useState(() => {
    const saved = localStorage.getItem('skilltrace.textSize')
    if (!saved || isNaN(saved)) return 1
    return Number(saved)
  })
  const [contrast, setContrast] = useState(() => localStorage.getItem('skilltrace.contrast') || 'standard')
  const [policyModal, setPolicyModal] = useState({ open: false, tab: 'privacy' })

  // Clean up any stray theme attributes to guarantee exact original styling
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.fontSize = ''
    document.documentElement.style.removeProperty('--font-scale')
    localStorage.removeItem('skilltrace.theme')
  }, [])

  // Sync html attributes on change
  useEffect(() => {
    localStorage.setItem('skilltrace.lang', lang)
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  useEffect(() => {
    localStorage.setItem('skilltrace.textSize', textSize)
  }, [textSize])

  useEffect(() => {
    localStorage.setItem('skilltrace.contrast', contrast)
    document.documentElement.setAttribute('data-contrast', contrast)
  }, [contrast])

  const t = (key) => {
    const dict = STRINGS[lang] || STRINGS.en
    return dict[key] !== undefined ? dict[key] : (STRINGS.en[key] || key)
  }

  const openPolicy = (tab = 'privacy') => {
    setPolicyModal({ open: true, tab })
  }

  const setPolicyTab = (tab) => {
    setPolicyModal((prev) => ({ ...prev, tab }))
  }

  const closePolicy = () => {
    setPolicyModal((prev) => ({ ...prev, open: false }))
  }

  return (
    <GovContext.Provider
      value={{
        lang,
        setLang,
        textSize,
        setTextSize,
        contrast,
        setContrast,
        t,
        policyModal,
        openPolicy,
        setPolicyTab,
        closePolicy,
      }}
    >
      {children}
    </GovContext.Provider>
  )
}

export function useGov() {
  const ctx = useContext(GovContext)
  if (!ctx) {
    throw new Error('useGov must be used within a GovProvider')
  }
  return ctx
}
