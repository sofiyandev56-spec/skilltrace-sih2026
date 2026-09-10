import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { useGov } from '../gov/GovContext.jsx'
import { int, longDate, pct } from '../lib/format.js'
import { BUCKET_META, getBucketLabel } from '../lib/evidence.js'

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
  const { lang } = useGov()
  const hi = lang === 'hi'
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
        <span className="label">{hi ? 'सहमति रिकॉर्ड देखें' : 'Viewing consent record for'}</span>
        <select value={traineeId} onChange={(e) => { setTraineeId(e.target.value); setStep('idle') }}>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.id} ({getBucketLabel(p.outcome, lang)})
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
              {withdrawn
                ? hi
                  ? '✕ सहमति वापस ले ली गई'
                  : '✕ Consent withdrawn'
                : hi
                ? '✓ सहमति प्रदान की गई'
                : '✓ Consent granted'}
              <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                {withdrawn
                  ? `${hi ? 'दिनांक:' : 'on'} ${longDate(c.withdrawn_date)}`
                  : `${hi ? 'दिनांक:' : 'on'} ${longDate(c.granted_date)}`}
              </span>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <div>
                <div className="panel__title">
                  {hi ? 'आपने क्या सहमति दी थी' : 'What you agreed to'}
                </div>
                <div className="panel__hint">
                  {withdrawn
                    ? hi
                      ? 'अब इनमें से कुछ भी सक्रिय नहीं है। आपका रिकॉर्ड सभी रिपोर्टिंग से हटा दिया गया है।'
                      : 'None of this is happening any more. Your record has been removed from all reporting.'
                    : hi
                    ? 'आप इसे किसी भी समय वापस ले सकते हैं। सहमति वापसी तुरंत प्रभावी होती है।'
                    : 'You can withdraw any of this at any time. Withdrawal takes effect immediately.'}
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
                <div className="panel__title">
                  {hi ? 'वर्तमान में आपके बारे में क्या दर्ज है' : 'What is held about you today'}
                </div>
                <div className="panel__hint">
                  {hi ? 'सहमति वापस लेने पर ठीक यही विवरण हटाया जाता है।' : 'Exactly what withdrawal removes.'}
                </div>
              </div>
            </div>
            <div className="panel__body">
              <div className="impact" style={{ margin: 0 }}>
                <div className="impact__cell">
                  <div className="label">{hi ? 'परिणाम रिकॉर्ड' : 'Outcome records'}</div>
                  <div className="impact__val num">{c.impact.events}</div>
                </div>
                <div className="impact__cell">
                  <div className="label">{hi ? 'किस रूप में दर्ज' : 'Counted as'}</div>
                  <div className="impact__val" style={{ fontSize: 15 }}>
                    {getBucketLabel(c.impact.outcome, lang)}
                  </div>
                </div>
                <div className="impact__cell">
                  <div className="label">{hi ? 'खुले विवाद' : 'Open disputes'}</div>
                  <div className="impact__val num">{c.impact.disputes}</div>
                </div>
                <div className="impact__cell">
                  <div className="label">{hi ? 'रिपोर्ट जिला' : 'Reported under'}</div>
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
                    <div style={{ fontWeight: 650 }}>
                      {hi ? 'यह रिकॉर्ड सभी सरकारी रिपोर्टिंग से बाहर रखा गया है।' : 'This record is excluded from all government reporting.'}
                    </div>
                    <div className="small muted" style={{ marginTop: 3 }}>
                      {hi ? `वापसी तिथि: ${longDate(c.withdrawn_date)}। प्रदर्शन हेतु पुनः बहाल करने की सुविधा उपलब्ध है।` : `Withdrawn ${longDate(c.withdrawn_date)}. Restoring is available here for demonstration.`}
                    </div>
                  </div>
                  <button type="button" className="btn" onClick={doRestore}>
                    {hi ? 'सहमति पुनः बहाल करें (डेमो)' : 'Restore consent (demo)'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="withdraw-zone">
              <h3>{hi ? 'सहमति वापस लें' : 'Withdraw consent'}</h3>
              <p>
                {hi
                  ? `आपका ${c.impact.events} परिणाम रिकॉर्ड तत्काल सभी सरकारी डैशबोर्ड, रैंकिंग और रिपोर्ट से हटा दिया जाएगा। आपको आगे कोई चेक-इन संदेश नहीं भेजा जाएगा। आपका प्रशिक्षण प्रमाणपत्र अप्रभावित रहेगा।`
                  : `Your ${c.impact.events} outcome record${c.impact.events === 1 ? '' : 's'} will be removed from every government dashboard, ranking and report immediately. No further check-ins will be sent to you. Your training certificate is not affected.`}
              </p>

              {step === 'confirming' ? (
                <div className="row" style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn btn--lg btn--danger"
                    onClick={doWithdraw}
                  >
                    {hi ? 'हाँ, मेरी सहमति अभी वापस लें' : 'Yes, withdraw my consent now'}
                  </button>
                  <button type="button" className="btn btn--lg" onClick={() => setStep('idle')}>
                    {hi ? 'रद्द करें' : 'Cancel'}
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
                  {step === 'working' ? (hi ? 'वापस लिया जा रहा है…' : 'Withdrawing…') : (hi ? 'सहमति वापस लें' : 'Withdraw Consent')}
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
              <h3 id="wd-title">{hi ? 'सहमति वापस ले ली गई' : 'Consent withdrawn'}</h3>
              <p>
                {hi
                  ? `पुष्टि करते ही ${receipt.name} का डेटा प्रत्येक सरकारी आंकड़े से हटा दिया गया।`
                  : `${receipt.name}’s data was removed from every figure the moment you confirmed.`}
              </p>
            </div>
            <div className="overlay__body">
              <div className="receipt">
                <div>
                  <span>{hi ? 'अनुरोध' : 'Request'}</span>
                  <b>DELETE /consent/{receipt.res.consent_id || receipt.res.id || '—'}</b>
                </div>
                <div>
                  <span>{hi ? 'स्थिति' : 'Status'}</span>
                  <b style={{ color: '#146c43' }}>200 · {hi ? 'वापस ले ली गई' : 'withdrawn'}</b>
                </div>
                <div>
                  <span>{hi ? 'हटाए गए रिकॉर्ड' : 'Records removed'}</span>
                  <b>{int(receipt.before.total - receipt.after.total)} {hi ? 'प्रशिक्षार्थी' : 'trainee'}</b>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div className="label" style={{ marginBottom: 8 }}>
                  {hi ? 'डैशबोर्ड आंकड़े: पहले → बाद में' : 'Dashboard figures, before → after'}
                </div>
                <div className="impact" style={{ marginTop: 0 }}>
                  <div className="impact__cell">
                    <div className="label">{hi ? 'कुल प्रशिक्षार्थी' : 'Total trainees'}</div>
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
                    <div className="label">{hi ? 'रोज़गार प्राप्त' : 'Employed'}</div>
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
                  {hi
                    ? 'किसी अन्य टैब में खुले डैशबोर्ड पर रिफ्रेश करने की सूचना प्रदर्शित होगी।'
                    : 'Any dashboard already open in another tab will show a notice to refresh.'}
                </p>
              </div>
            </div>
            <div className="overlay__foot">
              <button type="button" className="btn" onClick={() => setStep('idle')}>
                {hi ? 'इसी पृष्ठ पर रहें' : 'Stay on this page'}
              </button>
              <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
                {hi ? 'डैशबोर्ड खोलें' : 'Open the dashboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
