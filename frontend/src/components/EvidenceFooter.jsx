import { EvidenceMeter } from './Evidence.jsx'
import { describeEvidence } from '../lib/evidence.js'

/**
 * Panel-level provenance for charts whose individual points are too small to
 * carry their own badge. A chart of averages is still a claim about people,
 * so it says where it came from rather than presenting itself as neutral fact.
 */
export default function EvidenceFooter({ evidence, what }) {
  if (!evidence || !evidence.total) return null
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
      <EvidenceMeter evidence={evidence} />
      <div className="small muted" style={{ marginTop: 7 }}>
        {what} drawn from <b className="num">{evidence.total}</b> records —{' '}
        {describeEvidence(evidence)}.
      </div>
    </div>
  )
}
