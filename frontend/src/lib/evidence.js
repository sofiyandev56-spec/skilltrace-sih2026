/**
 * The single place trust_level is turned into a user-facing evidence tier.
 * Every badge, chart colour and legend in the app reads from here, so a tier
 * can never mean two different things on two different screens.
 */
export const TIERS = {
  high: {
    key: 'high',
    label: 'Verified',
    color: '#1a7a4c',
    className: 'tier--high',
    meaning: 'Confirmed by bank records or directly by the employer.',
  },
  medium: {
    key: 'medium',
    label: 'Corroborated',
    color: '#2b6cb0',
    className: 'tier--medium',
    meaning: 'Checked in person by a field officer, or matched across two sources.',
  },
  low: {
    key: 'low',
    label: 'Self-reported',
    color: '#b4623a',
    className: 'tier--low',
    meaning: 'Stated by the trainee and not yet independently confirmed.',
  },
  stale: {
    key: 'stale',
    label: 'Stale',
    color: '#8a949e',
    className: 'tier--stale',
    meaning: 'Last confirmed more than 9 months ago. Treat as out of date.',
  },
}

export const TIER_ORDER = ['high', 'medium', 'low', 'stale']

export const tierOf = (trustLevel) => TIERS[trustLevel] || TIERS.stale

/** "62% verified, 38% self-reported" — the plain-language version. */
export function describeEvidence(evidence) {
  if (!evidence || !evidence.total) return 'No supporting evidence on record.'
  return (
    TIER_ORDER.filter((k) => evidence[k] > 0)
      .map((k) => `${evidence[k]}% ${TIERS[k].label.toLowerCase()}`)
      .join(', ')
  )
}

/** The tier that carries the most weight in a breakdown — used for a single badge. */
export function dominantTier(evidence) {
  if (!evidence || !evidence.total) return TIERS.stale
  let best = 'stale'
  for (const k of TIER_ORDER) if ((evidence[k] || 0) > (evidence[best] || 0)) best = k
  return TIERS[best]
}

/** Colours for the outcome buckets shown on the dashboard. */
export const BUCKET_META = {
  employed: { label: 'Employed', color: '#1a7a4c' },
  self_employed: { label: 'Self-employed', color: '#2b6cb0' },
  apprentice: { label: 'Apprentice', color: '#6b46a8' },
  not_working: { label: 'Not working', color: '#a32c2c' },
  awaiting_confirmation: { label: 'Awaiting 3-month confirmation', color: '#b4623a' },
  no_data: { label: 'No data', color: '#8a949e' },
}

export const SOURCE_LABEL = {
  bank: 'Bank record',
  employer: 'Employer',
  trainee: 'Trainee',
  field_officer: 'Field officer',
}

export const WHAT_LABEL = {
  placed: 'Placed',
  still_working: 'Still working',
  left_job: 'Left the job',
  self_employed: 'Self-employed',
  apprentice: 'Apprentice',
  not_working: 'Not working',
}
