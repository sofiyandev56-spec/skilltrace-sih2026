/**
 * Local implementation of the SkillTrace API surface.
 *
 * Everything here is computed from the store, not hardcoded — so filters
 * really filter, and withdrawing consent really removes a person's outcomes
 * from every number on the dashboard.
 */
import {
  AS_OF,
  BANK_MONTHS,
  COHORTS,
  COURSES,
  DISTRICTS,
  FIELD_OFFICERS,
  daysBetween,
} from './dataset.js'
import { QUESTION_BY_ID, REVIEW_QUESTIONS, asFive, meanScore } from '../../lib/review.js'
import * as store from './store.js'

/* ------------------------------------------------------------------ */
/* outcome classification                                              */
/* ------------------------------------------------------------------ */

/** Consecutive months of salary credits that satisfy the 3-month rule. */
const BANK_RUN_MONTHS = 3

/**
 * The second, independent way to satisfy the 3-month rule: an unbroken run of
 * salary credits starting at or after the month of placement. Three months of
 * money arriving is the same fact a `still_working` confirmation asserts, from
 * a source that cannot be talked up.
 *
 * Returns null when the trainee has no bank record at all. That is missing
 * evidence, not a failed outcome, and the two must never be conflated — 13.6%
 * of placed trainees are unbanked and can never be proven this way.
 */
export function bankContinuity(trainee, placement) {
  const series = trainee?.bank_series
  if (!trainee?.bank_summary?.verified || !Array.isArray(series) || !placement?.date) return null

  const from = BANK_MONTHS.indexOf(String(placement.date).slice(0, 7))
  if (from < 0) return null

  let run = 0
  let startedAt = null
  for (let i = from; i < series.length; i += 1) {
    const credited = typeof series[i] === 'number' && series[i] > 0
    if (!credited) {
      run = 0
      startedAt = null
      continue
    }
    if (run === 0) startedAt = i
    run += 1
    if (run >= BANK_RUN_MONTHS) {
      return {
        months: run,
        from: BANK_MONTHS[startedAt],
        through: BANK_MONTHS[i],
        latest_income: trainee.bank_summary.latest_income,
      }
    }
  }
  return null
}

/**
 * THE rule: a placement only becomes "employed" once we have evidence the
 * person was still at the SAME employer 3+ months later. A bare `placed`
 * event is reported as "awaiting 3-month confirmation", never as employment.
 *
 * Two things can supply that evidence, and the result records which one did:
 * a `still_working` confirmation ('confirmation'), or an unbroken run of
 * salary credits in the bank extract ('bank'). The bank path is only ever
 * consulted when a confirmation is absent, so it adds proof and never
 * overrides a human one.
 */
export function classify(events, trainee = null) {
  if (!events || events.length === 0) {
    return { bucket: 'no_data', trust: 'stale', event: null, proof: null }
  }
  const last = events[events.length - 1]

  if (last.what_happened === 'still_working') {
    const placement = [...events]
      .reverse()
      .find((e) => e.what_happened === 'placed' && e.employer === last.employer)
    if (placement && daysBetween(placement.date, last.date) >= 75) {
      return {
        bucket: 'employed',
        trust: last.trust_level,
        event: last,
        placement,
        proof: 'confirmation',
      }
    }
    // The confirmation was too soon to count, but the money may still say so.
    const bank = bankContinuity(trainee, placement)
    if (bank) {
      return { bucket: 'employed', trust: 'high', event: last, placement, proof: 'bank', bank }
    }
    return {
      bucket: 'awaiting_confirmation',
      trust: last.trust_level,
      event: last,
      placement,
      proof: null,
    }
  }

  if (last.what_happened === 'placed') {
    const bank = bankContinuity(trainee, last)
    if (bank) {
      return {
        bucket: 'employed',
        trust: 'high',
        event: last,
        placement: last,
        proof: 'bank',
        bank,
      }
    }
    return {
      bucket: 'awaiting_confirmation',
      trust: last.trust_level,
      event: last,
      placement: last,
      proof: null,
    }
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
    const c = classify(data.eventsByTrainee[t.id], t)
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
  const wageTiers = emptyTiers()
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
          if (d >= b.min && d <= b.max) {
            salaries.push(e.salary)
            wageTiers[e.trust_level] += 1
          }
        }
      }
      row[c] = salaries.length
        ? Math.round(salaries.reduce((s, v) => s + v, 0) / salaries.length)
        : null
    }
    return row
  })

  /* --- the drop-off funnel, certification through to role-matched work --- */
  let contacted = 0
  let retained3 = 0
  let roleMatched = 0
  for (const t of cohort) {
    const evs = data.eventsByTrainee[t.id] || []
    // "Contacted" means the trainee themselves answered — a bank or employer
    // signal is evidence about them, not contact with them.
    if (evs.some((e) => e.source === 'trainee' || e.source === 'field_officer')) contacted += 1
    const c = classify(evs, t)
    if (c.bucket === 'employed') {
      retained3 += 1
      const def = COURSES.find((x) => x.name === t.course)
      if (def && c.event?.job_role === def.intended_role) roleMatched += 1
    }
  }

  const funnel = [
    { stage: 'Certified', count: total, note: 'Completed training and assessed' },
    { stage: 'Contacted', count: contacted, note: 'Responded to at least one check-in' },
    { stage: 'Employed', count: everPlaced, note: 'Reported a placement' },
    { stage: 'Retained 3 months', count: retained3, note: 'Same employer 3+ months on' },
    { stage: 'Role-matched', count: roleMatched, note: 'Working in the trained occupation' },
  ].map((s) => ({ ...s, pct: total ? Math.round((s.count / total) * 1000) / 10 : 0 }))

  return {
    as_of: AS_OF,
    filters_applied: filters,
    total_trainees: total,
    headline_placement_pct,
    headline_placement_count: everPlaced,
    outcomes,
    retention,
    funnel,
    wage_progression,
    wage_evidence: tierPercentages(wageTiers),
    cohorts_present: cohortsPresent,
    evidence_totals: tierPercentages(overallTiers),
    event_count: data.events.length,
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
      let roleMatched = 0
      let placedEver = 0
      let stale = 0
      for (const t of own) {
        const evs = data.eventsByTrainee[t.id] || []
        if (evs.some((e) => e.what_happened === 'placed')) placedEver += 1
        const c = classify(evs, t)
        if (c.trust === 'stale') stale += 1
        if (c.bucket === 'employed') {
          verified += 1
          tiers[c.trust] += 1
          const def = COURSES.find((x) => x.name === t.course)
          if (def && c.event?.job_role === def.intended_role) roleMatched += 1
        }
      }

      const share = (n) => (own.length ? Math.round((n / own.length) * 100) : 0)
      const reported = share(placedEver)
      const verifiedPct = share(verified)

      return {
        id: p.id,
        name: p.name,
        district: p.district,
        certified_count: own.length,
        headline_placement_pct: reported,
        verified_placement_pct: verifiedPct,
        // The distance a centre's reported success falls when the 3-month rule
        // is applied. This is the column that ranks centres honestly.
        proof_gap: reported - verifiedPct,
        role_match_pct: share(roleMatched),
        stale_pct: share(stale),
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

  const gapTiers = emptyTiers()
  const courses = COURSES.map((def) => {
    const own = cohort.filter((t) => t.course === def.name)
    let working = 0
    let onRole = 0
    for (const t of own) {
      const c = classify(data.eventsByTrainee[t.id], t)
      if (!['employed', 'awaiting_confirmation', 'apprentice', 'self_employed'].includes(c.bucket)) continue
      working += 1
      gapTiers[c.trust] += 1
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

  return { courses, districts, evidence: tierPercentages(gapTiers) }
}

/* ------------------------------------------------------------------ */
/* other endpoints                                                     */
/* ------------------------------------------------------------------ */

/** Attaches the full officer record so the table can render it directly. */
function withOfficer(d) {
  const officer = d.assigned_officer_id
    ? FIELD_OFFICERS.find((o) => o.id === d.assigned_officer_id) || null
    : null
  return { ...d, officer }
}

export function getDisputes() {
  return store.currentData().disputes.map(withOfficer)
}

export function getFieldOfficers() {
  // Live case load = seeded backlog + anything assigned during this session.
  const assigned = store.currentData().disputes.filter((d) => d.assigned_officer_id)
  return FIELD_OFFICERS.map((o) => ({
    ...o,
    active_cases: o.open_cases + assigned.filter((d) => d.assigned_officer_id === o.id).length,
  }))
}

/**
 * Assign, reassign, or (with a null officer) unassign a field officer on a
 * disputed record. Assignment does not resolve the dispute — it records who is
 * going out to establish the facts.
 */
export function assignFieldOfficer(disputeId, body = {}) {
  const officerId = body.officer_id ?? null
  store.assignFieldOfficer(disputeId, {
    assigned_officer_id: officerId,
    assigned_at: officerId ? new Date().toISOString().slice(0, 10) : null,
    assigned_by: body.assigned_by ?? 'Government officer (demo)',
    assignment_note: body.note ?? '',
  })
  const updated = store.currentData().disputes.find((d) => d.id === disputeId)
  return { ok: true, dispute: updated ? withOfficer(updated) : null }
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

export function getFollowupQueue(filters = {}) {
  let list = store.currentData().followupQueue || []
  if (filters?.district) {
    list = list.filter((r) => r.district === filters.district)
  }
  return list
}

export function submitRequest(body = {}) {
  const raw = store.rawData()
  const trainee = raw.trainees.find((t) => t.id === body.trainee_id)
  const req = {
    trainee_id: body.trainee_id,
    name: trainee?.name ?? 'Trainee',
    phone: trainee?.phone ?? '+91 98000 00000',
    course: trainee?.course ?? 'NSQF Course',
    district: trainee?.district ?? 'Thane',
    provider_id: trainee?.provider_id ?? 'PRV-001',
    cohort: trainee?.cohort ?? '2025-Q3',
    attempts: 0,
    last_contact_date: new Date().toISOString().slice(0, 10),
    channel: `Trainee Request: ${body.request_type || 'General Assistance'}`,
    assigned_to: null,
    assigned_at: null,
    request_id: `REQ-${Date.now()}`,
    description: body.description || null,
  }
  const current = store.currentData()
  if (current.followupQueue) {
    current.followupQueue.unshift(req)
  }
  return { ok: true, status: 'success', request: req }
}

export function assignFollowup(traineeId, officer) {
  store.assignOfficer(traineeId, officer)
  return store.currentData().followupQueue.find((f) => f.trainee_id === traineeId)
}

export function getTrainees(filters = {}) {
  const data = store.currentData()
  return applyFilters(data.trainees, filters).map((t) => {
    const c = classify(data.eventsByTrainee[t.id], t)
    return { ...t, outcome: c.bucket, trust_level: c.trust, employer: c.event?.employer ?? null }
  })
}

export function getTrainee(id) {
  const data = store.currentData()
  const t = data.trainees.find((x) => x.id === id) || store.rawData().trainees.find((x) => x.id === id)
  if (!t) return null
  const events = data.eventsByTrainee[t.id] || []
  // bank_months travels with the record so the client can label the series
  // without importing the mock dataset.
  return { ...t, events, bank_months: BANK_MONTHS, ...classify(events, t) }
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
      outcome: classify(events, trainee).bucket,
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

/* ---- post-training review ---- */

export function getReview(traineeId) {
  const data = store.currentData()
  const review = data.reviews.find((r) => r.trainee_id === traineeId) || null
  return { trainee_id: traineeId, completed: Boolean(review), review }
}

export function submitReview(body = {}) {
  const raw = store.rawData()
  const trainee = raw.trainees.find((t) => t.id === body.trainee_id)
  const review = {
    id: `REV-LIVE-${body.trainee_id}`,
    trainee_id: body.trainee_id,
    provider_id: trainee?.provider_id ?? body.provider_id ?? null,
    course: trainee?.course ?? body.course ?? null,
    cohort: trainee?.cohort ?? null,
    district: trainee?.district ?? null,
    answers: body.answers || {},
    comment: body.comment || null,
    submitted_at: new Date().toISOString().slice(0, 10),
  }
  store.saveReview(review)
  return { ok: true, review }
}

/**
 * Aggregate feedback for the government view.
 *
 * Individual responses are never returned — only counts and means. A trainee
 * answering honestly about their trainer should not be identifiable from the
 * oversight screen.
 */
export function getReviewInsights(filters = {}) {
  const data = store.currentData()
  const cohort = applyFilters(data.trainees, filters)
  const ids = new Set(cohort.map((t) => t.id))
  const reviews = data.reviews.filter((r) => ids.has(r.trainee_id))

  const questions = REVIEW_QUESTIONS.map((q) => {
    const values = reviews.map((r) => r.answers[q.id]).filter(Boolean)
    const counts = Object.fromEntries(
      q.options.map((o) => [o.value, values.filter((v) => v === o.value).length]),
    )
    const mean = meanScore(values, q.id)
    return {
      id: q.id,
      labelKey: q.shortLabelKey,
      promptKey: q.promptKey,
      responses: values.length,
      mean,
      out_of_five: asFive(mean),
      distribution: q.options.map((o) => ({
        value: o.value,
        labelKey: o.labelKey,
        count: counts[o.value],
        pct: values.length ? Math.round((counts[o.value] / values.length) * 100) : 0,
      })),
    }
  })

  const recommend = reviews.map((r) => r.answers.recommend).filter(Boolean)
  const wouldRecommend = recommend.filter((v) => v === 'definitely' || v === 'probably').length

  // Per-centre averages, so a weak provider is visible rather than averaged away.
  const byProvider = {}
  for (const r of reviews) (byProvider[r.provider_id] ||= []).push(r)
  const providers = store
    .rawData()
    .providers.filter((p) => byProvider[p.id]?.length >= 3)
    .map((p) => {
      const own = byProvider[p.id]
      const mean = meanScore(own.map((r) => r.answers.overall_quality), 'overall_quality')
      return {
        id: p.id,
        name: p.name,
        district: p.district,
        responses: own.length,
        mean,
        out_of_five: asFive(mean),
      }
    })
    .sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))

  return {
    responses: reviews.length,
    eligible: cohort.length,
    response_rate: cohort.length ? Math.round((reviews.length / cohort.length) * 100) : 0,
    recommend_rate: recommend.length ? Math.round((wouldRecommend / recommend.length) * 100) : null,
    questions,
    providers,
  }
}

export function resetAll() {
  store.resetStore()
  return { ok: true }
}

/* ------------------------------------------------------------------ */
/* GET /audit — the append-only event ledger                           */
/* ------------------------------------------------------------------ */

const EVENT_LABEL = {
  placed: 'Placement reported',
  still_working: 'Still working confirmed',
  left_job: 'Left the job',
  self_employed: 'Self-employment reported',
  apprentice: 'Apprenticeship reported',
  not_working: 'Not working reported',
}

const SOURCE_LABEL = {
  bank: 'Consent-based income signal',
  employer: 'Employer confirmation',
  trainee: 'Trainee check-in',
  field_officer: 'Field officer visit',
}

/**
 * Every outcome on this platform is derived from dated events, and events are
 * never rewritten. This returns them newest-first so an officer can trace a
 * headline figure back to the individual records that produced it.
 */
export function getAuditLog(filters = {}) {
  const data = store.currentData()
  const cohort = applyFilters(data.trainees, filters)
  const ids = new Set(cohort.map((t) => t.id))
  const byId = Object.fromEntries(cohort.map((t) => [t.id, t]))
  const withdrawn = new Set(
    data.consents.filter((c) => c.status === 'withdrawn').map((c) => c.trainee_id),
  )

  const rows = data.events
    .filter((e) => ids.has(e.trainee_id))
    .map((e) => ({
      id: e.id,
      date: e.date,
      trainee_id: e.trainee_id,
      trainee_name: byId[e.trainee_id]?.name ?? null,
      event_type: EVENT_LABEL[e.what_happened] || e.what_happened,
      what_happened: e.what_happened,
      source: SOURCE_LABEL[e.source] || e.source,
      source_key: e.source,
      trust_level: e.trust_level,
      employer: e.employer ?? null,
      job_role: e.job_role ?? null,
      salary: e.salary ?? null,
      consent_status: withdrawn.has(e.trainee_id) ? 'withdrawn' : 'active',
      // A placement alone never moves the employment figure — only a
      // still_working event 3+ months on does.
      outcome_impact:
        e.what_happened === 'still_working'
          ? 'Counted towards verified employment'
          : e.what_happened === 'placed'
            ? 'Recorded, awaiting 3-month confirmation'
            : 'Recorded against the trainee timeline',
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  const limit = filters.limit || 150
  return {
    total: rows.length,
    showing: Math.min(limit, rows.length),
    events: rows.slice(0, limit),
    as_of: AS_OF,
  }
}

/* ------------------------------------------------------------------ */
/* GET /providers/:id — single training centre, in depth               */
/* ------------------------------------------------------------------ */

export function getProvider(id, filters = {}) {
  const data = store.currentData()
  const raw = store.rawData()
  const provider = raw.providers.find((p) => p.id === id)
  if (!provider) return null

  const cohort = applyFilters(data.trainees, filters).filter((t) => t.provider_id === id)
  const total = cohort.length

  const tiers = emptyTiers()
  let employed = 0
  let placedEver = 0
  let roleMatched = 0
  let stale = 0

  const byCourse = {}

  for (const t of cohort) {
    const evs = data.eventsByTrainee[t.id] || []
    const c = classify(evs, t)
    const def = COURSES.find((x) => x.name === t.course)
    const slot = (byCourse[t.course] ||= {
      course: t.course,
      intended_role: def?.intended_role ?? null,
      certified: 0,
      employed: 0,
      role_matched: 0,
      tiers: emptyTiers(),
    })
    slot.certified += 1

    if (evs.some((e) => e.what_happened === 'placed')) placedEver += 1
    if (c.bucket === 'employed') {
      employed += 1
      tiers[c.trust] += 1
      slot.employed += 1
      slot.tiers[c.trust] += 1
      if (def && c.event?.job_role === def.intended_role) {
        roleMatched += 1
        slot.role_matched += 1
      }
    }
    if (c.trust === 'stale') stale += 1
  }

  const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0)

  // A centre's confidence score is how much of its own reported success is
  // backed by evidence it did not produce itself.
  const evidence = tierPercentages(tiers)
  const confidence = Math.round(
    (evidence.high || 0) * 1.0 + (evidence.medium || 0) * 0.6 + (evidence.low || 0) * 0.2,
  )

  return {
    id: provider.id,
    name: provider.name,
    district: provider.district,
    status: 'Active',
    courses: [...new Set(cohort.map((t) => t.course))].sort(),
    certified_count: total,
    employment_pct: pct(employed),
    headline_placement_pct: pct(placedEver),
    verified_pct: evidence.high || 0,
    role_matched_pct: pct(roleMatched),
    stale_pct: pct(stale),
    confidence_score: Math.min(100, confidence),
    evidence,
    by_course: Object.values(byCourse)
      .map((s) => ({
        ...s,
        employment_pct: s.certified ? Math.round((s.employed / s.certified) * 1000) / 10 : 0,
        role_match_pct: s.certified ? Math.round((s.role_matched / s.certified) * 1000) / 10 : 0,
        evidence: tierPercentages(s.tiers),
      }))
      .sort((a, b) => b.certified - a.certified),
    as_of: AS_OF,
  }
}

/* ------------------------------------------------------------------ */
/* GET /attention — what an officer should actually do today           */
/* ------------------------------------------------------------------ */

/**
 * Ranked, actionable findings rather than a wall of statistics.
 *
 * Each finding names the unit at fault, quantifies it, and states the action.
 * Nothing here is derived from a single weak signal: every threshold is set so
 * a centre with a handful of trainees cannot top the list on noise alone.
 */
export function getAttention(filters = {}) {
  const data = store.currentData()
  const cohort = applyFilters(data.trainees, filters)
  const raw = store.rawData()
  const findings = []

  const byProvider = {}
  for (const t of cohort) (byProvider[t.provider_id] ||= []).push(t)

  for (const [pid, own] of Object.entries(byProvider)) {
    if (own.length < 40) continue // too small to draw a conclusion from
    const provider = raw.providers.find((p) => p.id === pid)
    if (!provider) continue

    let employed = 0
    let roleMatched = 0
    let stale = 0
    let placedEver = 0
    const tiers = emptyTiers()

    for (const t of own) {
      const evs = data.eventsByTrainee[t.id] || []
      if (evs.some((e) => e.what_happened === 'placed')) placedEver += 1
      const c = classify(evs, t)
      if (c.trust === 'stale') stale += 1
      if (c.bucket === 'employed') {
        employed += 1
        tiers[c.trust] += 1
        const def = COURSES.find((x) => x.name === t.course)
        if (def && c.event?.job_role === def.intended_role) roleMatched += 1
      }
    }

    const share = (n) => Math.round((n / own.length) * 1000) / 10
    const ev = tierPercentages(tiers)
    const placedPct = share(placedEver)
    const rolePct = share(roleMatched)
    const stalePct = share(stale)

    if (placedPct >= 50 && rolePct < placedPct * 0.15) {
      findings.push({
        id: `role-${pid}`,
        kind: 'role_mismatch',
        severity: 2,
        headline: 'High placement, low role relevance',
        unit: provider.name,
        unit_id: pid,
        district: provider.district,
        detail: `${placedPct}% of this centre's trainees report a placement, but only ${rolePct}% are working in the occupation the course trains for.`,
        action: 'Review course-to-employer alignment',
        metric: rolePct,
      })
    }

    if (stalePct >= 55) {
      findings.push({
        id: `stale-${pid}`,
        kind: 'stale',
        severity: 1,
        headline: 'Stale records above threshold',
        unit: provider.name,
        unit_id: pid,
        district: provider.district,
        detail: `${stalePct}% of this centre's trainees have produced no reliable signal in the current tracking period. Its outcome rates rest on a shrinking base.`,
        action: 'Send cohort to the follow-up queue',
        metric: stalePct,
      })
    }

    if (employed >= 10 && (ev.high || 0) < 20) {
      findings.push({
        id: `unverified-${pid}`,
        kind: 'unverified',
        severity: 3,
        headline: 'Outcomes rest on self-reporting',
        unit: provider.name,
        unit_id: pid,
        district: provider.district,
        detail: `Only ${ev.high || 0}% of this centre's employment outcomes carry independent evidence. A centre cannot be the sole source of its own score.`,
        action: 'Request employer confirmations',
        metric: ev.high || 0,
      })
    }
  }

  // Disputes are the sharpest call on an officer's time — always surface them.
  const openDisputes = data.disputes.filter((x) => x.status !== 'resolved' && !x.assigned_officer_id)
  if (openDisputes.length) {
    findings.push({
      id: 'disputes',
      kind: 'disputes',
      severity: 0,
      headline: 'Disputed records awaiting an officer',
      unit: `${openDisputes.length} record${openDisputes.length === 1 ? '' : 's'}`,
      unit_id: null,
      district: null,
      detail:
        'The employer and the trainee disagree on these outcomes. Neither claim is counted in any figure on this dashboard until an officer establishes the facts.',
      action: 'Assign a field officer',
      metric: openDisputes.length,
    })
  }

  findings.sort((a, b) => a.severity - b.severity || b.metric - a.metric)
  return { findings: findings.slice(0, 6), as_of: AS_OF }
}
