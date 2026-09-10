import React from 'react'
import { TIERS, TIER_ORDER, describeEvidence, dominantTier } from '../lib/evidence.js'
import { useGov } from '../gov/GovContext.jsx'

/** A single evidence-tier pill, e.g. "● Verified". */
export function EvidenceBadge({ trust, small, children }) {
  const { t } = useGov()
  const tier = TIERS[trust] || TIERS.stale
  const tierLabels = {
    high: t('tierVerified'),
    medium: t('tierCorroborated'),
    low: t('tierSelfReported'),
    stale: t('tierStale'),
    conflict: t('tierNeedsReview'),
  }

  return (
    <span className={`tier ${tier.className} ${small ? 'tier--sm' : ''}`} title={tier.meaning}>
      <i className="tier__dot" aria-hidden="true" />
      {children || tierLabels[trust] || tier.label}
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
  const { t, lang } = useGov()
  const tierLabels = {
    high: t('tierVerified'),
    medium: t('tierCorroborated'),
    low: t('tierSelfReported'),
    stale: t('tierStale'),
    conflict: t('tierNeedsReview'),
  }

  return (
    <div>
      <div className="pop__title">{t('evidenceBehind')}</div>
      {evidence && evidence.total ? (
        <>
          {TIER_ORDER.map((k) => (
            <div className="pop__row" key={k}>
              <i
                className="tier__dot"
                style={{ background: TIERS[k].color, width: 8, height: 8 }}
                aria-hidden="true"
              />
              <span>{tierLabels[k] || TIERS[k].label}</span>
              <span className="num">{evidence[k]}%</span>
            </div>
          ))}
          <div className="pop__note">
            {t(
              'basedOnRecords',
              evidence.total,
              evidence.total === 1 ? '' : (lang === 'hi' ? '' : 's'),
              note || t('evidenceDecayNote'),
            )}
          </div>
        </>
      ) : (
        <div className="pop__note">{t('noSupportingRecords')}</div>
      )}
    </div>
  )
}

export { dominantTier }
