/**
 * Local implementation of the SkillTrace API surface.
 *
 * Everything here is computed from the store, not hardcoded — so filters
 * really filter, and withdrawing consent really removes a person's outcomes
 * from every number on the dashboard.
 */
import { AS_OF, COHORTS, COURSES, DISTRICTS, daysBetween } from './dataset.js'
import * as store from './store.js'

/* ------------------------------------------------------------------ */
/* outcome classification                                              */
/* ------------------------------------------------------------------ */

/**
 * THE rule: a placement only becomes "employed" once we have evidence the
 * person was still at the SAME employer 3+ months later. A bare `placed`
 * event is reported as "awaiting 3-month confirmation", never as employment.
 */
export function classify(events) {
  if (!events || events.length === 0) {
    return { bucket: 'no_data', trust: 'stale', event: null }
  }
  const last = events[events.length - 1]

  if (last.what_happened === 'still_working') {
    const placement = [...events]
      .reverse()
      .find((e) => e.what_happened === 'placed' && e.employer === last.employer)
    if (placement && daysBetween(placement.date, last.date) >= 75) {
      return { bucket: 'employed', trust: last.trust_level, event: last, placement }
    }
    return { bucket: 'awaiting_confirmation', trust: last.trust_level, event: last, placement }
  }

  if (last.what_happened === 'placed') {
    return { bucket: 'awaiting_confirmation', trust: last.trust_level, event: last, placement: last }
  }
  if (last.what_happened === 'self_employed') {
    return { bucket: 'self_employed', trust: last.trust_level, event: last }
  }
  if (last.what_happened === 'apprentice') {
    return { bucket: 'apprentice', trust: last.trust_level, event: last }
  }
  // left_job with nothing after it, or an explicit not_working
  return { bucket: 'not_working', trust: last.trust_level, event: last }
}

export const BUCKETS = [
  'employed',
  'self_employed',
  'apprentice',
  'not_working',
  'awaiting_confirmation',
  'no_data',
]

/* ------------------------------------------------------------------ */
/* filtering                                                           */
/* ------------------------------------------------------------------ */

/** `demographic` arrives as a namespaced value, e.g. "gender:Female". */
function matchesDemographic(trainee, demographic) {
  if (!demographic) return true
  const [field, value] = demographic.split(':')
  if (field === 'age_group') return trainee.age_group === value
  if (field === 'gender') return trainee.gender === value
  if (field === 'category') return trainee.category === value
  return true
}

export function applyFilters(trainees, f = {}) {
  return trainees.filter(
    (t) =>
      (!f.cohort || t.cohort === f.cohort) &&
      (!f.course || t.course === f.course) &&
      (!f.provider || t.provider_id === f.provider) &&
      (!f.district || t.district === f.district) &&
      matchesDemographic(t, f.demographic),
  )
}

const emptyTiers = () => ({ high: 0, medium: 0, low: 0, stale: 0 })

function tierPercentages(tiers) {
  const total = tiers.high + tiers.medium + tiers.low + tiers.stale
  if (!total) return { high: 0, medium: 0, low: 0, stale: 0, total: 0 }
  return {
    high: Math.round((tiers.high / total) * 100),
    medium: Math.round((tiers.medium / total) * 100),
    low: Math.round((tiers.low / total) * 100),
    stale: Math.round((tiers.stale / total) * 100),
    total,
  }
}

/* ------------------------------------------------------------------ */
/* GET /dashboard                                                      */
/* ------------------------------------------------------------------ */

export function getDashboard(filters = {}) {
  const data = store.currentData()
  const cohort = applyFilters(data.trainees, filters)
  const total = cohort.length

  /* --- outcome buckets, each with its own evidence-tier breakdown --- */
  const counts = Object.fromEntries(BUCKETS.map((b) => [b, 0]))
  const tiers = Object.fromEntries(BUCKETS.map((b) => [b, emptyTiers()]))
  const overallTiers = emptyTiers()

  for (const t of cohort) {
    const c = classify(data.eventsByTrainee[t.id])
    counts[c.bucket] += 1
    tiers[c.bucket][c.trust] += 1
    if (c.event) overallTiers[c.trust] += 1
  }

  /* --- headline vs verified: the contrast the whole project exists for --- */
  let everPlaced = 0
  for (const t of cohort) {
    if ((data.eventsByTrainee[t.id] || []).some((e) => e.what_happened === 'placed')) everPlaced += 1
  }
  const headline_placement_pct = total ? Math.round((everPlaced / total) * 1000) / 10 : 0

  const outcomes = Object.fromEntries(
    BUCKETS.map((b) => [
      b,
      {
        count: counts[b],
        pct: total ? Math.round((counts[b] / total) * 1000) / 10 : 0,
        evidence: tierPercentages(tiers[b]),
      },
    ]),
  )

  /* --- retention at 3 / 6 / 12 months --- */
  const retention = [90, 180, 365].map((offset) => {
    let eligible = 0
    let retained = 0
    const t3 = emptyTiers()
    for (const t of cohort) {
      const evs = data.eventsByTrainee[t.id] || []
      const placement = evs.find((e) => e.what_happened === 'placed')
      if (!placement) continue
      if (daysBetween(placement.date, AS_OF) < offset) continue // not due yet
      eligible += 1
      const hit = evs.find(
        (e) =>
          e.what_happened === 'still_working' &&
          e.employer === placement.employer &&
          daysBetween(placement.date, e.date) >= offset - 15,
      )
      if (hit) {
        retained += 1
        t3[hit.trust_level] += 1
      }
    }
    return {
      checkpoint: offset === 90 ? '3 months' : offset === 180 ? '6 months' : '12 months',
      months: offset === 90 ? 3 : offset === 180 ? 6 : 12,
      pct: eligible ? Math.round((retained / eligible) * 1000) / 10 : null,
      eligible,
      retained,
      evidence: tierPercentages(t3),
    }
  })

  /* --- wage progression: average salary per cohort at each checkpoint --- */
  const cohortsPresent = COHORTS.filter((c) => cohort.some((t) => t.cohort === c))
  const buckets = [
    { months: 0, min: -999, max: 45 },
    { months: 3, min: 46, max: 135 },
    { months: 6, min: 136, max: 270 },
    { months: 12, min: 271, max: 9999 },
  ]
  const wage_progression = buckets.map((b) => {
    const row = { months: b.months, label: b.months === 0 ? 'At placement' : `${b.months} mo` }
    for (const c of cohortsPresent) {
      const salaries = []
      for (const t of cohort.filter((x) => x.cohort === c)) {
        const evs = data.eventsByTrainee[t.id] || []
        const placement = evs.find((e) => e.what_happened === 'placed')
        if (!placement) continue
        for (const e of evs) {
          if (!e.salary) continue
          if (e.what_happened !== 'placed' && e.what_happened !== 'still_working') continue
          const d = daysBetween(placement.date, e.date)
          if (d >= b.min && d <= b.max) salaries.push(e.salary)
        }
      }
      row[c] = salaries.length
        ? Math.round(salaries.reduce((s, v) => s + v, 0) / salaries.length)
        : null
    }
    return row
  })

  return {
    as_of: AS_OF,
    filters_applied: filters,
    total_trainees: total,
    headline_placement_pct,
    headline_placement_count: everPlaced,
    outcomes,
    retention,
    wage_progression,
    cohorts_present: cohortsPresent,
    evidence_totals: tierPercentages(overallTiers),
    consent: data.consentTotals,
  }
}

/* ------------------------------------------------------------------ */
/* GET /providers                                                      */
/* ------------------------------------------------------------------ */

export function getProviders(filters = {}) {
  const data = store.currentData()
  const cohort = applyFilters(data.trainees, filters)
  const byProvider = {}
  for (const t of cohort) (byProvider[t.provider_id] ||= []).push(t)

  return store
    .rawData()
    .providers.filter((p) => byProvider[p.id]?.length)
    .map((p) => {
      const own = byProvider[p.id]
      const retentionAt = (offset) => {
        let eligible = 0
        let retained = 0
        for (const t of own) {
          const evs = data.eventsByTrainee[t.id] || []
          const placement = evs.find((e) => e.what_happened === 'placed')
          if (!placement) continue
          if (daysBetween(placement.date, AS_OF) < offset) continue
          eligible += 1
          if (
            evs.some(
              (e) =>
                e.what_happened === 'still_working' &&
                e.employer === placement.employer &&
                daysBetween(placement.date, e.date) >= offset - 15,
            )
          )
            retained += 1
        }
        return eligible ? Math.round((retained / eligible) * 100) : null
      }

      const tiers = emptyTiers()
      let verified = 0
      for (const t of own) {
        const c = classify(data.eventsByTrainee[t.id])
        if (c.bucket === 'employed') {
          verified += 1
          tiers[c.trust] += 1
        }
      }

      return {
        id: p.id,
        name: p.name,
        district: p.district,
        certified_count: own.length,
        verified_placement_pct: own.length ? Math.round((verified / own.length) * 100) : 0,
        retention_3mo: retentionAt(90),
        retention_6mo: retentionAt(180),
        retention_12mo: retentionAt(365),
        evidence: tierPercentages(tiers),
      }
    })
}

/* ------------------------------------------------------------------ */
/* GET /skill-gap                                                      */
/* ------------------------------------------------------------------ */

export function getSkillGap(filters = {}) {
  const data = store.currentData()
  const cohort = applyFilters(data.trainees, filters)

  const courses = COURSES.map((def) => {
    const own = cohort.filter((t) => t.course === def.name)
    let working = 0
    let onRole = 0
    for (const t of own) {
      const c = classify(data.eventsByTrainee[t.id])
      if (!['employed', 'awaiting_confirmation', 'apprentice', 'self_employed'].includes(c.bucket)) continue
      working += 1
      const role = c.event?.job_role || ''
      if (role === def.intended_role || role === `Apprentice — ${def.intended_role}` || role === `Self-employed — ${def.intended_role}`) {
        onRole += 1
      }
    }
    const actual_pct = own.length ? Math.round((onRole / own.length) * 100) : 0
    return {
      course: def.name,
      intended_role: def.intended_role,
      intended_pct: def.target_pct,
      actual_pct,
      mismatch: Math.max(0, def.target_pct - actual_pct),
      trainees: own.length,
      working,
    }
  }).filter((c) => c.trainees > 0)

  const districts = DISTRICTS.map((d) => {
    const own = cohort.filter((t) => t.district === d)
    if (!own.length) return { district: d, mismatch: null, trainees: 0, top_gap_course: null }
    let weighted = 0
    let worst = null
    for (const def of COURSES) {
      const inDistrict = own.filter((t) => t.course === def.name)
      if (!inDistrict.length) continue
      const c = courses.find((x) => x.course === def.name)
      const localMismatch = c ? c.mismatch : 0
      weighted += localMismatch * inDistrict.length
      if (!worst || localMismatch > worst.mismatch) worst = { course: def.name, mismatch: localMismatch }
    }
    return {
      district: d,
      mismatch: Math.round(weighted / own.length),
      trainees: own.length,
      top_gap_course: worst?.course ?? null,
    }
  })

  return { courses, districts }
}

/* ------------------------------------------------------------------ */
/* other endpoints                                                     */
/* ------------------------------------------------------------------ */

export function getDisputes() {
  return store.currentData().disputes
}

export function resolveDispute(id, body = {}) {
  store.resolveDispute(id, {
    status: 'resolved',
    resolution: body.resolution ?? 'accepted_employer',
    note: body.note ?? '',
    resolved_at: new Date().toISOString().slice(0, 10),
    resolved_by: body.resolved_by ?? 'Reviewer (demo)',
  })
  return store.currentData().disputes.find((d) => d.id === id)
}

export function getFollowupQueue() {
  return store.currentData().followupQueue
}

export function assignFollowup(traineeId, officer) {
  store.assignOfficer(traineeId, officer)
  return store.currentData().followupQueue.find((f) => f.trainee_id === traineeId)
}

export function getTrainees(filters = {}) {
  const data = store.currentData()
  return applyFilters(data.trainees, filters).map((t) => {
    const c = classify(data.eventsByTrainee[t.id])
    return { ...t, outcome: c.bucket, trust_level: c.trust, employer: c.event?.employer ?? null }
  })
}

export function getTrainee(id) {
  const data = store.currentData()
  const t = data.trainees.find((x) => x.id === id) || store.rawData().trainees.find((x) => x.id === id)
  if (!t) return null
  const events = data.eventsByTrainee[t.id] || []
  return { ...t, events, ...classify(events) }
}

/* ---- consent ---- */

export function getConsent(traineeId) {
  const raw = store.rawData()
  const data = store.currentData()
  const trainee = raw.trainees.find((t) => t.id === traineeId)
  if (!trainee) return null
  const consent = data.consents.find((c) => c.trainee_id === traineeId)
  const provider = raw.providers.find((p) => p.id === trainee.provider_id)
  const events = raw.events.filter((e) => e.trainee_id === traineeId)
  return {
    ...consent,
    trainee: { ...trainee, provider_name: provider?.name ?? null },
    // What withdrawal will actually remove — shown on the page before you click.
    impact: {
      events: events.length,
      outcome: classify(events).bucket,
      disputes: raw.disputes.filter((d) => d.trainee_id === traineeId).length,
      district: trainee.district,
      course: trainee.course,
    },
  }
}

export function listConsents() {
  const raw = store.rawData()
  const data = store.currentData()
  return data.consents.map((c) => {
    const t = raw.trainees.find((x) => x.id === c.trainee_id)
    return { ...c, name: t?.name, course: t?.course, district: t?.district }
  })
}

export function withdrawConsent(consentId) {
  const data = store.currentData()
  const consent = data.consents.find((c) => c.id === consentId || c.trainee_id === consentId)
  if (!consent) return { ok: false, error: 'not_found' }
  store.withdrawConsent(consent.trainee_id, new Date().toISOString().slice(0, 10))
  return { ok: true, consent_id: consent.id, trainee_id: consent.trainee_id, status: 'withdrawn' }
}

export function grantConsent(body = {}) {
  const id = body.trainee_id || body.id
  store.grantConsent(id)
  return { ok: true, trainee_id: id, status: 'granted' }
}

/* ---- check-in ---- */

const WHAT_BY_ANSWER = {
  employed: 'still_working',
  self_employed: 'self_employed',
  apprentice: 'apprentice',
  not_working: 'not_working',
}

export function postCheckin(body = {}) {
  const raw = store.rawData()
  const trainee = raw.trainees.find((t) => t.id === body.trainee_id)
  const prior = raw.events.filter((e) => e.trainee_id === body.trainee_id)
  const placement = [...prior].reverse().find((e) => e.what_happened === 'placed')
  const source = body.source || 'trainee'
  const date = new Date().toISOString().slice(0, 10)

  const event = store.addEvent({
    trainee_id: body.trainee_id,
    date,
    what_happened: WHAT_BY_ANSWER[body.answer] || body.what_happened || 'not_working',
    job_role: body.job_role ?? placement?.job_role ?? null,
    salary: body.salary ?? null,
    source,
    trust_level: source === 'employer' || source === 'bank' ? 'high' : source === 'field_officer' ? 'medium' : 'low',
    employer: body.employer ?? placement?.employer ?? null,
  })

  return { ok: true, event, trainee: trainee ? { id: trainee.id, name: trainee.name } : null }
}

export function resetAll() {
  store.resetStore()
  return { ok: true }
}
