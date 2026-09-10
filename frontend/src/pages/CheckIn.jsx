import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { EvidenceBadge } from '../components/Evidence.jsx'
import { BUCKET_META } from '../lib/evidence.js'
import { useGov } from '../gov/GovContext.jsx'

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
  const [traineeId, setTraineeId] = useState('')
  const [primary, setPrimary] = useState(null)
  const [detail, setDetail] = useState(null)
  const [state, setState] = useState('idle') // idle | sending | done
  const [payload, setPayload] = useState(null)
  const [result, setResult] = useState(null)

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
              <div className="panel__title">{t('request')}</div>
            </div>
            <div className="panel__body">
              {payload ? (
                <pre className="receipt" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`POST /checkin
${JSON.stringify(payload, null, 2)}`}
                </pre>
              ) : (
                <p className="muted small">{t('nothingSentYet')}</p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <div className="panel__title">{t('response')}</div>
            </div>
            <div className="panel__body">
              {result ? (
                <pre className="receipt" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{JSON.stringify(result, null, 2)}
                </pre>
              ) : (
                <p className="muted small">{t('waitingForSubmission')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
