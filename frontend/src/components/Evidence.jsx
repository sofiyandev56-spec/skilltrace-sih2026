import { TIERS, TIER_ORDER, describeEvidence, dominantTier } from '../lib/evidence.js'
import { useGov } from '../gov/GovContext.jsx'

/** A single evidence-tier pill, e.g. "● Verified" / "● सत्यापित". */
export function EvidenceBadge({ trust, small, children }) {
  const { lang } = useGov()
  const hi = lang === 'hi'
  const tier = TIERS[trust] || TIERS.stale
  const label = hi ? tier.labelHi || tier.label : tier.label
  const meaning = hi ? tier.meaningHi || tier.meaning : tier.meaning

  return (
    <span className={`tier ${tier.className} ${small ? 'tier--sm' : ''}`} title={meaning}>
      <i className="tier__dot" aria-hidden="true" />
      {children || label}
    </span>
  )
}

/** Stacked 4-segment bar showing how a number's evidence splits by tier. */
export function EvidenceMeter({ evidence, height = 5 }) {
  const { lang } = useGov()
  if (!evidence || !evidence.total) {
    return <div className="meter" style={{ height }} aria-hidden="true" />
  }
  return (
    <div
      className="meter"
      style={{ height }}
      role="img"
      aria-label={`${lang === 'hi' ? 'साक्ष्य' : 'Evidence'}: ${describeEvidence(evidence, lang)}`}
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
  const { lang } = useGov()
  const hi = lang === 'hi'

  return (
    <div>
      <div className="pop__title">{hi ? 'इस आंकड़े के पीछे साक्ष्य' : 'Evidence behind this number'}</div>
      {evidence && evidence.total ? (
        <>
          {TIER_ORDER.map((k) => (
            <div className="pop__row" key={k}>
              <i
                className="tier__dot"
                style={{ background: TIERS[k].color, width: 8, height: 8 }}
                aria-hidden="true"
              />
              <span>{hi ? TIERS[k].labelHi : TIERS[k].label}</span>
              <span className="num">{evidence[k]}%</span>
            </div>
          ))}
          <div className="pop__note">
            {hi ? (
              <>
                {evidence.total} रिकॉर्ड पर आधारित।{' '}
                {note || 'प्रत्येक रिकॉर्ड को पुष्टि विधि के आधार पर श्रेणीबद्ध किया गया है, और 9 माह बाद यह पुराना हो जाता है।'}
              </>
            ) : (
              <>
                Based on {evidence.total} record{evidence.total === 1 ? '' : 's'}.{' '}
                {note || 'Each record is tiered by how it was confirmed, and decays to Stale after 9 months.'}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="pop__note">{hi ? 'इस आंकड़े के लिए अभी कोई सहायक रिकॉर्ड नहीं है।' : 'No supporting records for this figure yet.'}</div>
      )}
    </div>
  )
}

export { dominantTier }
