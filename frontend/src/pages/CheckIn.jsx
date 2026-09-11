import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { EvidenceBadge } from '../components/Evidence.jsx'
import { BUCKET_META } from '../lib/evidence.js'
import { useGov } from '../gov/GovContext.jsx'
import { useToast } from '../components/Toast.jsx'

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
  const { t } = useGov()
  const { role, user } = useAuth()
  const people = useApi(() => api.getTrainees({}), [])
  const toast = useToast()
  const [traineeId, setTraineeId] = useState('')
  const [primary, setPrimary] = useState(null)
  const [detail, setDetail] = useState(null)
  const [state, setState] = useState('idle') // idle | sending | done
  const [payload, setPayload] = useState(null)
  const [result, setResult] = useState(null)
  const [reqCategory, setReqCategory] = useState('Field Officer Assistance')
  const [reqMessage, setReqMessage] = useState('')
  const [reqSending, setReqSending] = useState(false)
  const [reqDone, setReqDone] = useState(false)
  const [reqResult, setReqResult] = useState(null)

  const PRIMARY = [
    { key: 'employed', label: t('employed'), hint: t('employedHint') },
    { key: 'self_employed', label: t('selfEmployedOpt'), hint: t('selfEmployedHint') },
    { key: 'apprentice', label: t('apprenticeOpt'), hint: t('apprenticeHint') },
    { key: 'not_working', label: t('notWorkingOpt'), hint: t('notWorkingHint') },
  ]

  const FOLLOW_UP = {
    employed: {
      question: t('fuEmployedQ'),
      options: [
        { key: 'same', label: t('fuSame') },
        { key: 'higher', label: t('fuHigher') },
        { key: 'lower', label: t('fuLower') },
      ],
    },
    self_employed: {
      question: t('fuSelfEmployedQ'),
      options: [
        { key: 'under_10k', label: t('fuUnder10k') },
        { key: '10k_20k', label: t('fu10k20k') },
        { key: 'over_20k', label: t('fuOver20k') },
      ],
    },
    apprentice: {
      question: t('fuApprenticeQ'),
      options: [
        { key: 'ongoing', label: t('fuOngoing') },
        { key: 'completed', label: t('fuCompleted') },
        { key: 'left', label: t('fuLeft') },
      ],
    },
    not_working: {
      question: t('fuNotWorkingQ'),
      options: [
        { key: 'looking', label: t('fuLooking') },
        { key: 'not_looking', label: t('fuNotLooking') },
        { key: 'studying', label: t('fuStudying') },
      ],
    },
  }

  const isOfficer = role === 'ministry'
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
    setReqDone(false)
    setReqResult(null)
    setReqMessage('')
  }

  const submit = async () => {
    if (state === 'sending' || !trainee?.id) return
    setState('sending')
    try {
      const body = {
        trainee_id: trainee.id,
        answer: primary.key,
        detail: detail.key,
        employer: trainee.employer || null,
        source: isOfficer ? 'field_officer' : 'trainee',
        channel: isOfficer ? 'officer_recorded' : 'self_service',
      }
      setPayload(body)
      const res = await api.postCheckin(body)
      setResult(res)
      setState('done')
      toast.push(t('checkinRecorded') || 'Check-in recorded successfully')
    } catch (err) {
      console.error('Check-in failed:', err)
      setState('idle')
      toast.push('Failed to record check-in. Please try again.', { tone: 'error' })
    }
  }

  const submitTraineeRequest = async (e) => {
    if (e) e.preventDefault()
    if (!trainee?.id || reqSending) return
    setReqSending(true)
    try {
      const res = await api.submitRequest({
        trainee_id: trainee.id,
        request_type: reqCategory,
        description: reqMessage.trim() || null,
        channel: isOfficer ? 'Officer Assigned Request' : 'Trainee Portal Request',
      })
      setReqSending(false)
      if (res.status === 'success' || res.ok) {
        setReqDone(true)
        setReqResult(res.request || res)
        toast.push(t('requestSubmitted') || 'Request submitted successfully', {
          detail: t('requestSubmittedDetail') || `Assigned to ${trainee.district || 'District'} evaluation office.`,
        })
      } else {
        toast.push('Could not submit request. Please try again.', { tone: 'error' })
      }
    } catch (err) {
      console.error('Request submission failed:', err)
      setReqSending(false)
      toast.push('Could not submit request. Please try again.', { tone: 'error' })
    }
  }

  if (people.loading && !people.data) return <div className="skeleton" style={{ height: 380 }} />

  const followUp = primary ? FOLLOW_UP[primary.key] : null

  return (
    <div className="stack checkin">
      <div className="note">
        <b>{t('checkinNote')}</b> {t('checkinNoteBody')}
      </div>

      <div className="grid grid--2">
        <div className="panel">
          <div className="panel__head">
            <div>
              <div className="panel__title">{t('statusCheckin')}</div>
              <div className="panel__hint">{t('twoQuestions')}</div>
            </div>
            {state === 'done' ? (
              <div className="panel__right">
                <button type="button" className="btn btn--sm" onClick={reset}>
                  {t('recordAnother')}
                </button>
              </div>
            ) : null}
          </div>

          <div className="panel__body stack" style={{ gap: 20 }}>
            {isOfficer && (
              <label className="field">
                <span className="label">{t('recordingOnBehalf')}</span>
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
                  <h3>{t('checkinRecorded')}</h3>
                  <p className="muted small">
                    {t('recordedAs')} <b>{result?.event?.what_happened}</b> {t('on')} {result?.event?.date}.{' '}
                    {t(
                      'storedAs',
                      isOfficer ? t('fromFieldOfficer') : t('fromTrainee'),
                      isOfficer ? t('corroborated') : t('selfReported'),
                    )}
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
                      ? t('question1employer', trainee.employer)
                      : t('question1general')}
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
                  {state === 'sending' ? t('submitting') : t('submitCheckin')}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="panel__head">
              <div>
                <div className="panel__title">
                  {t('requestAssistance') || 'Request Field Assistance / Support'}
                </div>
                <div className="panel__hint">
                  {trainee?.district ? `${trainee.district} District Office · ${trainee.name}` : (t('districtOffice') || 'District Office')}
                </div>
              </div>
            </div>

            <div className="panel__body">
              {reqDone ? (
                <div className="checkin-done" style={{ marginTop: 0 }}>
                  <div className="checkin-done__tick" aria-hidden="true">
                    ✓
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: 16 }}>Request Registered</h4>
                    <p className="muted small" style={{ margin: 0 }}>
                      Your case has been forwarded to the <b>{trainee?.district || 'District'}</b> Evaluation Office. Reference ID: <span className="mono">{reqResult?.request_id || 'REQ-LIVE'}</span>.
                    </p>
                    <p className="muted small" style={{ marginTop: 6 }}>
                      Contact phone: <b>{reqResult?.phone || trainee?.phone || 'On file'}</b> · Status: <b>Pending Field Assignment</b>
                    </p>
                    <button
                      type="button"
                      className="btn btn--sm"
                      style={{ marginTop: 12 }}
                      onClick={() => {
                        setReqDone(false)
                        setReqMessage('')
                      }}
                    >
                      Submit another request
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitTraineeRequest} className="stack" style={{ gap: 14 }}>
                  <p className="small muted" style={{ margin: 0 }}>
                    {state === 'done'
                      ? 'Your status check-in is logged. Need a field officer to corroborate your placement, verify employment, or help resolve a dispute?'
                      : 'You can submit an official support, verification, or dispute request directly to your district MSDE office.'}
                  </p>

                  <label className="field">
                    <span className="label">Assistance Type</span>
                    <select
                      value={reqCategory}
                      onChange={(e) => setReqCategory(e.target.value)}
                    >
                      <option value="Field Officer Assistance">Field Officer Visit & In-person Verification</option>
                      <option value="Placement & Wage Dispute">Placement & Salary Record Dispute</option>
                      <option value="Certificate / NSQF Correction">NSQF Certificate & Credential Correction</option>
                      <option value="Career & Retention Support">Career Counseling & Job Placement Support</option>
                    </select>
                  </label>

                  <label className="field">
                    <span className="label">Details or Reason (Optional)</span>
                    <textarea
                      rows={3}
                      placeholder="e.g., Please verify my current job role or update my employer details on the portal."
                      value={reqMessage}
                      onChange={(e) => setReqMessage(e.target.value)}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </label>

                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={reqSending || !trainee?.id}
                  >
                    {reqSending ? (t('submitting') || 'Submitting Request...') : 'Submit Request to Government'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {(payload || result) ? (
            <details className="panel" style={{ background: '#f8fafc' }}>
              <summary style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Technical Transmission Receipts (API Data)
              </summary>
              <div className="panel__body" style={{ borderTop: '1px solid var(--border)' }}>
                {payload && (
                  <div>
                    <div className="label" style={{ marginBottom: 4 }}>Payload Sent:</div>
                    <pre className="receipt" style={{ margin: '0 0 12px 0', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(payload, null, 2)}
                    </pre>
                  </div>
                )}
                {result && (
                  <div>
                    <div className="label" style={{ marginBottom: 4 }}>Server Response:</div>
                    <pre className="receipt" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  )
}
