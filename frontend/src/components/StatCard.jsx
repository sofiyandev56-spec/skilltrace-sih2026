import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EvidenceBreakdown, EvidenceMeter } from './Evidence.jsx'
import EvidenceDrawer from './EvidenceDrawer.jsx'
import { describeEvidence } from '../lib/evidence.js'
import { useDismiss } from '../lib/useApi.js'

/**
 * A headline figure with its evidence attached.
 *
 * Nothing on this dashboard shows a number without showing how much of it can
 * be trusted: the stacked meter is always visible, clicking the card opens the
 * tier breakdown, and the breakdown opens the full drill-down drawer.
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
  definition,
  cohort,
  population,
  eventCount,
}) {
  const [open, setOpen] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
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
          {evidence?.total ? (
            <button
              type="button"
              className="pop__more"
              onClick={() => {
                setOpen(false)
                setDrawer(true)
              }}
            >
              View evidence →
            </button>
          ) : null}
        </div>
      )}

      <EvidenceDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title={label}
        value={`${value}${unit || ''}`}
        definition={definition || note}
        cohort={cohort}
        population={population}
        evidence={evidence}
        eventCount={eventCount}
        onViewEvents={() => {
          setDrawer(false)
          navigate('/audit')
        }}
        onMethodology={() => {
          setDrawer(false)
          navigate('/consent')
        }}
      />
    </div>
  )
}
