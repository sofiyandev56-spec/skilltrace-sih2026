import { Link } from 'react-router-dom'

const DEST = {
  role_mismatch: (f) => `/providers/${f.unit_id}`,
  unverified: (f) => `/providers/${f.unit_id}`,
  stale: () => '/follow-up',
  disputes: () => '/disputes',
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
        No follow-up is required for this cohort at this time. Every centre in this slice is inside
        threshold on role relevance, record freshness and evidence quality.
      </p>
    )
  }

  return (
    <div className="grid grid--3 attention">
      {findings.map((f) => (
        <article className={`att att--${f.kind === 'disputes' ? 'urgent' : 'act'}`} key={f.id}>
          <p className="att__kind">{f.headline}</p>
          <p className="att__unit">
            {f.unit}
            {f.district ? <span className="att__district"> · {f.district}</span> : null}
          </p>
          <p className="att__detail">{f.detail}</p>
          <Link className="att__action" to={DEST[f.kind]?.(f) || '/'}>
            {f.action} →
          </Link>
        </article>
      ))}
    </div>
  )
}
