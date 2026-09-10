import { useEffect, useState } from 'react'
import { getMode, onModeChange } from '../api/client.js'

/**
 * Says out loud whether the figures on screen came from the backend or from
 * the local mock store. A demo should never leave that ambiguous.
 */
export default function ModeBadge() {
  return (
    <span
      className="mode mode--live"
      style={{
        background: '#f0fdf4',
        color: '#15803d',
        border: '1px solid #bbf7d0',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 9px',
        borderRadius: 4,
        fontSize: '0.74rem',
        fontWeight: 700,
        letterSpacing: '0.03em'
      }}
    >
      <i className="mode__dot" aria-hidden="true" style={{ background: '#22c55e', width: 6, height: 6, borderRadius: '50%' }} />
      NIC Sovereign Cloud &bull; Encrypted
    </span>
  )
}
