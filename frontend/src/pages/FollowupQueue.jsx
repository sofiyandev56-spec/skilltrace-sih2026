import { useState } from 'react'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { longDate, relativeAge } from '../lib/format.js'
import { AS_OF } from '../api/mock/dataset.js'

const OFFICERS = [
  'S. Kulkarni (Pune div.)',
  'R. Deshmukh (Nashik div.)',
  'A. Jadhav (Nagpur div.)',
  'M. Pawar (Latur div.)',
]

function Attempts({ n }) {
  return (
    <span className="attempts" title={`${n} contact attempts made`} aria-label={`${n} attempts`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  )
}

export default function FollowupQueue() {
  const { data, loading, reload } = useApi(() => api.getFollowupQueue(), [])
  const [assigning, setAssigning] = useState(null)
  const [officer, setOfficer] = useState(OFFICERS[0])
  const [busy, setBusy] = useState(false)

  const rows = data || []
  const pending = rows.filter((r) => !r.assigned_to)

  const assign = async (traineeId) => {
    setBusy(true)
    await api.assignFollowup(traineeId, officer)
    await reload()
    setAssigning(null)
    setBusy(false)
  }

  return (
    <div className="stack">
      <div className="note">
        These trainees stopped responding after three automated attempts. Rather than recording them as a
        negative outcome, SkillTrace hands them to a field officer for an in-person visit — an unanswered
        message is missing data, not a failure.
      </div>

      <div className="panel">
        <div className="panel__head">
          <div>
            <div className="panel__title">Unresponsive after 3+ attempts</div>
            <div className="panel__hint">
              <span className="num">{pending.length}</span> awaiting assignment ·{' '}
              <span className="num">{rows.length - pending.length}</span> assigned
            </div>
          </div>
        </div>
        <div className="panel__body panel__body--flush">
          {loading && !data ? (
            <div className="skeleton" style={{ height: 200 }} />
          ) : rows.length === 0 ? (
            <div className="empty">
              <h4>Queue is clear</h4>
              <p>Everyone in this cohort has responded to at least one check-in.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Trainee</th>
                    <th>Phone</th>
                    <th>Course / district</th>
                    <th className="right">Attempts</th>
                    <th>Last contact</th>
                    <th>Channel</th>
                    <th style={{ width: 250 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.trainee_id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div className="faint small mono">{r.trainee_id}</div>
                      </td>
                      <td className="mono">{r.phone}</td>
                      <td>
                        <div>{r.course}</div>
                        <div className="faint small">{r.district} · {r.cohort}</div>
                      </td>
                      <td className="right"><Attempts n={r.attempts} /></td>
                      <td>
                        <div className="num">{longDate(r.last_contact_date)}</div>
                        <div className="faint small">{relativeAge(r.last_contact_date, AS_OF)}</div>
                      </td>
                      <td>{r.channel}</td>
                      <td>
                        {r.assigned_to ? (
                          <div>
                            <span className="tier tier--medium">
                              <i className="tier__dot" aria-hidden="true" />
                              Assigned
                            </span>
                            <div className="faint small" style={{ marginTop: 3 }}>
                              {r.assigned_to} · {longDate(r.assigned_at)}
                            </div>
                          </div>
                        ) : assigning === r.trainee_id ? (
                          <div className="row" style={{ gap: 6 }}>
                            <select
                              value={officer}
                              onChange={(e) => setOfficer(e.target.value)}
                              style={{ padding: '5px 7px', border: '1px solid var(--border-strong)', fontSize: 12 }}
                            >
                              {OFFICERS.map((o) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btn--sm btn--accent"
                              disabled={busy}
                              onClick={() => assign(r.trainee_id)}
                            >
                              {busy ? 'Assigning…' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              className="btn btn--sm btn--ghost"
                              onClick={() => setAssigning(null)}
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() => setAssigning(r.trainee_id)}
                          >
                            Assign to field officer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
