import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { int, longDate, pct } from '../lib/format.js'
import { BUCKET_META } from '../lib/evidence.js'
import { useGov } from '../gov/GovContext.jsx'

/** Snapshot of the figures a withdrawal is about to move. */
async function figures() {
  const d = await api.getDashboard({})
  return {
    total: d.total_trainees,
    employed_pct: d.outcomes.employed.pct,
    employed_count: d.outcomes.employed.count,
    included: d.consent.included,
  }
}

export default function Consent() {
  const { t, lang } = useGov()
  const navigate = useNavigate()
  const [traineeId, setTraineeId] = useState('')
  const [step, setStep] = useState('idle') // idle | confirming | working | done
  const [receipt, setReceipt] = useState(null)

  const people = useApi(() => api.getTrainees({}), [])
  const consent = useApi(
    () => (traineeId ? api.getConsent(traineeId) : Promise.resolve(null)),
    [traineeId, step],
  )

  /* Default to someone whose withdrawal visibly moves the employment figure. */
  useEffect(() => {
    if (traineeId || !people.data?.length) return
    const good =
      people.data.find((p) => p.outcome === 'employed' && p.trust_level === 'high') ||
      people.data.find((p) => p.outcome === 'employed') ||
      people.data[0]
    setTraineeId(good.id)
  }, [people.data, traineeId])

  const options = useMemo(() => (people.data || []).slice(0, 120), [people.data])
  const c = consent.data
  const withdrawn = c?.status === 'withdrawn'

  const doWithdraw = async () => {
    setStep('working')
    const before = await figures()
    const res = await api.withdrawConsent(c.id)
    const after = await figures()
    setReceipt({ before, after, res, name: c.trainee.name, at: new Date() })
    setStep('done')
  }

  const doRestore = async () => {
    await api.grantConsent({ trainee_id: c.trainee_id })
    setReceipt(null)
    setStep('idle')
  }

  if (people.loading && !people.data) return <div className="skeleton" style={{ height: 320 }} />

  return (
    <div className="stack" style={{ maxWidth: 860 }}>
      <label className="field" style={{ maxWidth: 420 }}>
        <span className="label">{t('viewingConsentFor')}</span>
        <select value={traineeId} onChange={(e) => { setTraineeId(e.target.value); setStep('idle') }}>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.id} ({BUCKET_META[p.outcome]?.label || p.outcome})
            </option>
          ))}
        </select>
      </label>

      {!c ? (
        <div className="skeleton" style={{ height: 260 }} />
      ) : (
        <>
          <div className="consent-hero">
            <h2>{c.trainee.name}</h2>
            <p>
              {c.trainee.course} · {c.trainee.provider_name} · {c.trainee.district} ·{' '}
              <span className="mono" style={{ color: '#8b9aab' }}>{c.trainee_id}</span>
            </p>
            <div className={`consent-status consent-status--${withdrawn ? 'withdrawn' : 'granted'}`}>
              {withdrawn ? t('consentWithdrawnLabel') : t('consentGranted')}
              <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                {withdrawn
                  ? ` ${t('on')} ${longDate(c.withdrawn_date)}`
                  : ` ${t('on')} ${longDate(c.granted_date)}`}
              </span>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <div>
                <div className="panel__title">{t('whatYouAgreed')}</div>
                <div className="panel__hint">
                  {withdrawn
                    ? t('noneHappening')
                    : t('canWithdrawAnytime')}
                </div>
              </div>
            </div>
            <div className="panel__body">
              <ul className="scopes">
                {(c.scopes || []).map((s) => (
                  <li key={s} className={withdrawn ? 'revoked' : ''}>
                    <span className={withdrawn ? 'cross' : 'tick'} aria-hidden="true">
                      {withdrawn ? '✕' : '✓'}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <div>
                <div className="panel__title">{t('whatIsHeld')}</div>
                <div className="panel__hint">{t('exactlyWhatRemoves')}</div>
              </div>
            </div>
            <div className="panel__body">
              <div className="impact" style={{ margin: 0 }}>
                <div className="impact__cell">
                  <div className="label">{t('outcomeRecords')}</div>
                  <div className="impact__val num">{c.impact.events}</div>
                </div>
                <div className="impact__cell">
                  <div className="label">{t('countedAs')}</div>
                  <div className="impact__val" style={{ fontSize: 15 }}>
                    {BUCKET_META[c.impact.outcome]?.label || c.impact.outcome}
                  </div>
                </div>
                <div className="impact__cell">
                  <div className="label">{t('openDisputes')}</div>
                  <div className="impact__val num">{c.impact.disputes}</div>
                </div>
                <div className="impact__cell">
                  <div className="label">{t('reportedUnder')}</div>
                  <div className="impact__val" style={{ fontSize: 15 }}>{c.impact.district}</div>
                </div>
              </div>
            </div>
          </div>

          {withdrawn ? (
            <div className="panel">
              <div className="panel__body">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 650 }}>{t('excludedFromAll')}</div>
                    <div className="small muted" style={{ marginTop: 3 }}>
                      {t('withdrawnOn', longDate(c.withdrawn_date))}
                    </div>
                  </div>
                  <button type="button" className="btn" onClick={doRestore}>
                    {t('restoreConsent')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="withdraw-zone">
              <h3>{t('withdrawConsent')}</h3>
              <p>
                {t(
                  'withdrawExplanation',
                  c.impact.events,
                  c.impact.events === 1 ? '' : (lang === 'hi' ? '' : 's'),
                )}
              </p>

              {step === 'confirming' ? (
                <div className="row" style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn btn--lg btn--danger"
                    onClick={doWithdraw}
                  >
                    {t('yesWithdraw')}
                  </button>
                  <button type="button" className="btn btn--lg" onClick={() => setStep('idle')}>
                    {t('cancel')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn--lg btn--danger"
                  style={{ marginTop: 16 }}
                  disabled={step === 'working'}
                  onClick={() => setStep('confirming')}
                >
                  {step === 'working' ? t('withdrawing') : t('withdrawConsent')}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {step === 'done' && receipt && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="wd-title">
          <div className="overlay__card">
            <div className="overlay__top">
              <h3 id="wd-title">{t('consentWithdrawnTitle')}</h3>
              <p>{t('dataRemovedMsg', receipt.name)}</p>
            </div>
            <div className="overlay__body">
              <div className="receipt">
                <div>
                  <span>{t('requestLabel')}</span>
                  <b>DELETE /consent/{receipt.res.consent_id || receipt.res.id || '—'}</b>
                </div>
                <div>
                  <span>{t('statusLabel')}</span>
                  <b style={{ color: '#146c43' }}>200 · withdrawn</b>
                </div>
                <div>
                  <span>{t('recordsRemoved')}</span>
                  <b>{int(receipt.before.total - receipt.after.total)} {t('trainees')}</b>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div className="label" style={{ marginBottom: 8 }}>{t('dashboardBefore')}</div>
                <div className="impact" style={{ marginTop: 0 }}>
                  <div className="impact__cell">
                    <div className="label">{t('totalTrainees')}</div>
                    <div className="row" style={{ gap: 7 }}>
                      <span className="num faint" style={{ textDecoration: 'line-through' }}>
                        {int(receipt.before.total)}
                      </span>
                      <span aria-hidden="true">→</span>
                      <span className="impact__val num" style={{ color: '#a32c2c' }}>
                        {int(receipt.after.total)}
                      </span>
                    </div>
                  </div>
                  <div className="impact__cell">
                    <div className="label">{t('employedLabel')}</div>
                    <div className="row" style={{ gap: 7 }}>
                      <span className="num faint" style={{ textDecoration: 'line-through' }}>
                        {pct(receipt.before.employed_pct)}
                      </span>
                      <span aria-hidden="true">→</span>
                      <span className="impact__val num" style={{ color: '#a32c2c' }}>
                        {pct(receipt.after.employed_pct)}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="small muted" style={{ marginTop: 10 }}>
                  {t('dashboardRefreshNotice')}
                </p>
              </div>
            </div>
            <div className="overlay__foot">
              <button type="button" className="btn" onClick={() => setStep('idle')}>
                {t('stayOnPage')}
              </button>
              <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
                {t('openDashboard')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
