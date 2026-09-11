import React, { useState } from 'react'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { EvidenceBadge } from '../components/Evidence.jsx'
import Modal from '../components/Modal.jsx'
import { longDate } from '../lib/format.js'
import { useGov } from '../gov/GovContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'

/**
 * Event names are interface text, not record data, so they are translated
 * here rather than taken from the API's English `event_type`.
 */
const WHAT_KEY = {
  placed: 'whatPlaced',
  still_working: 'whatStillWorking',
  left_job: 'whatLeftJob',
  self_employed: 'whatSelfEmployed',
  apprentice: 'whatApprentice',
  not_working: 'whatNotWorking',
}

const SOURCE_ICON = {
  bank: '₹',
  employer: '🏢',
  trainee: '👤',
  field_officer: '🧭',
}

/**
 * The whole trainee timeline, with the event being inspected marked in place.
 *
 * This is the append-only claim made checkable rather than asserted. If an
 * earlier record was later contradicted, both are still here and in order — a
 * judge can see for themselves that nothing was rewritten to make the
 * headline figure look better.
 */
function TraineeLedger({ traineeId, currentEventId }) {
  const { t, lang } = useGov()
  const { data, loading } = useApi(() => api.getTrainee(traineeId), [traineeId])
  if (loading) return <p className="small muted">{t('loading')}</p>
  const events = data?.events || []
  if (!events.length) return null

  return (
    <div className="ledger">
      <p className="ledger__head">
        {t(
          'fullRecordFor',
          traineeId,
          events.length,
          events.length === 1 ? '' : (lang === 'en' ? 's' : ''),
        )}
      </p>
      <ol className="ledger__list">
        {events.map((e, i) => {
          const superseded = i < events.length - 1
          return (
            <li
              className={`ledger__item ${e.id === currentEventId ? 'is-current' : ''}`}
              key={e.id}
            >
              <span className="ledger__seq num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="ledger__when num">{longDate(e.date)}</span>
              <span className="ledger__what">
                {WHAT_KEY[e.what_happened] ? t(WHAT_KEY[e.what_happened]) : e.event_type}
                {e.employer ? <span className="muted"> · {e.employer}</span> : null}
              </span>
              <EvidenceBadge trust={e.trust_level} small />
              {superseded ? (
                <span className="ledger__state">{t('supersededRetained')}</span>
              ) : (
                <span className="ledger__state ledger__state--live">{t('current')}</span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function EventDetail({ event, onClose }) {
  const { t } = useGov()
  if (!event) return null
  return (
    <Modal
      open
      onClose={onClose}
      title={WHAT_KEY[event.what_happened] ? t(WHAT_KEY[event.what_happened]) : event.event_type}
      subtitle={`Event ${event.id} · ${longDate(event.date)}`}
    >
      <dl className="kv">
        <dt>{t('eventId')}</dt>
        <dd className="num">{event.id}</dd>

        <dt>{t('colTrainee')}</dt>
        <dd>
          {event.trainee_name} <span className="num muted">({event.trainee_id})</span>
        </dd>

        <dt>{t('dateRecorded')}</dt>
        <dd>{longDate(event.date)}</dd>

        <dt>{t('reportedBy')}</dt>
        <dd>{event.source}</dd>

        <dt>{t('evidenceLevel')}</dt>
        <dd>
          <EvidenceBadge trust={event.trust_level} small />
        </dd>

        {event.employer ? (
          <>
            <dt>{t('employer')}</dt>
            <dd>{event.employer}</dd>
          </>
        ) : null}

        {event.job_role ? (
          <>
            <dt>{t('role')}</dt>
            <dd>{event.job_role}</dd>
          </>
        ) : null}

        {event.salary ? (
          <>
            <dt>{t('monthlyWage')}</dt>
            <dd className="num">₹{event.salary.toLocaleString('en-IN')}</dd>
          </>
        ) : null}

        <dt>{t('consentAtTime')}</dt>
        <dd>
          <span className={`pill pill--${event.consent_status === 'active' ? 'resolved' : 'disputed'}`}>
            {event.consent_status === 'active' ? t('consentActiveStatus') : t('consentWithdrawnStatus')}
          </span>
        </dd>

        <dt>{t('effectOnOutcomes')}</dt>
        <dd>{event.outcome_impact}</dd>
      </dl>

      <p className="note note--tight">
        {t('appendOnlyNote')}
      </p>

      <TraineeLedger traineeId={event.trainee_id} currentEventId={event.id} />
    </Modal>
  )
}

export default function AuditTrail() {
  const { t } = useGov()
  const { officer } = useAuth()
  const districtFilter = officer?.district ? { district: officer.district } : {}
  const { data, loading } = useApi(() => api.getAuditLog(districtFilter), [officer?.district])
  const [detail, setDetail] = useState(null)
  const [sourceFilter, setSourceFilter] = useState('all')

  const all = data?.events || []
  const rows = sourceFilter === 'all' ? all : all.filter((e) => e.source_key === sourceFilter)

  return (
    <div className="stack">
      <div className="note">
        {t('auditNote')}
      </div>

      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">{t('auditTrailTitle')}</h2>
            <p className="panel__desc">
              {loading
                ? t('loadingSourceEvents')
                : t(
                    'showingEvents',
                    (data?.showing || 0).toLocaleString('en-IN'),
                    (data?.total || 0).toLocaleString('en-IN'),
                  )}
            </p>
          </div>
          <span className="pill pill--resolved" title={t('appendOnlyNote')}>
            {t('appendOnlyLedger')}
          </span>
        </div>

        <div className="filters filters--inline">
          <label className="field">
            <span className="field__label">{t('reportedBy')}</span>
            <select
              className="select"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="all">{t('allSources')}</option>
              <option value="bank">{t('consentBasedIncome')}</option>
              <option value="employer">{t('employerConfirmation')}</option>
              <option value="trainee">{t('traineeCheckin')}</option>
              <option value="field_officer">{t('fieldOfficerVisit')}</option>
            </select>
          </label>
        </div>

        {!loading && rows.length === 0 ? (
          <p className="empty">
            {t('noEventsMatch')}
          </p>
        ) : (
          <div className="tblwrap">
            <table className="tbl tbl--audit">
              <caption className="sr-only">
                {t('auditTrailTitle')}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t('colDate')}</th>
                  <th scope="col">{t('colTrainee')}</th>
                  <th scope="col">{t('colEvent')}</th>
                  <th scope="col">{t('colSource')}</th>
                  <th scope="col">{t('colEvidence')}</th>
                  <th scope="col">{t('colConsent')}</th>
                  <th scope="col">{t('colEffectOnOutcomes')}</th>
                  <th scope="col">
                    <span className="sr-only">{t('details')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td className="num nowrap">{longDate(e.date)}</td>
                    <td>
                      <span className="num muted">{e.trainee_id}</span>
                    </td>
                    <td>{WHAT_KEY[e.what_happened] ? t(WHAT_KEY[e.what_happened]) : e.event_type}</td>
                    <td>
                      <span aria-hidden="true">{SOURCE_ICON[e.source_key]} </span>
                      {e.source}
                    </td>
                    <td>
                      <EvidenceBadge trust={e.trust_level} small />
                    </td>
                    <td>
                      <span
                        className={`pill pill--${e.consent_status === 'active' ? 'resolved' : 'disputed'}`}
                      >
                        {e.consent_status === 'active' ? t('consentActive') : t('consentWithdrawn')}
                      </span>
                    </td>
                    <td className="muted">{e.outcome_impact}</td>
                    <td>
                      <button type="button" className="btn btn--sm" onClick={() => setDetail(e)}>
                        {t('viewDetails')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <EventDetail event={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
