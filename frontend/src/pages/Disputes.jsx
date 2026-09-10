import { useState } from 'react'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { longDate, relativeAge } from '../lib/format.js'

const RESOLUTIONS = [
  { key: 'employer_stands', label: "Employer's record stands", tone: 'btn' },
  { key: 'trainee_stands', label: "Trainee's record stands", tone: 'btn' },
  { key: 'field_verification', label: 'Send for field verification', tone: 'btn' },
]

const RESOLUTION_LABEL = Object.fromEntries(RESOLUTIONS.map((r) => [r.key, r.label]))

function Dispute({ dispute, onResolve, busy }) {
  const [note, setNote] = useState('')
  const [expanded, setExpanded] = useState(false)
  const resolved = dispute.status === 'resolved'

  return (
    <article className={`dispute ${resolved ? 'is-resolved' : ''}`}>
      <div className="dispute__head">
        <div>
          <div className="dispute__who">{dispute.trainee_name || dispute.trainee_id}</div>
          <div className="dispute__meta">
            <span className="mono">{dispute.trainee_id}</span> · {dispute.course} · {dispute.district}
          </div>
        </div>
        <div className="spacer" style={{ marginLeft: 'auto' }} />
        <div style={{ textAlign: 'right' }}>
          <div className="label">Raised</div>
          <div className="small num">{longDate(dispute.date)}</div>
          <div className="faint small">{relativeAge(dispute.date, '2026-09-10')}</div>
        </div>
      </div>

      <div className="dispute__claims">
        <div className="claim claim--employer">
          <div className="claim__src">
            <span className="claim__label">Employer says</span>
            <span className="faint small">{dispute.employer}</span>
          </div>
          <p className="claim__text">{dispute.employer_claim}</p>
        </div>
        <div className="claim claim--trainee">
          <div className="claim__src">
            <span className="claim__label">Trainee says</span>
            <span className="faint small">{dispute.trainee_name}</span>
          </div>
          <p className="claim__text">{dispute.trainee_claim}</p>
        </div>
      </div>

      <div className="dispute__foot">
        {resolved ? (
          <>
            <span className="tier tier--high">
              <i className="tier__dot" aria-hidden="true" />
              Resolved
            </span>
            <span className="small muted">
              {RESOLUTION_LABEL[dispute.resolution] || dispute.resolution} · {longDate(dispute.resolved_at)}
              {dispute.resolved_by ? ` · ${dispute.resolved_by}` : ''}
            </span>
            {dispute.note ? <span className="small faint">“{dispute.note}”</span> : null}
          </>
        ) : expanded ? (
          <>
            <input
              className="field"
              style={{ flex: '1 1 220px', padding: '7px 9px', border: '1px solid var(--border-strong)' }}
              placeholder="Reviewer note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {RESOLUTIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                className="btn btn--sm"
                disabled={busy}
                onClick={() => onResolve(dispute.id, { resolution: r.key, note })}
              >
                {r.label}
              </button>
            ))}
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => setExpanded(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="small muted">
              Neither claim is counted in the dashboard until a reviewer decides.
            </span>
            <span className="spacer" />
            <button type="button" className="btn btn--sm btn--primary" onClick={() => setExpanded(true)}>
              Mark resolved
            </button>
          </>
        )}
      </div>
    </article>
  )
}

export default function Disputes() {
  const [tab, setTab] = useState('open')
  const [busy, setBusy] = useState(false)
  const { data, loading, reload } = useApi(() => api.getDisputes(), [])

  const disputes = data || []
  const open = disputes.filter((d) => d.status !== 'resolved')
  const resolved = disputes.filter((d) => d.status === 'resolved')
  const shown = tab === 'open' ? open : resolved

  const handleResolve = async (id, body) => {
    setBusy(true)
    await api.resolveDispute(id, { ...body, resolved_by: 'Reviewer (demo)' })
    await reload()
    setBusy(false)
  }

  return (
    <div className="stack">
      <div className="note">
        <b>We don’t guess.</b> When an employer and a trainee describe the same job differently, SkillTrace
        records both statements and excludes the record from outcome figures until a human reviewer decides.
        No algorithm picks a winner.
      </div>

      <div className="row">
        <button
          type="button"
          className={`btn btn--sm ${tab === 'open' ? 'btn--primary' : ''}`}
          onClick={() => setTab('open')}
        >
          Open <span className="num">({open.length})</span>
        </button>
        <button
          type="button"
          className={`btn btn--sm ${tab === 'resolved' ? 'btn--primary' : ''}`}
          onClick={() => setTab('resolved')}
        >
          Resolved <span className="num">({resolved.length})</span>
        </button>
      </div>

      {loading && !data ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : shown.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <h4>{tab === 'open' ? 'No open disputes' : 'Nothing resolved yet'}</h4>
            <p>
              {tab === 'open'
                ? 'Every conflicting record has been reviewed.'
                : 'Resolved disputes will be listed here with the reviewer’s decision.'}
            </p>
          </div>
        </div>
      ) : (
        shown.map((d) => <Dispute key={d.id} dispute={d} onResolve={handleResolve} busy={busy} />)
      )}
    </div>
  )
}
