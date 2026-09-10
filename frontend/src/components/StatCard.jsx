import { useRef, useState } from 'react'
import { EvidenceBreakdown, EvidenceMeter } from './Evidence.jsx'
import { describeEvidence } from '../lib/evidence.js'
import { useDismiss } from '../lib/useApi.js'

/**
 * A headline figure with its evidence attached.
 *
 * Nothing on this dashboard shows a number without showing how much of it can
 * be trusted: the stacked meter is always visible, and clicking the card opens
 * the exact tier breakdown.
 */
export default function StatCard({
  label,
  value,
  unit,
  sub,
  evidence,
  note,
  tone,
  delta,
  changed,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useDismiss(ref, () => setOpen(false), open)

  const classes = [
    'stat',
    tone === 'total' ? 'stat--total' : '',
    changed ? 'stat--changed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className={classes}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={evidence ? describeEvidence(evidence) : undefined}
      >
        <span className="stat__label">{label}</span>

        <span className="row" style={{ gap: 8, alignItems: 'baseline' }}>
          <span className="stat__value">
            {value}
            {unit ? <small>{unit}</small> : null}
          </span>
          {delta ? (
            <span className={`delta delta--${delta.direction}`}>
              {delta.direction === 'down' ? '▼' : '▲'} {delta.text}
            </span>
          ) : null}
        </span>

        <span className="stat__foot">
          {sub ? <span className="stat__sub">{sub}</span> : null}
          {evidence ? <EvidenceMeter evidence={evidence} /> : null}
        </span>
      </button>

      {open && (
        <div className="pop">
          <EvidenceBreakdown evidence={evidence} note={note} />
        </div>
      )}
    </div>
  )
}
