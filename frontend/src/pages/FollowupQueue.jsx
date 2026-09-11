import React, { useState } from 'react'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { longDate, relativeAge } from '../lib/format.js'
import { useGov } from '../gov/GovContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'

const OFFICERS = [
  'S. Kulkarni (Pune div.)',
  'R. Deshmukh (Nashik div.)',
  'A. Jadhav (Nagpur div.)',
  'M. Pawar (Latur div.)',
]

function Attempts({ n, t }) {
  return (
    <span className="attempts" title={`${n} attempts made`} aria-label={`${n} attempts`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  )
}

export default function FollowupQueue() {
  const { t } = useGov()
  const { officer: currentOfficer } = useAuth()
  const districtFilter = currentOfficer?.district ? { district: currentOfficer.district } : {}
  const { data, loading, reload } = useApi(
    () => api.getFollowupQueue(districtFilter),
    [currentOfficer?.district],
  )
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
        {t('followupNote')}
      </div>

      <div className="panel">
        <div className="panel__head">
          <div>
            <div className="panel__title">{t('unresponsiveAfter3')}</div>
            <div className="panel__hint">
              <span className="num">{pending.length}</span> {t('awaitingAssignment')} ·{' '}
              <span className="num">{rows.length - pending.length}</span> {t('assigned') || 'assigned'}
            </div>
          </div>
        </div>
        <div className="panel__body panel__body--flush">
          {loading && !data ? (
            <div className="skeleton" style={{ height: 200 }} />
          ) : rows.length === 0 ? (
            <div className="empty">
              <h4>{t('queueClear')}</h4>
              <p>{t('queueClearDesc')}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('colTrainee')}</th>
                    <th>{t('colPhone')}</th>
                    <th>{t('colCourseDistrict')}</th>
                    <th className="right">{t('colAttempts')}</th>
                    <th>{t('colLastContact')}</th>
                    <th>{t('colChannel')}</th>
                    <th style={{ width: 250 }}>{t('colAction')}</th>
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
                      <td className="right"><Attempts n={r.attempts} t={t} /></td>
                      <td>
                        <div className="num">{longDate(r.last_contact_date)}</div>
                        <div className="faint small">{relativeAge(r.last_contact_date, '2026-09-10')}</div>
                      </td>
                      <td>{r.channel}</td>
                      <td>
                        {r.assigned_to ? (
                          <div>
                            <span className="tier tier--medium">
                              <i className="tier__dot" aria-hidden="true" />
                              {t('assigned') || 'Assigned'}
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
                              {busy ? t('assigning') : t('confirm')}
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
                            {t('assignToFieldOfficer')}
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
