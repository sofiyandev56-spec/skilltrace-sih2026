import { BUCKET_META, getBucketLabel } from '../lib/evidence.js'
import { int, pct } from '../lib/format.js'
import { useGov } from '../gov/GovContext.jsx'

const ORDER = ['employed', 'self_employed', 'apprentice', 'awaiting_confirmation', 'not_working', 'no_data']

/**
 * Where every trainee in the current slice actually is. The summary cards
 * above show the four headline outcomes; this bar accounts for the remainder
 * so the percentages always reconcile to 100%.
 */
export default function CompositionBar({ outcomes, total }) {
  const { lang } = useGov()
  const hi = lang === 'hi'

  if (!outcomes) return null
  const segments = ORDER.map((key) => {
    const meta = BUCKET_META[key]
    const label = hi ? meta.labelHi || meta.label : meta.label
    return {
      key,
      ...meta,
      label,
      ...outcomes[key],
    }
  }).filter((s) => s.count > 0)

  return (
    <div>
      <div className="comp">
        {segments.map((s) => (
          <div
            key={s.key}
            className="comp__seg"
            style={{ width: `${s.pct}%`, background: s.color }}
            title={`${s.label}: ${pct(s.pct)} (${int(s.count)} ${hi ? 'प्रशिक्षार्थी' : 'trainees'})`}
          >
            {s.pct >= 7 ? pct(s.pct, 0) : ''}
          </div>
        ))}
      </div>
      <div className="comp__legend">
        {segments.map((s) => (
          <span className="comp__key" key={s.key}>
            <i className="comp__swatch" style={{ background: s.color }} aria-hidden="true" />
            {s.label} <b className="num" style={{ color: 'var(--text)' }}>{pct(s.pct)}</b>
            <span className="faint num">({int(s.count)})</span>
          </span>
        ))}
        <span className="comp__key faint" style={{ marginLeft: 'auto' }}>
          {hi ? `${int(total)} प्रशिक्षार्थी इस अनुभाग में` : `${int(total)} trainees in this slice`}
        </span>
      </div>
    </div>
  )
}
