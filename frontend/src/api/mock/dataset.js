/**
 * Mock dataset for SkillTrace loaded from organized_data.xlsx.
 *
 * Field names follow the agreed API schema exactly:
 *   trainee  { id, name, course, district, gender, age_group }
 *   event    { id, trainee_id, date, what_happened, job_role, salary, source, trust_level }
 *   provider { id, name, district, certified_count, verified_placement_pct,
 *              retention_3mo, retention_6mo, retention_12mo }
 *   dispute  { id, trainee_id, employer_claim, trainee_claim, date, status }
 *
 * Fields ADDED on top of that schema (documented in README) because the UI
 * cannot be built without them:
 *   trainee.cohort, trainee.provider_id, trainee.category, trainee.phone
 *   event.employer   -- required by the "3+ months at the SAME place" rule,
 *                       by the employer confirmation page and by check-in copy.
 */
import organizedData from './data/organized_data.js'

export const AS_OF = organizedData.as_of || '2026-09-10'

export const DISTRICTS = organizedData.districts || []

/** Each course trains for one intended job role, with a planned placement target. */
export const COURSES = organizedData.courses || []

export const COHORTS = organizedData.cohorts || []

export const BANK_MONTHS = organizedData.bank_months || []

export const AGE_GROUPS = ['18-24', '25-34', '35-44']
export const GENDERS = ['Male', 'Female', 'Other']
export const CATEGORIES = ['General', 'OBC', 'SC', 'ST']

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const iso = (d) => d.toISOString().slice(0, 10)

export const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return iso(d)
}

export const daysBetween = (a, b) => {
  if (!a || !b) return 0
  const cleanA = a.length > 10 ? a.slice(0, 10) : a
  const cleanB = b.length > 10 ? b.slice(0, 10) : b
  return Math.round((new Date(`${cleanB}T00:00:00Z`) - new Date(`${cleanA}T00:00:00Z`)) / 86400000)
}

/** Last day of the quarter a cohort label refers to — i.e. when training ended. */
export function cohortEndDate(cohort) {
  if (!cohort) return '2025-12-31'
  const [year, q] = cohort.split('-')
  const endings = { Q1: '03-31', Q2: '06-30', Q3: '09-30', Q4: '12-31' }
  return `${year}-${endings[q] || '12-31'}`
}

/** Months of observable history a cohort has, as of AS_OF. */
export function cohortAgeMonths(cohort) {
  return Math.floor(daysBetween(cohortEndDate(cohort), AS_OF) / 30.44)
}

/**
 * Evidence tier is a property of HOW we learned something, aged by time.
 * bank statements > employer confirmation > field officer > trainee self-report,
 * and anything older than ~9 months decays to 'stale'.
 */
export function trustFor(source, date) {
  if (daysBetween(date, AS_OF) > 275) return 'stale'
  if (source === 'bank' || source === 'employer') return 'high'
  if (source === 'field_officer') return 'medium'
  return 'low'
}

export function groupEventsByTrainee(events) {
  const map = {}
  for (const e of events) {
    ;(map[e.trainee_id] ||= []).push(e)
  }
  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => (a.date < b.date ? -1 : 1))
  }
  return map
}

function buildProviderStats(providers, trainees, events) {
  const byTrainee = groupEventsByTrainee(events)
  return providers.map((p) => {
    const own = trainees.filter((t) => t.provider_id === p.id)
    const placed = own.filter((t) => (byTrainee[t.id] || []).some((e) => e.what_happened === 'placed'))

    const retentionAt = (offset) => {
      let eligible = 0
      let retained = 0
      for (const t of placed) {
        const evs = byTrainee[t.id] || []
        const placement = evs.find((e) => e.what_happened === 'placed')
        if (!placement) continue
        const due = addDays(placement.date, offset)
        if (daysBetween(due, AS_OF) < 0) continue // checkpoint not reached yet
        eligible++
        const survived = evs.some(
          (e) =>
            e.what_happened === 'still_working' &&
            e.employer === placement.employer &&
            daysBetween(placement.date, e.date) >= offset - 15,
        )
        if (survived) retained++
      }
      return eligible ? Math.round((retained / eligible) * 100) : null
    }

    // "Verified placement" = placement backed by high-trust evidence AND
    // surviving the 3-month rule.
    const verified = own.filter((t) => {
      const evs = byTrainee[t.id] || []
      const placement = evs.find((e) => e.what_happened === 'placed')
      if (!placement) return false
      return evs.some(
        (e) =>
          e.what_happened === 'still_working' &&
          e.employer === placement.employer &&
          daysBetween(placement.date, e.date) >= 75 &&
          (e.trust_level === 'high' || e.trust_level === 'medium'),
      )
    })

    return {
      id: p.id,
      name: p.name,
      district: p.district,
      certified_count: own.length,
      verified_placement_pct: own.length ? Math.round((verified.length / own.length) * 100) : 0,
      retention_3mo: retentionAt(90),
      retention_6mo: retentionAt(180),
      retention_12mo: retentionAt(365),
    }
  })
}

export function buildDataset() {
  const trainees = organizedData.trainees || []
  const events = organizedData.events || []
  const providers = buildProviderStats(organizedData.providers || [], trainees, events)
  const disputes = organizedData.disputes || []
  const consents = organizedData.consents || []
  const followupQueue = organizedData.followupQueue || []
  const bankMonths = organizedData.bank_months || []

  return { providers, trainees, events, disputes, consents, followupQueue, bank_months: bankMonths }
}
