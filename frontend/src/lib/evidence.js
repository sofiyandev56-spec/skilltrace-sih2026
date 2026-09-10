/**
 * The single place trust_level is turned into a user-facing evidence tier.
 * Every badge, chart colour and legend in the app reads from here, so a tier
 * can never mean two different things on two different screens.
 */
export const TIERS = {
  high: {
    key: 'high',
    label: 'Verified',
    color: '#16803C',
    className: 'tier--high',
    meaning: 'Confirmed by bank records or directly by the employer.',
    source: 'Consent-based income signal, or an administrative record.',
  },
  medium: {
    key: 'medium',
    label: 'Corroborated',
    color: '#1769AA',
    className: 'tier--medium',
    meaning: 'Checked in person by a field officer, or matched across two sources.',
    source: 'Trainee check-in and employer confirmation agree.',
  },
  low: {
    key: 'low',
    label: 'Self-reported',
    color: '#A65308',
    className: 'tier--low',
    meaning: 'Stated by the trainee and not yet independently confirmed.',
    source: 'Trainee check-in only.',
  },
  stale: {
    key: 'stale',
    label: 'Stale',
    color: '#667085',
    className: 'tier--stale',
    meaning: 'Last confirmed more than 9 months ago. Treat as out of date.',
    source: 'No new reliable signal in the current tracking period.',
  },
  conflict: {
    key: 'conflict',
    label: 'Needs review',
    color: '#B42318',
    className: 'tier--conflict',
    meaning: 'The employer and the trainee disagree. Neither claim is recorded as fact.',
    source: 'Conflicting reports awaiting field officer review.',
  },
}

export const TIER_ORDER = ['high', 'medium', 'low', 'stale', 'conflict']

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
  employed: { label: 'Employed', color: '#16803C' },
  self_employed: { label: 'Self-employed', color: '#1769AA' },
  apprentice: { label: 'Apprentice', color: '#6b46a8' },
  not_working: { label: 'Not working', color: '#B42318' },
  awaiting_confirmation: { label: 'Awaiting 3-month confirmation', color: '#A65308' },
  no_data: { label: 'No data', color: '#667085' },
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
