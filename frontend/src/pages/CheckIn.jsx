import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { EvidenceBadge } from '../components/Evidence.jsx'
import { BUCKET_META } from '../lib/evidence.js'

const Q1 = [
  { key: 'employed', label: 'Employed' },
  { key: 'self_employed', label: 'Own Business' },
  { key: 'apprentice', label: 'Apprentice' },
  { key: 'not_working', label: 'Not Working' },
]

/** The follow-up depends on the first answer — that is the whole point of it. */
const Q2 = {
  employed: {
    question: 'Good to hear. Is your salary the same as when you started, or has it changed?',
    options: [
      { key: 'same', label: 'Same as before' },
      { key: 'higher', label: 'Higher now' },
      { key: 'lower', label: 'Lower now' },
    ],
  },
  self_employed: {
    question: 'Understood. Roughly how much do you earn in a month from your own work?',
    options: [
      { key: 'under_10k', label: 'Under ₹10,000' },
      { key: '10k_20k', label: '₹10,000 – ₹20,000' },
      { key: 'over_20k', label: 'More than ₹20,000' },
    ],
  },
  apprentice: {
    question: 'Thanks. Is the apprenticeship still ongoing?',
    options: [
      { key: 'ongoing', label: 'Yes, still ongoing' },
      { key: 'completed', label: 'Completed it' },
      { key: 'left', label: 'I left it' },
    ],
  },
  not_working: {
    question: 'Thank you for telling us. Are you looking for work at the moment?',
    options: [
      { key: 'looking', label: 'Yes, looking' },
      { key: 'not_looking', label: 'Not looking' },
      { key: 'studying', label: 'Studying / training' },
    ],
  },
}

const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })

export default function CheckIn() {
  const people = useApi(() => api.getTrainees({}), [])
  const [traineeId, setTraineeId] = useState('')
  const [messages, setMessages] = useState([])
  const [stage, setStage] = useState('q1')
  const [answer, setAnswer] = useState(null)
  const [result, setResult] = useState(null)
  const [payload, setPayload] = useState(null)
  const threadRef = useRef(null)
  const timers = useRef([])

  const trainee = useMemo(
    () => (people.data || []).find((p) => p.id === traineeId) || null,
    [people.data, traineeId],
  )

  /* Prefer someone with a known employer — the opening line reads better. */
  useEffect(() => {
    if (traineeId || !people.data?.length) return
    const withEmployer = people.data.find((p) => p.employer) || people.data[0]
    setTraineeId(withEmployer.id)
  }, [people.data, traineeId])

  const schedule = (fn, ms) => {
    const t = setTimeout(fn, ms)
    timers.current.push(t)
    return t
  }

  const reset = (t = trainee) => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setStage('q1')
    setAnswer(null)
    setResult(null)
    setPayload(null)
    setMessages(
      t
        ? [
            {
              dir: 'in',
              text: `Namaste ${t.name.split(' ')[0]} 🙏 This is SkillTrace, from the Skill Development Mission. We are checking how things are going after your ${t.course} course.`,
              time: now(),
            },
            {
              dir: 'in',
              text: t.employer
                ? `Are you still working at ${t.employer}?`
                : 'What are you doing for work at the moment?',
              time: now(),
            },
          ]
        : [],
    )
  }

  useEffect(() => {
    reset(trainee)
    return () => timers.current.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traineeId, trainee?.id])

  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, stage])

  const push = (m) => setMessages((prev) => [...prev, { ...m, time: now() }])

  const chooseFirst = (opt) => {
    setAnswer(opt)
    push({ dir: 'out', text: opt.label })
    setStage('typing')
    schedule(() => {
      push({ dir: 'in', text: Q2[opt.key].question })
      setStage('q2')
    }, 850)
  }

  const chooseSecond = async (opt) => {
    if (!answer || !trainee) return
    push({ dir: 'out', text: opt.label })
    setStage('submitting')

    const body = {
      trainee_id: trainee.id,
      answer: answer.key,
      detail: opt.key,
      employer: trainee.employer || null,
      source: 'trainee',
      channel: 'whatsapp_simulated',
    }
    setPayload(body)

    const res = await api.postCheckin(body)
    setResult(res)

    schedule(() => {
      push({
        dir: 'in',
        text:
          'Thank you — that is recorded. Because it came from you directly, it is stored as self-reported until an employer or bank record confirms it. You can withdraw your consent at any time.',
      })
      setStage('done')
    }, 700)
  }

  const current = stage === 'q1' ? Q1 : stage === 'q2' ? Q2[answer.key].options : []

  if (people.loading && !people.data) return <div className="skeleton" style={{ height: 400 }} />

  return (
    <div className="sim">
      <div>
        <div className="phone">
          <div className="phone__screen">
            <div className="phone__notch"><i /></div>
            <div className="wa__bar">
              <span className="wa__avatar" aria-hidden="true">ST</span>
              <div>
                <div className="wa__name">SkillTrace</div>
                <div className="wa__status">Business account · online</div>
              </div>
            </div>

            <div className="wa__thread" ref={threadRef}>
              {messages.map((m, i) => (
                <div key={i} className={`bub bub--${m.dir === 'in' ? 'in' : 'out'}`}>
                  {m.text}
                  <div className="bub__time">
                    {m.time} {m.dir === 'out' ? '✓✓' : ''}
                  </div>
                </div>
              ))}
              {(stage === 'typing' || stage === 'submitting') && (
                <div className="wa__typing" aria-label="typing">
                  <i /><i /><i />
                </div>
              )}
            </div>

            <div className="wa__replies">
              {stage === 'done' ? (
                <div className="wa__done">Conversation complete · response recorded</div>
              ) : stage === 'typing' || stage === 'submitting' ? (
                <div className="wa__done">…</div>
              ) : (
                current.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    className="wa__reply"
                    onClick={() => (stage === 'q1' ? chooseFirst(o) : chooseSecond(o))}
                  >
                    {o.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="stack">
        <div className="note">
          <b>The phone is a mockup. The API call is not.</b> Tapping a reply sends a real{' '}
          <span className="mono">POST /checkin</span> to the backend (or to the local store when the backend
          is offline) and the answer immediately affects the dashboard.
        </div>

        <label className="field" style={{ maxWidth: 420 }}>
          <span className="label">Simulate a check-in for</span>
          <select value={traineeId} onChange={(e) => setTraineeId(e.target.value)}>
            {(people.data || []).slice(0, 120).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {BUCKET_META[p.outcome]?.label || p.outcome}
                {p.employer ? ` @ ${p.employer}` : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">Request</div>
            <div className="panel__right">
              <button type="button" className="btn btn--sm" onClick={() => reset()}>
                Restart conversation
              </button>
            </div>
          </div>
          <div className="panel__body">
            {payload ? (
              <pre className="receipt" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`POST /checkin
${JSON.stringify(payload, null, 2)}`}
              </pre>
            ) : (
              <div className="muted small">Nothing sent yet — answer both questions on the phone.</div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">Response</div>
          </div>
          <div className="panel__body">
            {result ? (
              <>
                <div className="row" style={{ marginBottom: 10 }}>
                  <EvidenceBadge trust={result.event?.trust_level || 'low'} />
                  <span className="small muted">
                    Recorded as <b>{result.event?.what_happened}</b> on {result.event?.date}
                  </span>
                </div>
                <pre className="receipt" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{JSON.stringify(result, null, 2)}
                </pre>
              </>
            ) : (
              <div className="muted small">Waiting for a reply.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
