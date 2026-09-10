/**
 * Deterministic mock dataset for SkillTrace.
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

import { REVIEW_QUESTIONS } from '../../lib/review.js'
import { organizedData } from './data/organized_data.js'

export const AS_OF = organizedData.as_of ?? '2026-09-10'

export const DISTRICTS = organizedData.districts

/**
 * Calendar months covered by the bank statement extract, oldest first, as
 * 'YYYY-MM'. Each trainee's `bank_series` is indexed against this.
 */
export const BANK_MONTHS = organizedData.bank_months ?? []

/** Each course trains for one intended job role, with a planned placement target. */
export const COURSES = organizedData.courses

/** Roles trainees actually drift into when the placement misses its intended role. */
const DRIFT_ROLES = [
  'Helper / Unskilled', 'Delivery Partner', 'Security Guard', 'Retail Cashier',
  'Machine Operator', 'Site Supervisor', 'Office Assistant', 'Driver',
]

export const COHORTS = [
  '2024-Q3', '2024-Q4', '2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4', '2026-Q1', '2026-Q2',
]

export const AGE_GROUPS = ['18-24', '25-34', '35-44']
export const GENDERS = ['Male', 'Female', 'Other']
export const CATEGORIES = ['General', 'OBC', 'SC', 'ST']

const PROVIDER_NAMES = [
  'Sahyadri Skill Academy', 'Godavari ITI Centre', 'Vidarbha Technical Institute',
  'Deccan Vocational Centre', 'Bhima Skill Hub', 'Panchganga Training Institute',
  'Amravati Polytechnic Extension', 'Manjara Skill Centre',
  'Tapi Valley Training Centre', 'Konkan Coast Skill Institute',
  'Pune Metro Skill Campus', 'Nashik Industrial Training Wing',
]

const EMPLOYERS = [
  'Bharat Electricals Pvt Ltd', 'Sunrise Garments', 'GreenVolt Solar Solutions',
  'Metro Retail Mart', 'Datawing Services', 'Shakti Fabrication Works',
  'Precision Tools India', 'Aarogya Healthcare Group', 'Sahyadri Logistics',
  'Nirmal Engineering Co.', 'Vertex Industrial Supplies', 'Sanjeevani Hospital',
]

/**
 * Field officers available for assignment to a disputed record. A dispute that
 * cannot be settled from the paper trail is escalated to one of these officers
 * for an in-person visit — the "assisted follow-up" the programme guarantees.
 */
export const FIELD_OFFICERS = [
  { id: 'FO-101', name: 'Rajesh Patel', designation: 'Senior Field Officer', division: 'Pune', open_cases: 3 },
  { id: 'FO-102', name: 'Sunita Kulkarni', designation: 'Field Officer', division: 'Nashik', open_cases: 1 },
  { id: 'FO-103', name: 'Arun Jadhav', designation: 'Field Officer', division: 'Nagpur', open_cases: 4 },
  { id: 'FO-104', name: 'Meena Pawar', designation: 'Senior Field Officer', division: 'Latur', open_cases: 2 },
  { id: 'FO-105', name: 'Vikram Deshmukh', designation: 'District Verification Officer', division: 'Thane', open_cases: 0 },
  { id: 'FO-106', name: 'Asha Salunkhe', designation: 'Field Officer', division: 'Kolhapur', open_cases: 2 },
]

const FIRST_NAMES = [
  'Aarti', 'Rahul', 'Priya', 'Suresh', 'Kavita', 'Amit', 'Sunita', 'Vikram',
  'Meena', 'Rajesh', 'Pooja', 'Sandeep', 'Anjali', 'Ganesh', 'Sneha', 'Nitin',
  'Rekha', 'Prakash', 'Manisha', 'Deepak', 'Shalini', 'Ravi', 'Jyoti', 'Mahesh',
  'Neha', 'Santosh', 'Asha', 'Kiran', 'Vaishali', 'Ajay',
]
const LAST_NAMES = [
  'Patil', 'Deshmukh', 'Kulkarni', 'Jadhav', 'Shinde', 'More', 'Pawar', 'Sawant',
  'Bhosale', 'Gaikwad', 'Chavan', 'Kadam', 'Salunkhe', 'Mane', 'Thorat',
]

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]

/** Weighted pick: entries is [[value, weight], ...] */
function weighted(rng, entries) {
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rng() * total
  for (const [value, w] of entries) {
    r -= w
    if (r <= 0) return value
  }
  return entries[entries.length - 1][0]
}

const iso = (d) => d.toISOString().slice(0, 10)
const addDays = (dateStr, days) => {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return iso(d)
}
export const daysBetween = (a, b) =>
  Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000)

/** Last day of the quarter a cohort label refers to — i.e. when training ended. */
function cohortEndDate(cohort) {
  const [year, q] = cohort.split('-')
  const endings = { Q1: '03-31', Q2: '06-30', Q3: '09-30', Q4: '12-31' }
  return `${year}-${endings[q]}`
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
function trustFor(source, date) {
  if (daysBetween(date, AS_OF) > 275) return 'stale'
  if (source === 'bank') return 'high'
  if (source === 'employer') return 'high'
  if (source === 'field_officer') return 'medium'
  return 'low'
}

/* ------------------------------------------------------------------ */
/* generation                                                          */
/* ------------------------------------------------------------------ */

function buildProviders(rng) {
  return PROVIDER_NAMES.map((name, i) => ({
    id: `PRV-${String(i + 1).padStart(3, '0')}`,
    name,
    district: DISTRICTS[i % DISTRICTS.length],
    // quality multiplier drives how well this centre's trainees actually do
    _quality: 0.55 + rng() * 0.45,
  }))
}

function buildTrainees(rng, providers) {
  const trainees = []
  const TOTAL = 420
  for (let i = 0; i < TOTAL; i++) {
    const provider = providers[Math.floor(rng() * providers.length)]
    const course = pick(rng, COURSES)
    trainees.push({
      id: `TRN-${String(i + 1).padStart(4, '0')}`,
      name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      course: course.name,
      district: provider.district,
      gender: weighted(rng, [['Male', 52], ['Female', 46], ['Other', 2]]),
      age_group: weighted(rng, [['18-24', 50], ['25-34', 35], ['35-44', 15]]),
      // --- additions beyond the base schema ---
      category: weighted(rng, [['General', 30], ['OBC', 36], ['SC', 22], ['ST', 12]]),
      cohort: pick(rng, COHORTS),
      provider_id: provider.id,
      phone: `+91 9${Math.floor(rng() * 900000000 + 100000000)}`,
    })
  }
  return trainees
}

/**
 * Build the event trail for one trainee. This is where the "3+ months at the
 * same place" rule is actually encoded: a `placed` event on its own never
 * counts as employment — only a later `still_working` event at the same
 * employer, 90+ days after placement, does.
 */
function buildEventsFor(trainee, provider, rng, seq) {
  const events = []
  const endDate = cohortEndDate(trainee.cohort)
  const ageMonths = cohortAgeMonths(trainee.cohort)
  const q = provider._quality

  const push = (date, what_happened, extra = {}) => {
    const source = extra.source || 'trainee'
    events.push({
      id: `EVT-${String(seq.n++).padStart(5, '0')}`,
      trainee_id: trainee.id,
      date,
      what_happened,
      job_role: extra.job_role ?? null,
      salary: extra.salary ?? null,
      source,
      trust_level: trustFor(source, date),
      employer: extra.employer ?? null, // addition — see file header
    })
  }

  // Which track did this trainee land on after the course?
  const track = weighted(rng, [
    ['placed', 70 * q + 20],
    ['self_employed', 13],
    ['apprentice', 9],
    ['not_working', 16 - 8 * q],
    ['silent', 11 - 5 * q], // never responded to anything
  ])

  if (track === 'silent') return events

  const courseDef = COURSES.find((c) => c.name === trainee.course)

  if (track === 'self_employed') {
    const d = addDays(endDate, 30 + Math.floor(rng() * 90))
    if (daysBetween(d, AS_OF) < 0) return events
    const baseIncome = 7000 + Math.floor(rng() * 9000)
    push(d, 'self_employed', {
      job_role: `Self-employed — ${courseDef.intended_role}`,
      salary: baseIncome,
      source: weighted(rng, [['bank', 34], ['trainee', 48], ['field_officer', 18]]),
    })
    // Periodic re-confirmation, so evidence does not automatically go stale.
    for (const offset of [180, 365]) {
      const later = addDays(d, offset)
      if (daysBetween(later, AS_OF) < 0) break
      if (rng() > 0.66) break // some go quiet and legitimately turn stale
      push(later, 'self_employed', {
        job_role: `Self-employed — ${courseDef.intended_role}`,
        salary: Math.round(baseIncome * (1 + rng() * 0.22)),
        source: weighted(rng, [['bank', 40], ['trainee', 38], ['field_officer', 22]]),
      })
    }
    return events
  }

  if (track === 'apprentice') {
    const d = addDays(endDate, 20 + Math.floor(rng() * 60))
    if (daysBetween(d, AS_OF) < 0) return events
    const host = pick(rng, EMPLOYERS)
    const stipend = 6000 + Math.floor(rng() * 5000)
    push(d, 'apprentice', {
      job_role: `Apprentice — ${courseDef.intended_role}`,
      salary: stipend,
      employer: host,
      source: weighted(rng, [['employer', 40], ['trainee', 44], ['field_officer', 16]]),
    })
    for (const offset of [180, 365]) {
      const later = addDays(d, offset)
      if (daysBetween(later, AS_OF) < 0) break
      if (rng() > 0.62) break
      push(later, 'apprentice', {
        job_role: `Apprentice — ${courseDef.intended_role}`,
        salary: Math.round(stipend * (1 + rng() * 0.18)),
        employer: host,
        source: weighted(rng, [['employer', 46], ['trainee', 34], ['field_officer', 20]]),
      })
    }
    return events
  }

  if (track === 'not_working') {
    const d = addDays(endDate, 45 + Math.floor(rng() * 120))
    if (daysBetween(d, AS_OF) < 0) return events
    push(d, 'not_working', {
      source: weighted(rng, [['trainee', 62], ['field_officer', 38]]),
    })
    return events
  }

  /* ---- the placement track ---- */
  const employer = pick(rng, EMPLOYERS)
  // Did the placement match the role the course trained for?
  const onRole = rng() < (courseDef.target_pct / 100) * q + 0.12
  const job_role = onRole ? courseDef.intended_role : pick(rng, DRIFT_ROLES)
  const baseSalary =
    (onRole ? 11000 : 8500) + Math.floor(rng() * 6000) + Math.floor(q * 3000)

  const placedDate = addDays(endDate, 15 + Math.floor(rng() * 60))
  if (daysBetween(placedDate, AS_OF) < 0) return events
  push(placedDate, 'placed', {
    job_role,
    salary: baseSalary,
    employer,
    source: weighted(rng, [['employer', 46], ['trainee', 40], ['field_officer', 14]]),
  })

  // Checkpoints at 3 / 6 / 12 months after placement.
  const checkpoints = [90, 180, 365]
  let stillThere = true
  for (const offset of checkpoints) {
    const date = addDays(placedDate, offset)
    if (daysBetween(date, AS_OF) < 0) break // checkpoint hasn't come round yet
    if (!stillThere) break

    // Survival at each checkpoint — better centres retain better.
    const survive = rng() < 0.72 + 0.24 * q - (offset === 365 ? 0.1 : 0)
    if (!survive) {
      stillThere = false
      push(date, 'left_job', {
        job_role,
        employer,
        source: weighted(rng, [['employer', 40], ['trainee', 46], ['field_officer', 14]]),
      })
      // Some who leave resurface elsewhere.
      const after = weighted(rng, [['not_working', 55], ['self_employed', 25], ['none', 20]])
      if (after !== 'none') {
        const d2 = addDays(date, 25 + Math.floor(rng() * 60))
        if (daysBetween(d2, AS_OF) >= 0) {
          push(d2, after, {
            job_role: after === 'self_employed' ? `Self-employed — ${job_role}` : null,
            salary: after === 'self_employed' ? 6500 + Math.floor(rng() * 7000) : null,
            source: weighted(rng, [['trainee', 60], ['field_officer', 40]]),
          })
        }
      }
      break
    }

    // Wage progression — modest, occasionally a real jump.
    const raise = rng() < 0.42 ? 1 + (0.04 + rng() * 0.14) : 1
    push(date, 'still_working', {
      job_role,
      salary: Math.round(baseSalary * raise * (1 + offset / 3000)),
      employer,
      source: weighted(rng, [
        ['bank', 30 + 20 * q],
        ['employer', 26],
        ['trainee', 30],
        ['field_officer', 12],
      ]),
    })
  }

  return events
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
    // surviving the 3-month rule. This is deliberately stricter than
    // headline placement numbers.
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

function buildDisputes(rng, trainees, events, seq) {
  const byTrainee = groupEventsByTrainee(events)
  const disputes = []
  const candidates = trainees.filter((t) => {
    const evs = byTrainee[t.id] || []
    return evs.some((e) => e.what_happened === 'placed')
  })

  const CLAIM_PAIRS = [
    {
      type: 'Separation Dispute',
      employer_claim: 'Left employment on 12 Mar 2026 — did not complete notice period.',
      trainee_claim: 'Still working at the same unit; salary credited in March and April.',
    },
    {
      type: 'Employment Denial',
      employer_claim: 'Never joined after offer letter was issued.',
      trainee_claim: 'Joined on 04 Jan 2026, worked 5 weeks, paid in cash without payslip.',
    },
    {
      type: 'Role & Wage Mismatch',
      employer_claim: 'Employed as Helper, monthly wage ₹8,500.',
      trainee_claim: 'Working as Electrician, monthly wage ₹14,000.',
    },
    {
      type: 'Contract Tenure Dispute',
      employer_claim: 'Contract ended at 2 months; not renewed.',
      trainee_claim: 'Contract renewed verbally; continued for 7 months.',
    },
    {
      type: 'Attendance Dispute',
      employer_claim: 'Absent without notice since 20 Feb 2026.',
      trainee_claim: 'On approved medical leave; rejoined 05 Mar 2026.',
    },
    {
      type: 'Working Hours Dispute',
      employer_claim: 'Working part-time, 4 days a week.',
      trainee_claim: 'Full-time, 6 days a week including Saturdays.',
    },
    {
      type: 'Separation Cause Dispute',
      employer_claim: 'Trainee resigned voluntarily in Dec 2025.',
      trainee_claim: 'Was told not to return after the unit reduced its workforce.',
    },
    {
      type: 'Wage Payment Dispute',
      employer_claim: 'Wage band ₹10,000–₹15,000, paid by bank transfer.',
      trainee_claim: 'Paid ₹9,000 in cash; no bank transfer received.',
    },
    {
      type: 'Classification Dispute',
      employer_claim: 'Apprentice, stipend only — not a placement.',
      trainee_claim: 'Full employee doing the same work as permanent staff.',
    },
  ]

  for (let i = 0; i < 9; i++) {
    const t = candidates[Math.floor(rng() * candidates.length)]
    const evs = byTrainee[t.id] || []
    const placement = evs.find((e) => e.what_happened === 'placed')
    const pair = CLAIM_PAIRS[i % CLAIM_PAIRS.length]
    disputes.push({
      id: `DSP-${String(seq.n++).padStart(4, '0')}`,
      // Citizen-facing reference, quoted in correspondence about the case.
      record_id: `ST-2026-${String(i + 1).padStart(3, '0')}`,
      type: pair.type,
      trainee_id: t.id,
      trainee_name: t.name,
      course: t.course,
      district: t.district,
      employer: placement?.employer ?? 'Unknown employer',
      employer_claim: pair.employer_claim,
      trainee_claim: pair.trainee_claim,
      date: addDays(AS_OF, -(4 + Math.floor(rng() * 70))),
      status: 'open',
      assigned_officer_id: null,
      assigned_at: null,
    })
  }
  return disputes.sort((a, b) => (a.date < b.date ? 1 : -1))
}

function buildConsents(rng, trainees) {
  return trainees.map((t, i) => ({
    id: `CNS-${String(i + 1).padStart(4, '0')}`,
    trainee_id: t.id,
    status: 'granted',
    granted_date: addDays(cohortEndDate(t.cohort), -(2 + Math.floor(rng() * 12))),
    withdrawn_date: null,
    scopes: [
      'Employment status check-ins by SMS or voice call',
      'Confirmation of employment with the named employer',
      'Salary band (not exact salary) from bank-verified records',
      'Use of anonymised outcomes in government skilling reports',
    ],
  }))
}

function buildFollowupQueue(rng, trainees, events) {
  const byTrainee = groupEventsByTrainee(events)
  const silent = trainees.filter((t) => {
    const evs = byTrainee[t.id] || []
    if (evs.length === 0) return true
    const last = evs[evs.length - 1]
    return daysBetween(last.date, AS_OF) > 275 // gone quiet / stale
  })
  return silent.slice(0, 24).map((t) => ({
    trainee_id: t.id,
    name: t.name,
    phone: t.phone,
    course: t.course,
    district: t.district,
    provider_id: t.provider_id,
    cohort: t.cohort,
    attempts: 3 + Math.floor(rng() * 3),
    last_contact_date: addDays(AS_OF, -(30 + Math.floor(rng() * 200))),
    channel: pick(rng, ['SMS', 'Voice call', 'Field visit']),
    assigned_to: null,
  }))
}

/**
 * Seeded post-training reviews. Roughly three in five trainees respond, and
 * how well they rate a course tracks the quality of the centre that ran it —
 * so the government's aggregate view actually separates good centres from
 * weak ones instead of being uniform noise.
 */
function buildReviews(rng, trainees, providers) {
  const reviews = []
  for (const t of trainees) {
    if (rng() > 0.58) continue // not everyone answers, and that is fine
    const provider = providers.find((p) => p.id === t.provider_id)
    const q = provider?._quality ?? 0.7

    const answers = {}
    for (const question of REVIEW_QUESTIONS) {
      // Bias the draw towards the better options at better centres, while
      // leaving every option reachable anywhere.
      const roll = rng() * 0.55 + q * 0.45 + (rng() - 0.5) * 0.3
      const idx = roll > 0.86 ? 0 : roll > 0.62 ? 1 : roll > 0.38 ? 2 : 3
      answers[question.id] = question.options[idx].value
    }

    reviews.push({
      id: `REV-${t.id.slice(4)}`,
      trainee_id: t.id,
      provider_id: t.provider_id,
      course: t.course,
      cohort: t.cohort,
      district: t.district,
      answers,
      comment: null,
      submitted_at: addDays(cohortEndDate(t.cohort), 5 + Math.floor(rng() * 40)),
    })
  }
  return reviews.filter((r) => daysBetween(r.submitted_at, AS_OF) >= 0)
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

export function buildDataset() {
  const rng = mulberry32(20260910)

  const trainees = organizedData.trainees
  const events = organizedData.events
  const disputes = organizedData.disputes.map((d, i) => ({
    ...d,
    record_id: d.record_id ?? `ST-2026-${String(i + 1).padStart(3, '0')}`,
    assigned_officer_id: d.assigned_officer_id ?? null,
    assigned_at: d.assigned_at ?? null,
  }))
  const consents = organizedData.consents
  const followupQueue = organizedData.followupQueue

  // Reconstruct rich provider stats from the pre-built data
  const rawProviders = organizedData.providers
  const providerStats = buildProviderStats(rawProviders, trainees, events)

  const reviews = buildReviews(rng, trainees, rawProviders)

  return {
    providers: providerStats,
    trainees,
    events,
    disputes,
    consents,
    followupQueue,
    reviews,
  }
}
