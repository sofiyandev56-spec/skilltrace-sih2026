import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { EvidenceBadge } from '../components/Evidence.jsx'
import { BUCKET_META } from '../lib/evidence.js'

/**
 * Periodic status check-in.
 *
 * In production this reaches the trainee as an SMS or an automated voice call
 * and comes back as a keypad response; the officer-facing screen here submits
 * the identical payload, so what a field officer records by phone and what a
 * trainee submits themselves are the same record with a different `source`.
 */
const PRIMARY = [
  { key: 'employed', label: 'Working for an employer', hint: 'Still in a paid job' },
  { key: 'self_employed', label: 'Running my own work', hint: 'Self-employed or own business' },
  { key: 'apprentice', label: 'In an apprenticeship', hint: 'Learning on a stipend' },
  { key: 'not_working', label: 'Not working right now', hint: 'Between jobs or unavailable' },
]

/** The second question depends on the first — that is the point of asking it. */
const FOLLOW_UP = {
  employed: {
    question: 'Has your pay changed since you started?',
    options: [
      { key: 'same', label: 'About the same' },
      { key: 'higher', label: 'Higher now' },
      { key: 'lower', label: 'Lower now' },
    ],
  },
  self_employed: {
    question: 'Roughly what do you earn in a month?',
    options: [
      { key: 'under_10k', label: 'Under ₹10,000' },
      { key: '10k_20k', label: '₹10,000 – ₹20,000' },
      { key: 'over_20k', label: 'More than ₹20,000' },
    ],
  },
  apprentice: {
    question: 'Is the apprenticeship still running?',
    options: [
      { key: 'ongoing', label: 'Yes, still ongoing' },
      { key: 'completed', label: 'Completed it' },
      { key: 'left', label: 'I left it' },
    ],
  },
  not_working: {
    question: 'Are you looking for work at the moment?',
    options: [
      { key: 'looking', label: 'Yes, looking' },
      { key: 'not_looking', label: 'Not looking' },
      { key: 'studying', label: 'Studying or training' },
    ],
  },
}

function Choice({ picked, onPick, option }) {
  return (
    <button
      type="button"
      className={`choice ${picked ? 'is-picked' : ''}`}
      onClick={onPick}
      aria-pressed={picked}
    >
      <span className="choice__mark" aria-hidden="true" />
      <span>
        <span style={{ display: 'block', fontWeight: 600 }}>{option.label}</span>
        {option.hint ? <span className="small muted">{option.hint}</span> : null}
      </span>
    </button>
  )
}

export default function CheckIn() {
  const { role, user } = useAuth()
  const people = useApi(() => api.getTrainees({}), [])
  const [traineeId, setTraineeId] = useState('')
  const [primary, setPrimary] = useState(null)
  const [detail, setDetail] = useState(null)
  const [state, setState] = useState('idle') // idle | sending | done
  const [payload, setPayload] = useState(null)
  const [result, setResult] = useState(null)

  const isOfficer = role === 'government'
  const trainee = useMemo(
    () => (people.data || []).find((p) => p.id === traineeId) || null,
    [people.data, traineeId],
  )

  /* A trainee checks in on their own record; an officer picks one. */
  useEffect(() => {
    if (traineeId || !people.data?.length) return
    if (!isOfficer && user?.id && people.data.some((p) => p.id === user.id)) {
      setTraineeId(user.id)
      return
    }
    setTraineeId((people.data.find((p) => p.employer) || people.data[0]).id)
  }, [people.data, traineeId, isOfficer, user])

  const reset = () => {
    setPrimary(null)
    setDetail(null)
    setState('idle')
    setPayload(null)
    setResult(null)
  }

  const submit = async () => {
    setState('sending')
    const body = {
      trainee_id: trainee.id,
      answer: primary.key,
      detail: detail.key,
      employer: trainee.employer || null,
      source: isOfficer ? 'field_officer' : 'trainee',
      channel: isOfficer ? 'officer_recorded' : 'self_service',
    }
    setPayload(body)
    setResult(await api.postCheckin(body))
    setState('done')
  }

  if (people.loading && !people.data) return <div className="skeleton" style={{ height: 380 }} />

  const followUp = primary ? FOLLOW_UP[primary.key] : null

  return (
    <div className="stack checkin">
      <div className="note">
        <b>How this reaches the trainee.</b> A check-in is sent as an SMS or an automated voice call every
        three months — never through a third-party messaging service. This screen submits the same record so
        the response can be captured by a field officer, or by the trainee directly.
      </div>

      <div className="grid grid--2">
        <div className="panel">
          <div className="panel__head">
            <div>
              <div className="panel__title">Status check-in</div>
              <div className="panel__hint">Two questions. Nothing else is asked.</div>
            </div>
            {state === 'done' ? (
              <div className="panel__right">
                <button type="button" className="btn btn--sm" onClick={reset}>
                  Record another
                </button>
              </div>
            ) : null}
          </div>

          <div className="panel__body stack" style={{ gap: 20 }}>
            {isOfficer && (
              <label className="field">
                <span className="label">Recording on behalf of</span>
                <select
                  value={traineeId}
                  onChange={(e) => {
                    setTraineeId(e.target.value)
                    reset()
                  }}
                >
                  {(people.data || []).slice(0, 120).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {BUCKET_META[p.outcome]?.label || p.outcome}
                      {p.employer ? ` @ ${p.employer}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {state === 'done' ? (
              <div className="checkin-done">
                <div className="checkin-done__tick" aria-hidden="true">
                  ✓
                </div>
                <div>
                  <h3>Check-in recorded</h3>
                  <p className="muted small">
                    Recorded as <b>{result?.event?.what_happened}</b> on {result?.event?.date}. Because it came
                    from {isOfficer ? 'a field officer' : 'the trainee directly'}, it is stored as{' '}
                    <b>{isOfficer ? 'corroborated' : 'self-reported'}</b> until an employer or bank record
                    confirms it.
                  </p>
                  <div style={{ marginTop: 10 }}>
                    <EvidenceBadge trust={result?.event?.trust_level || 'low'} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <fieldset className="fieldset">
                  <legend className="fieldset__legend">
                    <span className="fieldset__step">1</span>
                    {trainee?.employer
                      ? `Are you still working at ${trainee.employer}?`
                      : 'What are you doing for work at the moment?'}
                  </legend>
                  <div className="stack" style={{ gap: 8 }}>
                    {PRIMARY.map((o) => (
                      <Choice
                        key={o.key}
                        option={o}
                        picked={primary?.key === o.key}
                        onPick={() => {
                          setPrimary(o)
                          setDetail(null)
                        }}
                      />
                    ))}
                  </div>
                </fieldset>

                {followUp && (
                  <fieldset className="fieldset">
                    <legend className="fieldset__legend">
                      <span className="fieldset__step">2</span>
                      {followUp.question}
                    </legend>
                    <div className="stack" style={{ gap: 8 }}>
                      {followUp.options.map((o) => (
                        <Choice
                          key={o.key}
                          option={o}
                          picked={detail?.key === o.key}
                          onPick={() => setDetail(o)}
                        />
                      ))}
                    </div>
                  </fieldset>
                )}

                <button
                  type="button"
                  className="btn btn--lg btn--accent"
                  disabled={!primary || !detail || state === 'sending'}
                  onClick={submit}
                >
                  {state === 'sending' ? 'Submitting…' : 'Submit check-in'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="panel__head">
              <div className="panel__title">Request</div>
            </div>
            <div className="panel__body">
              {payload ? (
                <pre className="receipt" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`POST /checkin
${JSON.stringify(payload, null, 2)}`}
                </pre>
              ) : (
                <p className="muted small">Nothing sent yet — answer both questions.</p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <div className="panel__title">Response</div>
            </div>
            <div className="panel__body">
              {result ? (
                <pre className="receipt" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{JSON.stringify(result, null, 2)}
                </pre>
              ) : (
                <p className="muted small">Waiting for a submission.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
