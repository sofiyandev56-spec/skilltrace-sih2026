/**
 * The single place trust_level is turned into a user-facing evidence tier.
 * Every badge, chart colour and legend in the app reads from here, so a tier
 * can never mean two different things on two different screens.
 */
export const TIERS = {
  high: {
    key: 'high',
    label: 'Verified',
    labelHi: 'सत्यापित',
    color: '#1a7a4c',
    className: 'tier--high',
    meaning: 'Confirmed by bank records or directly by the employer.',
    meaningHi: 'बैंक रिकॉर्ड या सीधे नियोक्ता द्वारा पुष्टीकृत।',
  },
  medium: {
    key: 'medium',
    label: 'Corroborated',
    labelHi: 'पुष्टीकृत',
    color: '#2b6cb0',
    className: 'tier--medium',
    meaning: 'Checked in person by a field officer, or matched across two sources.',
    meaningHi: 'क्षेत्रीय अधिकारी द्वारा व्यक्तिगत जांच या दो स्रोतों से मिलान।',
  },
  low: {
    key: 'low',
    label: 'Self-reported',
    labelHi: 'स्व-रिपोर्टेड',
    color: '#b4623a',
    className: 'tier--low',
    meaning: 'Stated by the trainee and not yet independently confirmed.',
    meaningHi: 'प्रशिक्षार्थी द्वारा दर्ज, अभी स्वतंत्र रूप से अपुष्ट।',
  },
  stale: {
    key: 'stale',
    label: 'Stale',
    labelHi: 'पुराना',
    color: '#8a949e',
    className: 'tier--stale',
    meaning: 'Last confirmed more than 9 months ago. Treat as out of date.',
    meaningHi: '9+ माह पूर्व पुष्टीकृत। इसे पुराना रिकॉर्ड मानें।',
  },
}

export const TIER_ORDER = ['high', 'medium', 'low', 'stale']

export const tierOf = (trustLevel) => TIERS[trustLevel] || TIERS.stale

export const getTierLabel = (trustLevel, lang = 'en') => {
  const t = tierOf(trustLevel)
  return lang === 'hi' ? t.labelHi || t.label : t.label
}

/** "62% verified, 38% self-reported" — the plain-language version. */
export function describeEvidence(evidence, lang = 'en') {
  if (!evidence || !evidence.total) return lang === 'hi' ? 'रिकॉर्ड में कोई सहायक साक्ष्य नहीं।' : 'No supporting evidence on record.'
  return (
    TIER_ORDER.filter((k) => evidence[k] > 0)
      .map((k) => `${evidence[k]}% ${lang === 'hi' ? TIERS[k].labelHi : TIERS[k].label.toLowerCase()}`)
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
  employed: { label: 'Employed', labelHi: 'रोज़गार प्राप्त', color: '#1a7a4c' },
  self_employed: { label: 'Self-employed', labelHi: 'स्व-रोज़गार', color: '#2b6cb0' },
  apprentice: { label: 'Apprentice', labelHi: 'प्रशिक्षु (अप्रेंटिस)', color: '#6b46a8' },
  not_working: { label: 'Not working', labelHi: 'कार्यरत नहीं', color: '#a32c2c' },
  awaiting_confirmation: { label: 'Awaiting 3-month confirmation', labelHi: '3-माह पुष्टि प्रतीक्षित', color: '#b4623a' },
  no_data: { label: 'No data', labelHi: 'कोई डेटा नहीं', color: '#8a949e' },
}

export const getBucketLabel = (key, lang = 'en') => {
  const b = BUCKET_META[key] || BUCKET_META.no_data
  return lang === 'hi' ? b.labelHi || b.label : b.label
}

export const SOURCE_LABEL = {
  bank: 'Bank record',
  employer: 'Employer',
  trainee: 'Trainee',
  field_officer: 'Field officer',
}

export const SOURCE_LABEL_HI = {
  bank: 'बैंक रिकॉर्ड',
  employer: 'नियोक्ता',
  trainee: 'प्रशिक्षार्थी',
  field_officer: 'क्षेत्रीय अधिकारी',
}

export const WHAT_LABEL = {
  placed: 'Placed',
  still_working: 'Still working',
  left_job: 'Left the job',
  self_employed: 'Self-employed',
  apprentice: 'Apprentice',
  not_working: 'Not working',
}

export const WHAT_LABEL_HI = {
  placed: 'नियुक्ति हुई (Placed)',
  still_working: 'कार्यरत हैं',
  left_job: 'कार्य छोड़ दिया',
  self_employed: 'स्व-रोज़गार',
  apprentice: 'प्रशिक्षु (अप्रेंटिस)',
  not_working: 'कार्यरत नहीं',
}
