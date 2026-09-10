import { useEffect, useState } from 'react'
import { getMode, onModeChange } from '../api/client.js'
import { useGov } from '../gov/GovContext.jsx'

/**
 * Says out loud whether the figures on screen came from the backend or from
 * the local mock store. A demo should never leave that ambiguous.
 */
export default function ModeBadge() {
  const { t } = useGov()
  const [state, setState] = useState(getMode)
  useEffect(() => onModeChange(setState), [])

  if (state.mode === 'unknown') {
    return (
      <span className="mode">
        <i className="mode__dot" aria-hidden="true" />
        {t('connecting')}
      </span>
    )
  }
  const live = state.mode === 'live'
  return (
    <span
      className={`mode ${live ? 'mode--live' : 'mode--mock'}`}
      title={
        live
          ? `Connected to ${state.base}`
          : state.forced
            ? 'VITE_FORCE_MOCK=1 — live calls disabled'
            : `${state.base} unreachable (${state.lastError}). Serving local mock data.`
      }
    >
      <i className="mode__dot" aria-hidden="true" />
      {live ? t('liveApi') : t('mockData')}
    </span>
  )
}
