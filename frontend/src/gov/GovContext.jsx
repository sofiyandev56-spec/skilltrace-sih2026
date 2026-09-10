import React, { createContext, useContext, useEffect, useState } from 'react'
import { STRINGS } from './i18n.js'
import { setFormatLocale } from '../lib/format.js'

const GovContext = createContext(null)

export function GovProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('skilltrace.lang') || 'en')
  const [textSize, setTextSize] = useState(() => localStorage.getItem('skilltrace.textSize') || 'normal')
  const [contrast, setContrast] = useState(() => localStorage.getItem('skilltrace.contrast') || 'standard')
  const [policyModal, setPolicyModal] = useState({ open: false, tab: 'privacy' })

  // Dates and month names read a module-level locale, so it has to be set
  // while rendering rather than in an effect: an effect runs after the
  // children have already rendered, which left every date on the page one
  // language behind the one the reader had just chosen.
  setFormatLocale(lang)

  // Sync html attributes on change
  useEffect(() => {
    localStorage.setItem('skilltrace.lang', lang)
    // Screen readers switch voice off this attribute, so it must track the
    // chosen language and not just the dictionary.
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  useEffect(() => {
    localStorage.setItem('skilltrace.textSize', textSize)
    document.documentElement.setAttribute('data-text-size', textSize)
  }, [textSize])

  useEffect(() => {
    localStorage.setItem('skilltrace.contrast', contrast)
    document.documentElement.setAttribute('data-contrast', contrast)
  }, [contrast])

  const t = (key, ...args) => {
    const dict = STRINGS[lang] || STRINGS.en
    let str = dict[key] !== undefined ? dict[key] : (STRINGS.en[key] || key)
    if (args.length > 0 && typeof str === 'string') {
      args.forEach((arg, i) => {
        str = str.replace(new RegExp(`\\{${i}\\}`, 'g'), arg)
      })
    }
    return str
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
