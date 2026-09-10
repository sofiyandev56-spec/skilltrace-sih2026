import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, EMPLOYER_CONFIRM_PATH } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { longDate, maskName } from '../lib/format.js'

const ANSWERS = [
  {
    key: 'yes',
    label: 'Yes — still working with us',
    body: { answer: 'employed' },
    wage: true,
  },
  {
    key: 'left',
    label: 'No — they have left',
    body: { what_happened: 'left_job' },
    wage: false,
  },
  {
    key: 'never',
    label: 'They never worked here',
    body: { what_happened: 'not_working', employer_denies: true },
    wage: false,
  },
]

const WAGE_BANDS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'under_10k', label: 'Under ₹10,000 per month' },
  { value: '10k_15k', label: '₹10,000 – ₹15,000 per month' },
  { value: '15k_25k', label: '₹15,000 – ₹25,000 per month' },
  { value: 'over_25k', label: 'Over ₹25,000 per month' },
]

/**
 * Public, no-login page an employer reaches from a link in an SMS or email.
 * Deliberately plain: one question, three buttons, an optional wage band.
 */
export default function EmployerConfirm() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [picked, setPicked] = useState(null)
  const [wage, setWage] = useState('')
  const [state, setState] = useState('idle') // idle | sending | sent
  const [response, setResponse] = useState(null)

  const people = useApi(() => api.getTrainees({}), [])
  const record = useApi(() => (token ? api.getTrainee(token) : Promise.resolve(null)), [token])

  /* No token in the link — open the first record that actually has an employer. */
  useEffect(() => {
    if (token || !people.data?.length) return
    const t = people.data.find((p) => p.employer) || people.data[0]
    navigate(`/employer/${t.id}`, { replace: true })
  }, [token, people.data, navigate])

  const r = record.data
  const placement = useMemo(
    () => (r?.events || []).slice().reverse().find((e) => e.what_happened === 'placed') || null,
    [r],
  )

  const submit = async () => {
    setState('sending')
    const res = await api.postEmployerConfirm({
      trainee_id: r.id,
      employer: placement?.employer || r.employer || null,
      wage_band: wage || null,
      ...picked.body,
    })
    setResponse(res)
    setState('sent')
  }

  return (
    <div className="pub">
      <div className="pub__bar">
        <span
          aria-hidden="true"
          style={{ width: 22, height: 22, background: '#b4623a', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}
        >
          ST
        </span>
        <div>
          <div style={{ fontWeight: 650 }}>SkillTrace</div>
          <div style={{ fontSize: 11, color: '#8b9aab' }}>Skill Development Mission — employment confirmation</div>
        </div>
      </div>

      <div className="pub__body">
        <div className="pub__card">
          {record.loading && !r ? (
            <div className="pub__section"><div className="skeleton" style={{ height: 160 }} /></div>
          ) : !r ? (
            <div className="pub__section">
              <h2 style={{ fontSize: 19 }}>Employment record not found</h2>
              <p className="small muted" style={{ marginTop: 6 }}>
                This confirmation link is invalid or the candidate record could not be located.
              </p>
              <div style={{ marginTop: 16 }}>
                <Link className="btn" to="/">Back to the SkillTrace dashboard</Link>
              </div>
            </div>
          ) : state === 'sent' ? (
            <>
              <div className="pub__section" style={{ background: '#eef8f2' }}>
                <h2 style={{ fontSize: 19, color: '#146c43' }}>Thank you — response recorded</h2>
                <p className="small muted" style={{ marginTop: 6 }}>
                  Your confirmation was logged as employer evidence, the strongest tier we hold. You will not
                  be asked about this person again for another three months.
                </p>
              </div>
              <div className="pub__section">
                <dl style={{ margin: 0 }}>
                  <div className="kv">
                    <dt>Your answer</dt>
                    <dd>{picked.label}</dd>
                  </div>
                  {picked.wage && wage ? (
                    <div className="kv">
                      <dt>Wage band</dt>
                      <dd>{WAGE_BANDS.find((w) => w.value === wage)?.label}</dd>
                    </div>
                  ) : null}
                  <div className="kv">
                    <dt>Recorded on</dt>
                    <dd className="num">{longDate(response?.event?.date)}</dd>
                  </div>
                  <div className="kv">
                    <dt>Reference</dt>
                    <dd className="mono">{response?.event?.id || '—'}</dd>
                  </div>
                </dl>
              </div>
              <div className="pub__section">
                <Link className="btn" to="/">Back to the SkillTrace dashboard</Link>
              </div>
            </>
          ) : (
            <>
              <div className="pub__section">
                <h2 style={{ fontSize: 19 }}>Please confirm one employment record</h2>
                <p className="small muted" style={{ marginTop: 6 }}>
                  Your organisation was named as the employer of a candidate certified under a government
                  skilling course. Confirming takes about twenty seconds and needs no account or password.
                  We ask once every three months.
                </p>
              </div>

              <div className="pub__section">
                <dl style={{ margin: 0 }}>
                  <div className="kv">
                    <dt>Candidate</dt>
                    <dd>{maskName(r.name)}</dd>
                  </div>
                  <div className="kv">
                    <dt>Your organisation</dt>
                    <dd>{placement?.employer || '—'}</dd>
                  </div>
                  <div className="kv">
                    <dt>Role on record</dt>
                    <dd>{placement?.job_role || '—'}</dd>
                  </div>
                  <div className="kv">
                    <dt>Reported start</dt>
                    <dd className="num">{longDate(placement?.date)}</dd>
                  </div>
                  <div className="kv">
                    <dt>Course completed</dt>
                    <dd>{r.course}</dd>
                  </div>
                </dl>
                <p className="small faint" style={{ marginTop: 10 }}>
                  The candidate’s full name is masked. We only ask you to confirm what you already know.
                </p>
              </div>

              <div className="pub__section">
                <div className="label" style={{ marginBottom: 10 }}>
                  Is this person currently working with you?
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  {ANSWERS.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      className={`choice ${picked?.key === a.key ? 'is-picked' : ''}`}
                      onClick={() => setPicked(a)}
                    >
                      <span className="choice__mark" aria-hidden="true" />
                      {a.label}
                    </button>
                  ))}
                </div>

                {picked?.wage && (
                  <label className="field" style={{ marginTop: 16 }}>
                    <span className="label">Monthly wage band (optional)</span>
                    <select value={wage} onChange={(e) => setWage(e.target.value)}>
                      {WAGE_BANDS.map((w) => (
                        <option key={w.value} value={w.value}>{w.label}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="pub__section">
                <button
                  type="button"
                  className="btn btn--lg btn--accent btn--block"
                  disabled={!picked || state === 'sending'}
                  onClick={submit}
                >
                  {state === 'sending' ? 'Submitting…' : 'Submit confirmation'}
                </button>
                <p className="small faint" style={{ marginTop: 10, textAlign: 'center' }}>
                  Sent to <span className="mono">{EMPLOYER_CONFIRM_PATH}</span> · no personal data leaves this
                  page beyond your answer.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Demo aid — lets a presenter switch records without editing the URL. */}
        <div className="row" style={{ marginTop: 18, maxWidth: 560, width: '100%' }}>
          <span className="label">Demo</span>
          <select
            value={token || ''}
            onChange={(e) => {
              setPicked(null)
              setWage('')
              setState('idle')
              navigate(`/employer/${e.target.value}`)
            }}
            style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--border-strong)', fontSize: 12 }}
          >
            {(people.data || []).filter((p) => p.employer).slice(0, 80).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} @ {p.employer}
              </option>
            ))}
          </select>
          <Link className="btn btn--sm" to="/">Exit</Link>
        </div>
      </div>
    </div>
  )
}
