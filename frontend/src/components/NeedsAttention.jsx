import React from 'react'
import { Link } from 'react-router-dom'
import { useGov } from '../gov/GovContext.jsx'

const DEST = {
  role_mismatch: (f) => `/ministry/providers/${f.unit_id}`,
  unverified: (f) => `/ministry/providers/${f.unit_id}`,
  stale: () => '/ministry/follow-up',
  disputes: () => '/ministry/disputes',
}

/**
 * What an officer should do next, in priority order.
 *
 * Every card names a unit, quantifies the problem and offers exactly one
 * action. None of them are red: a centre placing people into the wrong
 * occupation has a curriculum problem, not a misconduct problem, and colouring
 * it like an alarm would misdirect the response. Red is reserved for disputes,
 * where two parties actively contradict each other.
 */
export default function NeedsAttention({ findings, loading }) {
  const { t } = useGov()

  if (loading) {
    return (
      <div className="grid grid--3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton" style={{ height: 150 }} />
        ))}
      </div>
    )
  }

  if (!findings?.length) {
    return (
      <p className="empty">
        {t('noFollowupRequired')}
      </p>
    )
  }

  const getHeadline = (f) => {
    if (f.kind === 'role_mismatch') return t('attRoleMismatchTitle')
    if (f.kind === 'stale') return t('attStaleTitle')
    if (f.kind === 'unverified') return t('attUnverifiedTitle')
    if (f.kind === 'disputes') return t('attDisputesTitle')
    return f.headline
  }

  const getAction = (f) => {
    if (f.kind === 'role_mismatch') return t('attRoleMismatchAction')
    if (f.kind === 'stale') return t('attStaleAction')
    if (f.kind === 'unverified') return t('attUnverifiedAction')
    if (f.kind === 'disputes') return t('attDisputesAction')
    return f.action
  }

  return (
    <div className="grid grid--3 attention">
      {findings.map((f) => (
        <article className={`att att--${f.kind === 'disputes' ? 'urgent' : 'act'}`} key={f.id}>
          <p className="att__kind">{getHeadline(f)}</p>
          <p className="att__unit">
            {f.unit}
            {f.district ? <span className="att__district"> · {f.district}</span> : null}
          </p>
          <p className="att__detail">{f.detail}</p>
          <Link className="att__action" to={DEST[f.kind]?.(f) || '/'}>
            {getAction(f)} →
          </Link>
        </article>
      ))}
    </div>
  )
}
