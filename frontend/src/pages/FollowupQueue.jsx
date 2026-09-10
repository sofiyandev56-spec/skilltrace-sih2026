import { useState } from 'react'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { useGov } from '../gov/GovContext.jsx'
import { longDate, relativeAge } from '../lib/format.js'

const OFFICERS = [
  'S. Kulkarni (Pune div.)',
  'R. Deshmukh (Nashik div.)',
  'A. Jadhav (Nagpur div.)',
  'M. Pawar (Latur div.)',
]

function Attempts({ n, hi = false }) {
  return (
    <span
      className="attempts"
      title={hi ? `${n} बार संपर्क करने का प्रयास किया गया` : `${n} contact attempts made`}
      aria-label={`${n} attempts`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  )
}

export default function FollowupQueue() {
  const { lang } = useGov()
  const hi = lang === 'hi'
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
        {hi
          ? 'इन प्रशिक्षार्थियों ने तीन स्वचालित प्रयासों के बाद जवाब देना बंद कर दिया। उन्हें नकारात्मक परिणाम के रूप में दर्ज करने के बजाय, स्किलट्रेस व्यक्तिगत स्थलीय दौरे के लिए उन्हें क्षेत्रीय अधिकारी को सौंपता है — अनुत्तरित संदेश छूटा हुआ डेटा है, असफलता नहीं।'
          : 'These trainees stopped responding after three automated attempts. Rather than recording them as a negative outcome, SkillTrace hands them to a field officer for an in-person visit — an unanswered message is missing data, not a failure.'}
      </div>

      <div className="panel">
        <div className="panel__head">
          <div>
            <div className="panel__title">
              {hi ? '3+ प्रयासों के बाद अनुत्तरित' : 'Unresponsive after 3+ attempts'}
            </div>
            <div className="panel__hint">
              <span className="num">{pending.length}</span> {hi ? 'नियुक्ति की प्रतीक्षा में' : 'awaiting assignment'} ·{' '}
              <span className="num">{rows.length - pending.length}</span> {hi ? 'नियुक्त' : 'assigned'}
            </div>
          </div>
        </div>
        <div className="panel__body panel__body--flush">
          {loading && !data ? (
            <div className="skeleton" style={{ height: 200 }} />
          ) : rows.length === 0 ? (
            <div className="empty">
              <h4>{hi ? 'कतार रिक्त है' : 'Queue is clear'}</h4>
              <p>
                {hi
                  ? 'इस कोहॉर्ट के प्रत्येक प्रशिक्षार्थी ने कम से कम एक चेक-इन का उत्तर दिया है।'
                  : 'Everyone in this cohort has responded to at least one check-in.'}
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{hi ? 'प्रशिक्षार्थी' : 'Trainee'}</th>
                    <th>{hi ? 'फोन' : 'Phone'}</th>
                    <th>{hi ? 'पाठ्यक्रम / जिला' : 'Course / district'}</th>
                    <th className="right">{hi ? 'प्रयास' : 'Attempts'}</th>
                    <th>{hi ? 'अंतिम संपर्क' : 'Last contact'}</th>
                    <th>{hi ? 'माध्यम' : 'Channel'}</th>
                    <th style={{ width: 250 }}>{hi ? 'कार्रवाई' : 'Action'}</th>
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
                      <td className="right"><Attempts n={r.attempts} hi={hi} /></td>
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
                              {hi ? 'नियुक्त' : 'Assigned'}
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
                              {busy ? (hi ? 'नियुक्ति जारी…' : 'Assigning…') : (hi ? 'पुष्टि करें' : 'Confirm')}
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
                            {hi ? 'क्षेत्रीय अधिकारी को सौंपें' : 'Assign to field officer'}
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
