import { int } from '../lib/format.js'

/** Terracotta ramp — darker means a wider gap between intended and actual roles. */
function shade(mismatch) {
  if (mismatch === null || mismatch === undefined) return { bg: '#f6f8fa', fg: '#8a949e' }
  const t = Math.min(1, Math.max(0, mismatch / 60))
  const mix = (from, to) => Math.round(from + (to - from) * t)
  const bg = `rgb(${mix(251, 143)}, ${mix(241, 74)}, ${mix(236, 41)})`
  return { bg, fg: t > 0.55 ? '#fff' : '#14202e' }
}

const STEPS = [0, 12, 24, 36, 48, 60]

/**
 * Skill-gap intensity per district. A grid rather than a geographic map:
 * it reads accurately at a glance and needs no boundary data to be correct.
 */
export default function DistrictGrid({ districts = [], activeDistrict, onSelect }) {
  const present = districts.filter((d) => d.trainees > 0)

  return (
    <div>
      <div className="districts">
        {present.map((d) => {
          const c = shade(d.mismatch)
          return (
            <button
              type="button"
              key={d.district}
              className={`district ${activeDistrict === d.district ? 'is-active' : ''}`}
              style={{ background: c.bg, color: c.fg, borderColor: 'transparent' }}
              onClick={() => onSelect?.(activeDistrict === d.district ? '' : d.district)}
              title={`${d.district}: ${d.mismatch}-point gap. Widest gap in ${d.top_gap_course}.`}
            >
              <div className="district__name">{d.district}</div>
              <div className="district__val">{d.mismatch}</div>
              <div className="district__meta">{int(d.trainees)} trainees</div>
            </button>
          )
        })}
      </div>

      <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
        <div className="scalebar">
          <span>Narrow gap</span>
          <span className="scalebar__ramp" aria-hidden="true">
            {STEPS.map((s) => (
              <span key={s} style={{ background: shade(s).bg }} />
            ))}
          </span>
          <span>Wide gap</span>
        </div>
        <span className="faint small">Click a district to filter the whole dashboard</span>
      </div>
    </div>
  )
}
