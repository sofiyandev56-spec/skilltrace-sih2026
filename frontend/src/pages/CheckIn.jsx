import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useGov } from '../gov/GovContext.jsx'
import { EvidenceBadge } from '../components/Evidence.jsx'
import { BUCKET_META, getBucketLabel } from '../lib/evidence.js'

/**
 * Periodic status check-in.
 *
 * In production this reaches the trainee as an SMS or an automated voice call
 * and comes back as a keypad response; the officer-facing screen here submits
 * the identical payload, so what a field officer records by phone and what a
 * trainee submits themselves are the same record with a different `source`.
 */
const PRIMARY = [
  {
    key: 'employed',
    label: 'Working for an employer',
    labelHi: 'किसी नियोक्ता के अधीन कार्यरत',
    hint: 'Still in a paid job',
    hintHi: 'सवेतन नियमित नौकरी में कार्यरत',
  },
  {
    key: 'self_employed',
    label: 'Running my own work',
    labelHi: 'स्वयं का व्यवसाय / स्व-रोज़गार',
    hint: 'Self-employed or own business',
    hintHi: 'स्व-रोज़गार या खुद का उद्यम चला रहे हैं',
  },
  {
    key: 'apprentice',
    label: 'In an apprenticeship',
    labelHi: 'प्रशिक्षुता (Apprenticeship) में',
    hint: 'Learning on a stipend',
    hintHi: 'स्टाइपेंड के साथ व्यावहारिक प्रशिक्षण',
  },
  {
    key: 'not_working',
    label: 'Not working right now',
    labelHi: 'वर्तमान में कार्यरत नहीं',
    hint: 'Between jobs or unavailable',
    hintHi: 'नौकरी की तलाश में या अनुपलब्ध',
  },
]

/** The second question depends on the first — that is the point of asking it. */
const FOLLOW_UP = {
  employed: {
    question: 'Has your pay changed since you started?',
    questionHi: 'क्या कार्य प्रारंभ करने के बाद से आपके वेतन में कोई बदलाव हुआ है?',
    options: [
      { key: 'same', label: 'About the same', labelHi: 'लगभग समान है' },
      { key: 'higher', label: 'Higher now', labelHi: 'अब अधिक है (वेतन वृद्धि)' },
      { key: 'lower', label: 'Lower now', labelHi: 'अब कम है' },
    ],
  },
  self_employed: {
    question: 'Roughly what do you earn in a month?',
    questionHi: 'प्रति माह लगभग आपकी कितनी आय हो जाती है?',
    options: [
      { key: 'under_10k', label: 'Under ₹10,000', labelHi: '₹10,000 से कम' },
      { key: '10k_20k', label: '₹10,000 – ₹20,000', labelHi: '₹10,000 – ₹20,000' },
      { key: 'over_20k', label: 'More than ₹20,000', labelHi: '₹20,000 से अधिक' },
    ],
  },
  apprentice: {
    question: 'Is the apprenticeship still running?',
    questionHi: 'क्या प्रशिक्षुता अभी भी जारी है?',
    options: [
      { key: 'ongoing', label: 'Yes, still ongoing', labelHi: 'हाँ, अभी भी जारी है' },
      { key: 'completed', label: 'Completed it', labelHi: 'पूर्ण हो चुकी है' },
      { key: 'left', label: 'I left it', labelHi: 'छोड़ दी है' },
    ],
  },
  not_working: {
    question: 'Are you looking for work at the moment?',
    questionHi: 'क्या आप इस समय काम / रोज़गार की तलाश कर रहे हैं?',
    options: [
      { key: 'looking', label: 'Yes, looking', labelHi: 'हाँ, काम की तलाश जारी है' },
      { key: 'not_looking', label: 'Not looking', labelHi: 'तलाश नहीं कर रहे' },
      { key: 'studying', label: 'Studying or training', labelHi: 'अध्ययन या अन्य प्रशिक्षण ले रहे हैं' },
    ],
  },
}

function Choice({ picked, onPick, option, hi = false }) {
  return (
    <button
      type="button"
      className={`choice ${picked ? 'is-picked' : ''}`}
      onClick={onPick}
      aria-pressed={picked}
    >
      <span className="choice__mark" aria-hidden="true" />
      <span>
        <span style={{ display: 'block', fontWeight: 600 }}>
          {hi && option.labelHi ? option.labelHi : option.label}
        </span>
        {(hi && option.hintHi) || option.hint ? (
          <span className="small muted">{hi && option.hintHi ? option.hintHi : option.hint}</span>
        ) : null}
      </span>
    </button>
  )
}

export default function CheckIn() {
  const { lang } = useGov()
  const hi = lang === 'hi'
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
    <div className="stack">
      <div className="note">
        <b>{hi ? 'यह प्रशिक्षार्थी तक कैसे पहुँचता है:' : 'How this reaches the trainee.'}</b>{' '}
        {hi
          ? 'चेक-इन हर तीन महीने में एसएमएस या स्वचालित वॉयस कॉल के रूप में भेजा जाता है — कभी भी किसी तीसरे पक्ष की मैसेजिंग सेवा द्वारा नहीं। यह स्क्रीन वही रिकॉर्ड दर्ज करती है ताकि क्षेत्रीय अधिकारी द्वारा अथवा सीधे प्रशिक्षार्थी द्वारा प्रतिक्रिया दर्ज की जा सके।'
          : 'A check-in is sent as an SMS or an automated voice call every three months — never through a third-party messaging service. This screen submits the same record so the response can be captured by a field officer, or by the trainee directly.'}
      </div>

      <div className="grid grid--2">
        <div className="panel">
          <div className="panel__head">
            <div>
              <div className="panel__title">{hi ? 'स्थिति चेक-इन' : 'Status check-in'}</div>
              <div className="panel__hint">
                {hi ? 'केवल दो प्रश्न। अन्य कुछ भी नहीं पूछा जाता।' : 'Two questions. Nothing else is asked.'}
              </div>
            </div>
            {state === 'done' ? (
              <div className="panel__right">
                <button type="button" className="btn btn--sm" onClick={reset}>
                  {hi ? 'अन्य चेक-इन दर्ज करें' : 'Record another'}
                </button>
              </div>
            ) : null}
          </div>

          <div className="panel__body stack" style={{ gap: 20 }}>
            {isOfficer && (
              <label className="field">
                <span className="label">
                  {hi ? 'किसके स्थान पर दर्ज किया जा रहा है' : 'Recording on behalf of'}
                </span>
                <select
                  value={traineeId}
                  onChange={(e) => {
                    setTraineeId(e.target.value)
                    reset()
                  }}
                >
                  {(people.data || []).slice(0, 120).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {getBucketLabel(p.outcome, lang)}
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
                  <h3>{hi ? 'चेक-इन सफलतापूर्वक दर्ज' : 'Check-in recorded'}</h3>
                  <p className="muted small">
                    {hi
                      ? `${result?.event?.date} को ${result?.event?.what_happened} के रूप में दर्ज। चूँकि यह ${isOfficer ? 'क्षेत्रीय अधिकारी' : 'सीधे प्रशिक्षार्थी'} से प्राप्त हुआ है, इसलिए इसे तब तक ${isOfficer ? 'सत्यापित' : 'स्व-घोषित'} रखा जाता है जब तक कि नियोक्ता या बैंक रिकॉर्ड इसकी पुष्टि न कर दे।`
                      : `Recorded as ${result?.event?.what_happened} on ${result?.event?.date}. Because it came from ${isOfficer ? 'a field officer' : 'the trainee directly'}, it is stored as ${isOfficer ? 'corroborated' : 'self-reported'} until an employer or bank record confirms it.`}
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
                      ? hi
                        ? `क्या आप अभी भी ${trainee.employer} में कार्यरत हैं?`
                        : `Are you still working at ${trainee.employer}?`
                      : hi
                      ? 'वर्तमान में आप रोज़गार हेतु क्या कर रहे हैं?'
                      : 'What are you doing for work at the moment?'}
                  </legend>
                  <div className="stack" style={{ gap: 8 }}>
                    {PRIMARY.map((o) => (
                      <Choice
                        key={o.key}
                        option={o}
                        hi={hi}
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
                      {hi && followUp.questionHi ? followUp.questionHi : followUp.question}
                    </legend>
                    <div className="stack" style={{ gap: 8 }}>
                      {followUp.options.map((o) => (
                        <Choice
                          key={o.key}
                          option={o}
                          hi={hi}
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
                  {state === 'sending'
                    ? hi
                      ? 'दर्ज किया जा रहा है…'
                      : 'Submitting…'
                    : hi
                    ? 'चेक-इन जमा करें'
                    : 'Submit check-in'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="panel__head">
              <div className="panel__title">{hi ? 'अनुरोध (Request)' : 'Request'}</div>
            </div>
            <div className="panel__body">
              {payload ? (
                <pre className="receipt" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`POST /checkin
${JSON.stringify(payload, null, 2)}`}
                </pre>
              ) : (
                <p className="muted small">
                  {hi ? 'अभी कुछ भी नहीं भेजा गया — दोनों प्रश्नों का उत्तर दें।' : 'Nothing sent yet — answer both questions.'}
                </p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <div className="panel__title">{hi ? 'प्रतिक्रिया (Response)' : 'Response'}</div>
            </div>
            <div className="panel__body">
              {result ? (
                <pre className="receipt" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{JSON.stringify(result, null, 2)}
                </pre>
              ) : (
                <p className="muted small">
                  {hi ? 'सबमिशन की प्रतीक्षा है।' : 'Waiting for a submission.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
