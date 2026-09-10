/**
 * Display formatting, locale-aware.
 *
 * The active locale is module-level state set by GovProvider rather than an
 * argument, so the ~100 call sites stay unchanged when the language switches.
 *
 * Digits stay Western-Arabic in every language: Indian government data pages
 * conventionally use them, and Devanagari numerals would break the tabular
 * alignment the dashboard tables depend on. Grouping is the Indian
 * lakh/crore convention in all three locales, which en-IN already gives us.
 */
let LOCALE = 'en-IN'

const MONTHS_BY_LOCALE = {
  'en-IN': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  'hi-IN': ['जन', 'फ़र', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्तू', 'नव', 'दिस'],
  'mr-IN': ['जाने', 'फेब्रु', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑग', 'सप्टें', 'ऑक्टो', 'नोव्हें', 'डिसें'],
}

export function setFormatLocale(lang) {
  LOCALE = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN'
}

export const pct = (v, digits = 1) =>
  v === null || v === undefined ? '—' : `${Number(v).toFixed(digits).replace(/\.0$/, '')}%`

export const int = (v) =>
  v === null || v === undefined ? '—' : Number(v).toLocaleString('en-IN')

export const inr = (v) =>
  v === null || v === undefined ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`


export function longDate(iso) {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00Z`)
  const months = MONTHS_BY_LOCALE[LOCALE] || MONTHS_BY_LOCALE['en-IN']
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** 'YYYY-MM' as a short month and year, e.g. "Mar 2025". */
export function monthLabel(ym) {
  if (!ym) return '—'
  const [y, m] = String(ym).split('-')
  const months = MONTHS_BY_LOCALE[LOCALE] || MONTHS_BY_LOCALE['en-IN']
  return `${months[Number(m) - 1] ?? m} ${y}`
}

export function daysAgo(iso, asOf) {
  if (!iso) return null
  const a = new Date(`${iso}T00:00:00Z`)
  const b = new Date(`${asOf || new Date().toISOString().slice(0, 10)}T00:00:00Z`)
  return Math.round((b - a) / 86400000)
}

const RELATIVE = {
  'en-IN': { today: 'today', yesterday: 'yesterday', days: (n) => `${n} days ago`,
    months: (n) => `${n} month${n === 1 ? '' : 's'} ago`, years: (y, m) => `${y} yr ${m} mo ago` },
  'hi-IN': { today: 'आज', yesterday: 'कल', days: (n) => `${n} दिन पहले`,
    months: (n) => `${n} माह पहले`, years: (y, m) => `${y} वर्ष ${m} माह पहले` },
  'mr-IN': { today: 'आज', yesterday: 'काल', days: (n) => `${n} दिवसांपूर्वी`,
    months: (n) => `${n} महिन्यांपूर्वी`, years: (y, m) => `${y} वर्षे ${m} महिने पूर्वी` },
}

export function relativeAge(iso, asOf) {
  const d = daysAgo(iso, asOf)
  if (d === null) return '—'
  const R = RELATIVE[LOCALE] || RELATIVE['en-IN']
  if (d < 1) return R.today
  if (d === 1) return R.yesterday
  if (d < 31) return R.days(d)
  const m = Math.round(d / 30.44)
  if (m < 24) return R.months(m)
  return R.years(Math.floor(m / 12), m % 12)
}

/** "Aarti Patil" -> "Aarti P." — used on the public employer page. */
export function maskName(name) {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return `${parts[0][0]}${'•'.repeat(Math.max(2, parts[0].length - 1))}`
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export function maskPhone(phone) {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  return `+91 ••••• ${digits.slice(-5)}`
}
