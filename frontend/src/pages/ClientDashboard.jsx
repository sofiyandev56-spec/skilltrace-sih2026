import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import QuickReview from '../components/QuickReview.jsx'
import { EvidenceBadge } from '../components/Evidence.jsx'
import { BUCKET_META } from '../lib/evidence.js'
import { inr, longDate, relativeAge } from '../lib/format.js'
import { AS_OF, daysBetween } from '../api/mock/dataset.js'

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * The trainee's journey, derived from their actual event trail rather than
 * written out by hand — so what they see is the same record the government
 * sees, including the point at which the three-month rule was satisfied.
 */
function buildJourney(record) {
  if (!record) return []
  const events = record.events || []
  const placement = events.find((e) => e.what_happened === 'placed')
  const confirmation = placement
    ? events.find(
        (e) =>
          e.what_happened === 'still_working' &&
          e.employer === placement.employer &&
          daysBetween(placement.date, e.date) >= 75,
      )
    : null
  const twelveMonth = placement
    ? events.find(
        (e) =>
          e.what_happened === 'still_working' &&
          e.employer === placement.employer &&
          daysBetween(placement.date, e.date) >= 350,
      )
    : null

  const steps = [
    {
      key: 'training',
      title: 'Training completed',
      desc: record.provider_name || 'Government training centre',
      date: record.cohort ? `Cohort ${record.cohort}` : null,
      state: 'done',
    },
    {
      key: 'certified',
      title: 'Course certified',
      desc: `${record.course} · NSQF assessment passed`,
      date: null,
      state: 'done',
    },
  ]

  steps.push({
    key: 'placed',
    title: 'Placed with an employer',
    desc: placement ? placement.employer : 'Not yet placed',
    date: placement ? longDate(placement.date) : null,
    state: placement ? 'done' : 'upcoming',
  })

  const dueAt = placement ? addDays(placement.date, 90) : null
  steps.push({
    key: 'three_month',
    title: '3-month milestone',
    desc: confirmation
      ? 'Confirmed at the same employer — this is what counts as employment'
      : 'Employment counts only once you pass three months at the same employer',
    date: confirmation ? longDate(confirmation.date) : dueAt ? `Due ${longDate(dueAt)}` : null,
    state: confirmation ? 'done' : placement ? 'pending' : 'upcoming',
    trust: confirmation?.trust_level,
  })

  const twelveDue = placement ? addDays(placement.date, 365) : null
  steps.push({
    key: 'twelve_month',
    title: '12-month retention',
    desc: twelveMonth ? 'Still with the same employer after a year' : 'Long-term stability check',
    date: twelveMonth ? longDate(twelveMonth.date) : twelveDue ? `Due ${longDate(twelveDue)}` : null,
    state: twelveMonth ? 'done' : 'upcoming',
    trust: twelveMonth?.trust_level,
  })

  // Highlight where the trainee actually stands: a checkpoint that is due but
  // not yet met takes precedence, otherwise the furthest one reached.
  const pendingAt = steps.findIndex((s) => s.state === 'pending')
  if (pendingAt === -1) {
    const lastDone = steps.map((s) => s.state).lastIndexOf('done')
    if (lastDone !== -1) steps[lastDone].state = 'current'
  }

  return steps
}

/** One clear thing to do, chosen from the trainee's actual situation. */
function nextAction({ record, reviewDone, journey }) {
  if (!record) return null
  const last = record.events?.[record.events.length - 1]
  const staleDays = last ? daysBetween(last.date, AS_OF) : null

  if (!reviewDone) {
    return {
      tone: 'action',
      title: 'Complete your training review',
      body: 'Five quick questions about your course. It takes about a minute and shapes how the next batch is trained.',
      cta: null,
    }
  }
  if (record.bucket === 'not_working') {
    return {
      tone: 'attention',
      title: 'Update your employment information',
      body: 'Our record says you are not currently working. If that has changed, tell us — it takes two taps.',
      cta: { to: '/check-in', label: 'Submit a check-in' },
    }
  }
  if (record.bucket === 'awaiting_confirmation') {
    const step = journey.find((s) => s.key === 'three_month')
    return {
      tone: 'waiting',
      title: 'Your 3-month check is coming up',
      body: `You have been placed, but employment is only counted once you pass three months at the same employer. ${step?.date || ''}`.trim(),
      cta: { to: '/check-in', label: 'Confirm early' },
    }
  }
  if (staleDays !== null && staleDays > 120) {
    return {
      tone: 'attention',
      title: 'Confirm you are still working',
      body: `We last heard from you ${relativeAge(last.date, AS_OF)}. A quick confirmation keeps your record active.`,
      cta: { to: '/check-in', label: 'Submit a check-in' },
    }
  }
  const twelve = journey.find((s) => s.key === 'twelve_month')
  const twelveReached = twelve && twelve.state !== 'upcoming'
  return {
    tone: 'ontrack',
    title: 'You are on track',
    body: twelveReached
      ? 'Every milestone on your record is complete and independently verified. Nothing needs your attention — we will check in again in a few months.'
      : `Nothing needs your attention. Your next milestone is 12-month retention${twelve?.date ? `, ${twelve.date.replace(/^Due /, 'due ')}` : ''}.`,
    cta: null,
  }
}

const QUICK_ACTIONS = [
  { to: '/check-in', label: 'Submit a check-in', desc: 'Tell us your current work status', icon: '✓' },
  { to: '/consent', label: 'My consent & rights', desc: 'See and withdraw what you shared', icon: '🔒' },
]

/** A record an officer can look at when previewing what a trainee sees. */
const PREVIEW_TRAINEE = 'TRN-0001'

export default function ClientDashboard() {
  const { user, role } = useAuth()
  const toast = useToast()
  // A government officer opening the trainee portal is previewing it, not
  // looking at their own record — they have no skilling record of their own.
  const previewing = role !== 'client'
  const traineeId = previewing ? PREVIEW_TRAINEE : user?.id || PREVIEW_TRAINEE

  const recordReq = useApi(() => api.getTrainee(traineeId), [traineeId])
  const reviewReq = useApi(() => api.getReview(traineeId), [traineeId])

  const record = recordReq.data
  const journey = useMemo(() => buildJourney(record), [record])
  const reviewDone = Boolean(reviewReq.data?.completed)
  const action = useMemo(
    () => nextAction({ record, reviewDone, journey }),
    [record, reviewDone, journey],
  )

  if (recordReq.loading && !record) return <div className="skeleton" style={{ height: 420 }} />
  if (!record) {
    return (
      <div className="panel">
        <div className="empty">
          <h4>No record found</h4>
          <p>We could not find a skilling record for this account.</p>
        </div>
      </div>
    )
  }

  const outcome = BUCKET_META[record.bucket] || BUCKET_META.no_data
  const firstName = record.name.split(' ')[0]
  const placement = record.events?.find((e) => e.what_happened === 'placed')
  const latestPay = [...(record.events || [])].reverse().find((e) => e.salary)?.salary

  return (
    <div className="client">
      {previewing ? (
        <p className="note" style={{ marginBottom: -14 }}>
          <b>Preview.</b> You are signed in as a government officer, so this shows a sample trainee’s portal
          ({record.name}, <span className="mono">{record.id}</span>) exactly as they would see it.
        </p>
      ) : null}

      {/* ---- 1. who you are, and where you stand ---- */}
      <section className="client-top" aria-labelledby="client-welcome">
        <div className="client-top__intro">
          <p className="client-top__eyebrow">
            <span className="mono">{record.id}</span> · {record.course}
          </p>
          <h1 id="client-welcome">Welcome back, {firstName}</h1>
          <p className="client-top__line">
            {record.district}, Maharashtra · Certified under the National Skills Qualifications Framework
          </p>
        </div>

        <div className="client-status">
          <span className="client-status__label">Your verified status</span>
          <span className="client-status__value" style={{ color: outcome.color }}>
            {outcome.label}
          </span>
          {record.bucket === 'employed' && (
            <span className="client-status__note">3+ months at the same employer</span>
          )}
          <dl className="client-status__facts">
            {placement?.employer ? (
              <div>
                <dt>Employer</dt>
                <dd>{placement.employer}</dd>
              </div>
            ) : null}
            {record.event?.job_role ? (
              <div>
                <dt>Role</dt>
                <dd>{record.event.job_role}</dd>
              </div>
            ) : null}
            {latestPay ? (
              <div>
                <dt>Monthly earnings</dt>
                <dd className="num">{inr(latestPay)}</dd>
              </div>
            ) : null}
          </dl>
          <div className="client-status__evidence">
            <EvidenceBadge trust={record.trust} small />
            <span className="faint small">
              Last confirmed {relativeAge(record.event?.date, AS_OF)}
            </span>
          </div>
        </div>
      </section>

      {/* ---- 2. the one thing to do next ---- */}
      {action ? (
        <section className={`nextup nextup--${action.tone}`} aria-labelledby="nextup-title">
          <span className="nextup__flag">
            {action.tone === 'ontrack' ? 'On track' : action.tone === 'waiting' ? 'Coming up' : 'Your next step'}
          </span>
          <h2 id="nextup-title">{action.title}</h2>
          <p>{action.body}</p>
          {action.cta ? (
            <Link className="btn btn--accent" to={action.cta.to}>
              {action.cta.label}
            </Link>
          ) : null}
        </section>
      ) : null}

      {/* ---- 3. the journey ---- */}
      <section className="client-section" aria-labelledby="journey-title">
        <div className="client-section__head">
          <h2 id="journey-title">Your skill journey</h2>
          <p>
            Employment is counted only after three months at the same employer — a placement letter on its own
            is never recorded as an outcome.
          </p>
        </div>

        <ol className="journey">
          {journey.map((s) => (
            <li key={s.key} className={`journey__step is-${s.state}`}>
              <span className="journey__marker" aria-hidden="true">
                {s.state === 'done' || s.state === 'current' ? '✓' : s.state === 'pending' ? '•' : ''}
              </span>
              <div className="journey__body">
                <span className="journey__title">
                  {s.title}
                  {s.state === 'current' ? <span className="journey__now">Verified</span> : null}
                </span>
                <span className="journey__desc">{s.desc}</span>
                {s.date ? <span className="journey__date">{s.date}</span> : null}
                {s.trust ? <EvidenceBadge trust={s.trust} small /> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- 4. feedback ---- */}
      <section className="client-section" aria-labelledby="review-section-title">
        <div className="client-section__head">
          <h2 id="review-section-title">Your training feedback</h2>
          <p>Ratings are pooled across trainees before any officer sees them.</p>
        </div>
        <QuickReview traineeId={traineeId} courseName={record.course} />
      </section>

      {/* ---- 5. actions & records ---- */}
      <div className="client-split">
        <section className="client-section" aria-labelledby="actions-title">
          <div className="client-section__head">
            <h2 id="actions-title">Quick actions</h2>
          </div>
          <div className="quickacts">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.to} to={a.to} className="quickact">
                <span className="quickact__icon" aria-hidden="true">
                  {a.icon}
                </span>
                <span>
                  <strong>{a.label}</strong>
                  <span>{a.desc}</span>
                </span>
              </Link>
            ))}
            <button
              type="button"
              className="quickact"
              onClick={() =>
                toast.push('Credential prepared', {
                  detail: 'Your verified skill record has been generated and checked against the registry.',
                })
              }
            >
              <span className="quickact__icon" aria-hidden="true">
                ⭳
              </span>
              <span>
                <strong>Download skill record</strong>
                <span>Verified credential as a PDF</span>
              </span>
            </button>
          </div>
        </section>

        <section className="client-section" aria-labelledby="record-title">
          <div className="client-section__head">
            <h2 id="record-title">Your verified record</h2>
          </div>
          <div className="credential">
            <div className="credential__top">
              <img src="/state-emblem.png" alt="" className="credential__emblem" aria-hidden="true" />
              <div>
                <span className="credential__issuer">Ministry of Skill Development and Entrepreneurship</span>
                <span className="credential__kind">Verified post-training record</span>
              </div>
            </div>
            <dl className="credential__grid">
              <div>
                <dt>Name</dt>
                <dd>{record.name}</dd>
              </div>
              <div>
                <dt>Trainee ID</dt>
                <dd className="mono">{record.id}</dd>
              </div>
              <div>
                <dt>Course</dt>
                <dd>{record.course}</dd>
              </div>
              <div>
                <dt>Outcome</dt>
                <dd>{outcome.label}</dd>
              </div>
            </dl>
            <div className="credential__foot">
              <EvidenceBadge trust={record.trust} small />
              <span className="faint small">
                {record.events?.length || 0} record{record.events?.length === 1 ? '' : 's'} held about you
              </span>
              <Link to="/consent" className="credential__link">
                Manage or withdraw →
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* ---- 6. help ---- */}
      <section className="client-help" aria-labelledby="help-title">
        <div>
          <h2 id="help-title">Need help with your record?</h2>
          <p>
            If anything here is wrong — the employer, the dates, your status — tell us and a field officer will
            look into it. Correcting your record never affects your certificate.
          </p>
        </div>
        <Link to="/check-in" className="btn">
          Report a problem
        </Link>
      </section>
    </div>
  )
}
