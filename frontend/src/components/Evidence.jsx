import { TIERS, TIER_ORDER, describeEvidence, dominantTier } from '../lib/evidence.js'

/** A single evidence-tier pill, e.g. "● Verified". */
export function EvidenceBadge({ trust, small, children }) {
  const tier = TIERS[trust] || TIERS.stale
  return (
    <span className={`tier ${tier.className} ${small ? 'tier--sm' : ''}`} title={tier.meaning}>
      <i className="tier__dot" aria-hidden="true" />
      {children || tier.label}
    </span>
  )
}

/** Stacked 4-segment bar showing how a number's evidence splits by tier. */
export function EvidenceMeter({ evidence, height = 5 }) {
  if (!evidence || !evidence.total) {
    return <div className="meter" style={{ height }} aria-hidden="true" />
  }
  return (
    <div
      className="meter"
      style={{ height }}
      role="img"
      aria-label={`Evidence: ${describeEvidence(evidence)}`}
    >
      {TIER_ORDER.map((k) =>
        evidence[k] > 0 ? (
          <span key={k} style={{ width: `${evidence[k]}%`, background: TIERS[k].color }} />
        ) : null,
      )}
    </div>
  )
}

/** The breakdown panel shown when a figure is clicked. */
export function EvidenceBreakdown({ evidence, note }) {
  return (
    <div>
      <div className="pop__title">Evidence behind this number</div>
      {evidence && evidence.total ? (
        <>
          {TIER_ORDER.map((k) => (
            <div className="pop__row" key={k}>
              <i
                className="tier__dot"
                style={{ background: TIERS[k].color, width: 8, height: 8 }}
                aria-hidden="true"
              />
              <span>{TIERS[k].label}</span>
              <span className="num">{evidence[k]}%</span>
            </div>
          ))}
          <div className="pop__note">
            Based on {evidence.total} record{evidence.total === 1 ? '' : 's'}.{' '}
            {note || 'Each record is tiered by how it was confirmed, and decays to Stale after 9 months.'}
          </div>
        </>
      ) : (
        <div className="pop__note">No supporting records for this figure yet.</div>
      )}
    </div>
  )
}

export { dominantTier }
