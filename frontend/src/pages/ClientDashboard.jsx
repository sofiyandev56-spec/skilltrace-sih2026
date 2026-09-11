import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import QuickReview from '../components/QuickReview.jsx'
import IncomeContinuity from '../components/IncomeContinuity.jsx'
import { EvidenceBadge } from '../components/Evidence.jsx'
import { BUCKET_META } from '../lib/evidence.js'
import { inr, longDate, relativeAge } from '../lib/format.js'
import { AS_OF, daysBetween } from '../api/mock/dataset.js'
import { useGov } from '../gov/GovContext.jsx'

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
function buildJourney(record, t) {
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
      title: t('trainingCompleted'),
      desc: record.provider_name || t('govTrainingCentre'),
      date: record.cohort ? t('cohortLabel', record.cohort) : null,
      state: 'done',
    },
    {
      key: 'certified',
      title: t('courseCertified'),
      desc: t('nsqfAssessment', record.course),
      date: null,
      state: 'done',
    },
  ]

  steps.push({
    key: 'placed',
    title: t('placedWithEmployer'),
    desc: placement ? placement.employer : t('notYetPlaced'),
    date: placement ? longDate(placement.date) : null,
    state: placement ? 'done' : 'upcoming',
  })

  const dueAt = placement ? addDays(placement.date, 90) : null
  steps.push({
    key: 'three_month',
    title: t('threeMonthMilestone'),
    desc: confirmation
      ? t('confirmedSameEmployer')
      : t('employmentCountsOnly'),
    date: confirmation ? longDate(confirmation.date) : dueAt ? t('dueLabel', longDate(dueAt)) : null,
    state: confirmation ? 'done' : placement ? 'pending' : 'upcoming',
    trust: confirmation?.trust_level,
  })

  const twelveDue = placement ? addDays(placement.date, 365) : null
  steps.push({
    key: 'twelve_month',
    title: t('twelveMonthRetention'),
    desc: twelveMonth ? t('stillSameAfterYear') : t('longTermCheck'),
    date: twelveMonth ? longDate(twelveMonth.date) : twelveDue ? t('dueLabel', longDate(twelveDue)) : null,
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
function nextAction({ record, reviewDone, journey, t }) {
  if (!record) return null
  const last = record.events?.[record.events.length - 1]
  const staleDays = last ? daysBetween(last.date, AS_OF) : null

  if (!reviewDone) {
    return {
      tone: 'action',
      title: t('completeReview'),
      body: t('completeReviewBody'),
      cta: null,
    }
  }
  if (record.bucket === 'not_working') {
    return {
      tone: 'attention',
      title: t('updateEmployment'),
      body: t('updateEmploymentBody'),
      cta: { to: '/check-in', label: t('submitCheckinAction') },
    }
  }
  if (record.bucket === 'awaiting_confirmation') {
    const step = journey.find((s) => s.key === 'three_month')
    return {
      tone: 'waiting',
      title: t('threeMonthComingUp'),
      body: `${t('threeMonthComingUpBody')} ${step?.date || ''}`.trim(),
      cta: { to: '/check-in', label: t('confirmEarly') },
    }
  }
  if (staleDays !== null && staleDays > 120) {
    return {
      tone: 'attention',
      title: t('confirmStillWorking'),
      body: t('confirmStillWorkingBody', relativeAge(last.date, AS_OF)),
      cta: { to: '/check-in', label: t('submitCheckinAction') },
    }
  }
  const twelve = journey.find((s) => s.key === 'twelve_month')
  const twelveReached = twelve && twelve.state !== 'upcoming'
  return {
    tone: 'ontrack',
    title: t('youAreOnTrack'),
    body: twelveReached
      ? t('onTrackComplete')
      : t('onTrackNext', twelve?.date ? `, ${twelve.date}` : ''),
    cta: null,
  }
}

/** A record an officer can look at when previewing what a trainee sees. */
const PREVIEW_TRAINEE = 'TRN-0001'

export default function ClientDashboard() {
  const { t, lang } = useGov()
  const { user, role } = useAuth()
  const toast = useToast()

  const QUICK_ACTIONS = [
    { to: '/check-in', label: t('submitCheckinAction'), desc: t('tellUsStatus'), icon: '✓' },
    { to: '/consent', label: t('myConsentRights'), desc: t('seeWithdraw'), icon: '🔒' },
  ]

  const BUCKET_LABELS = {
    employed: t('bucketEmployed'),
    self_employed: t('bucketSelfEmployed'),
    apprentice: t('bucketApprentice'),
    not_working: t('bucketNotWorking'),
    awaiting_confirmation: t('bucketAwaiting'),
    no_data: t('bucketNoData'),
  }

  // A government officer opening the trainee portal is previewing it, not
  // looking at their own record — they have no skilling record of their own.
  const previewing = role !== 'client'
  const traineeId = previewing ? PREVIEW_TRAINEE : user?.id || PREVIEW_TRAINEE

  const recordReq = useApi(() => api.getTrainee(traineeId), [traineeId])
  const reviewReq = useApi(() => api.getReview(traineeId), [traineeId])
  const [downloading, setDownloading] = useState(false)

  const handleDownloadSkillRecord = async () => {
    if (downloading) return
    setDownloading(true)
    try {
      const res = await api.downloadSkillRecord(traineeId)
      setDownloading(false)
      if (res.ok) {
        toast.push(t('credentialPrepared') || 'Skill record downloaded', {
          detail: t('credentialPreparedDetail') || 'Verified NSQF post-training credential saved.',
        })
      } else if (res.notFound) {
        toast.push(t('recordNotFound') || 'Skill record is not available yet.', {
          tone: 'warning',
        })
      } else {
        toast.push(res.message || 'Unable to generate your skill record. Please try again.', {
          tone: 'error',
        })
      }
    } catch (err) {
      console.error('Download skill record failed:', err)
      setDownloading(false)
      toast.push('Unable to generate your skill record. Please try again.', {
        tone: 'error',
      })
    }
  }

  const record = recordReq.data
  const journey = useMemo(() => buildJourney(record, t), [record, t])
  const reviewDone = Boolean(reviewReq.data?.completed)
  const action = useMemo(
    () => nextAction({ record, reviewDone, journey, t }),
    [record, reviewDone, journey, t],
  )

  if (recordReq.loading && !record) return <div className="skeleton" style={{ height: 420 }} />
  if (!record) {
    return (
      <div className="panel">
        <div className="empty">
          <h4>{t('noRecordFound')}</h4>
          <p>{t('noRecordBody')}</p>
        </div>
      </div>
    )
  }

  const outcomeMeta = BUCKET_META[record.bucket] || BUCKET_META.no_data
  const outcomeLabel = BUCKET_LABELS[record.bucket] || outcomeMeta.label
  const firstName = record.name.split(' ')[0]
  const placement = record.events?.find((e) => e.what_happened === 'placed')
  const latestPay = [...(record.events || [])].reverse().find((e) => e.salary)?.salary

  return (
    <div className="client">
      {previewing ? (
        <p className="note" style={{ marginBottom: -14 }}>
          <b>{t('previewNote')}</b> {t('previewBody', record.name, record.id)}
        </p>
      ) : null}

      {/* ---- 1. who you are, and where you stand ---- */}
      <section className="client-top" aria-labelledby="client-welcome">
        <div className="client-top__intro">
          <p className="client-top__eyebrow">
            <span className="mono">{record.id}</span> · {record.course}
          </p>
          <h1 id="client-welcome">{t('welcomeBack', firstName)}</h1>
          <p className="client-top__line">
            {record.district}, Maharashtra · {t('certifiedUnder')}
          </p>
        </div>

        <div className="client-status">
          <span className="client-status__label">{t('yourVerifiedStatus')}</span>
          <span className="client-status__value" style={{ color: outcomeMeta.color }}>
            {outcomeLabel}
          </span>
          {record.bucket === 'employed' && (
            <span className="client-status__note">{t('threeMonthsAtSame')}</span>
          )}
          <dl className="client-status__facts">
            {placement?.employer ? (
              <div>
                <dt>{t('employer')}</dt>
                <dd>{placement.employer}</dd>
              </div>
            ) : null}
            {record.event?.job_role ? (
              <div>
                <dt>{t('role')}</dt>
                <dd>{record.event.job_role}</dd>
              </div>
            ) : null}
            {latestPay ? (
              <div>
                <dt>{t('monthlyEarnings')}</dt>
                <dd className="num">{inr(latestPay)}</dd>
              </div>
            ) : null}
          </dl>
          <div className="client-status__evidence">
            <EvidenceBadge trust={record.trust} small />
            <span className="faint small">
              {t('lastConfirmed', relativeAge(record.event?.date, AS_OF))}
            </span>
          </div>

          <IncomeContinuity record={record} />
        </div>
      </section>

      {/* ---- 2. the one thing to do next ---- */}
      {action ? (
        <section className={`nextup nextup--${action.tone}`} aria-labelledby="nextup-title">
          <span className="nextup__flag">
            {action.tone === 'ontrack' ? t('onTrack') : action.tone === 'waiting' ? t('comingUp') : t('yourNextStep')}
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
          <h2 id="journey-title">{t('yourSkillJourney')}</h2>
          <p>
            {t('skillJourneyDesc')}
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
                  {s.state === 'current' ? <span className="journey__now">{t('verified')}</span> : null}
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
          <h2 id="review-section-title">{t('yourTrainingFeedback')}</h2>
          <p>{t('ratingsPooled')}</p>
        </div>
        <QuickReview traineeId={traineeId} courseName={record.course} />
      </section>

      {/* ---- 5. actions & records ---- */}
      <div className="client-split">
        <section className="client-section" aria-labelledby="actions-title">
          <div className="client-section__head">
            <h2 id="actions-title">{t('quickActions')}</h2>
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
              disabled={downloading}
              onClick={handleDownloadSkillRecord}
              aria-label={t('downloadSkillRecord')}
            >
              <span className="quickact__icon" aria-hidden="true">
                {downloading ? '⏳' : '⭳'}
              </span>
              <span>
                <strong>{downloading ? (t('submitting') || 'Generating...') : t('downloadSkillRecord')}</strong>
                <span>{t('verifiedCredentialPdf')}</span>
              </span>
            </button>
          </div>
        </section>

        <section className="client-section" aria-labelledby="record-title">
          <div className="client-section__head">
            <h2 id="record-title">{t('yourVerifiedRecord')}</h2>
          </div>
          <div className="credential">
            <div className="credential__top">
              <img src="/state-emblem.png" alt="" className="credential__emblem" aria-hidden="true" />
              <div>
                <span className="credential__issuer">{t('ministryName')}</span>
                <span className="credential__kind">{t('verifiedPostTraining')}</span>
              </div>
            </div>
            <dl className="credential__grid">
              <div>
                <dt>{t('name')}</dt>
                <dd>{record.name}</dd>
              </div>
              <div>
                <dt>{t('traineeId')}</dt>
                <dd className="mono">{record.id}</dd>
              </div>
              <div>
                <dt>{t('course')}</dt>
                <dd>{record.course}</dd>
              </div>
              <div>
                <dt>{t('outcome')}</dt>
                <dd>{outcomeLabel}</dd>
              </div>
            </dl>
            <div className="credential__foot">
              <EvidenceBadge trust={record.trust} small />
              <span className="faint small">
                {t(
                  'recordsHeld',
                  record.events?.length || 0,
                  (record.events?.length || 0) === 1 ? '' : (lang === 'en' ? 's' : ''),
                )}
              </span>
              <Link to="/client/consent" className="credential__link">
                {t('manageOrWithdraw')}
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* ---- 6. help ---- */}
      <section className="client-help" aria-labelledby="help-title">
        <div>
          <h2 id="help-title">{t('needHelpTitle')}</h2>
          <p>
            {t('needHelpBody')}
          </p>
        </div>
        <Link to="/client/check-in" className="btn">
          {t('reportProblem')}
        </Link>
      </section>
    </div>
  )
}
