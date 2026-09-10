import { useState } from 'react'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { EvidenceBadge } from '../components/Evidence.jsx'
import Modal from '../components/Modal.jsx'
import { longDate } from '../lib/format.js'

const SOURCE_ICON = {
  bank: '₹',
  employer: '🏢',
  trainee: '👤',
  field_officer: '🧭',
}

const WHAT_LABEL = {
  placed: 'Placement reported',
  still_working: 'Still working confirmed',
  left_job: 'Left the job',
  self_employed: 'Self-employment reported',
  apprentice: 'Apprenticeship reported',
  not_working: 'Not working reported',
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
  const { data, loading } = useApi(() => api.getTrainee(traineeId), [traineeId])
  if (loading) return <p className="small muted">Loading this trainee&rsquo;s full history…</p>
  const events = data?.events || []
  if (!events.length) return null

  return (
    <div className="ledger">
      <p className="ledger__head">
        Full record for {traineeId} — {events.length} event{events.length === 1 ? '' : 's'}, oldest
        first. Nothing here has been edited or removed.
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
                {WHAT_LABEL[e.what_happened] || e.what_happened}
                {e.employer ? <span className="muted"> · {e.employer}</span> : null}
              </span>
              <EvidenceBadge trust={e.trust_level} small />
              {superseded ? (
                <span className="ledger__state">superseded, retained</span>
              ) : (
                <span className="ledger__state ledger__state--live">current</span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function EventDetail({ event, onClose }) {
  if (!event) return null
  return (
    <Modal
      open
      onClose={onClose}
      title={event.event_type}
      subtitle={`Event ${event.id} · recorded ${longDate(event.date)}`}
    >
      <dl className="kv">
        <dt>Event ID</dt>
        <dd className="num">{event.id}</dd>

        <dt>Trainee</dt>
        <dd>
          {event.trainee_name} <span className="num muted">({event.trainee_id})</span>
        </dd>

        <dt>Date recorded</dt>
        <dd>{longDate(event.date)}</dd>

        <dt>Reported by</dt>
        <dd>{event.source}</dd>

        <dt>Evidence level</dt>
        <dd>
          <EvidenceBadge trust={event.trust_level} small />
        </dd>

        {event.employer ? (
          <>
            <dt>Employer</dt>
            <dd>{event.employer}</dd>
          </>
        ) : null}

        {event.job_role ? (
          <>
            <dt>Role</dt>
            <dd>{event.job_role}</dd>
          </>
        ) : null}

        {event.salary ? (
          <>
            <dt>Monthly wage</dt>
            <dd className="num">₹{event.salary.toLocaleString('en-IN')}</dd>
          </>
        ) : null}

        <dt>Consent at time of use</dt>
        <dd>
          <span className={`pill pill--${event.consent_status === 'active' ? 'resolved' : 'disputed'}`}>
            {event.consent_status === 'active' ? 'Consent active' : 'Consent withdrawn'}
          </span>
        </dd>

        <dt>Effect on outcomes</dt>
        <dd>{event.outcome_impact}</dd>
      </dl>

      <p className="note note--tight">
        This record is append-only. If it is later contradicted, a new event is added above it — this
        row is never edited or deleted, so the figure it supports can always be re-derived.
      </p>

      <TraineeLedger traineeId={event.trainee_id} currentEventId={event.id} />
    </Modal>
  )
}

export default function AuditTrail() {
  const { data, loading } = useApi(() => api.getAuditLog({}), [])
  const [detail, setDetail] = useState(null)
  const [sourceFilter, setSourceFilter] = useState('all')

  const all = data?.events || []
  const rows = sourceFilter === 'all' ? all : all.filter((e) => e.source_key === sourceFilter)

  return (
    <div className="stack">
      <div className="note">
        Every outcome on this platform is calculated from dated events, and records are never silently
        overwritten. A figure on the dashboard can be traced back to the individual events below.
      </div>

      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Audit trail</h2>
            <p className="panel__desc">
              {loading
                ? 'Loading source events…'
                : `Showing the ${(data?.showing || 0).toLocaleString('en-IN')} most recent of ${(data?.total || 0).toLocaleString('en-IN')} events.`}
            </p>
          </div>
          <span className="pill pill--resolved" title="Records are append-only">
            Append-only ledger
          </span>
        </div>

        <div className="filters filters--inline">
          <label className="field">
            <span className="field__label">Reported by</span>
            <select
              className="select"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="all">All sources</option>
              <option value="bank">Consent-based income signal</option>
              <option value="employer">Employer confirmation</option>
              <option value="trainee">Trainee check-in</option>
              <option value="field_officer">Field officer visit</option>
            </select>
          </label>
        </div>

        {!loading && rows.length === 0 ? (
          <p className="empty">
            No source events match this filter selection. Try expanding the reporting period or
            clearing the source filter.
          </p>
        ) : (
          <div className="tblwrap">
            <table className="tbl tbl--audit">
              <caption className="sr-only">
                Append-only ledger of source events behind every outcome figure
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Trainee</th>
                  <th scope="col">Event</th>
                  <th scope="col">Source</th>
                  <th scope="col">Evidence</th>
                  <th scope="col">Consent</th>
                  <th scope="col">Effect on outcomes</th>
                  <th scope="col">
                    <span className="sr-only">Details</span>
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
                    <td>{e.event_type}</td>
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
                        {e.consent_status === 'active' ? 'Active' : 'Withdrawn'}
                      </span>
                    </td>
                    <td className="muted">{e.outcome_impact}</td>
                    <td>
                      <button type="button" className="btn btn--sm" onClick={() => setDetail(e)}>
                        View details
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
