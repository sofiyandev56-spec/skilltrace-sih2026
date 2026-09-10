export const pct = (v, digits = 1) =>
  v === null || v === undefined ? '—' : `${Number(v).toFixed(digits).replace(/\.0$/, '')}%`

export const int = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-IN'))

export const inr = (v) =>
  v === null || v === undefined ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function longDate(iso) {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00Z`)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function daysAgo(iso, asOf) {
  if (!iso) return null
  const a = new Date(`${iso}T00:00:00Z`)
  const b = new Date(`${asOf || new Date().toISOString().slice(0, 10)}T00:00:00Z`)
  return Math.round((b - a) / 86400000)
}

export function relativeAge(iso, asOf) {
  const d = daysAgo(iso, asOf)
  if (d === null) return '—'
  if (d < 1) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 31) return `${d} days ago`
  const m = Math.round(d / 30.44)
  if (m < 24) return `${m} month${m === 1 ? '' : 's'} ago`
  return `${Math.floor(m / 12)} yr ${m % 12} mo ago`
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
