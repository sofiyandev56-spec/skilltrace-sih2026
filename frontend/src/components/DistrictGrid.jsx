import { int } from '../lib/format.js'
import { heatShade as shade } from '../lib/chartTheme.js'
import { useGov } from '../gov/GovContext.jsx'

const STEPS = [0, 12, 24, 36, 48, 60]

/**
 * Skill-gap intensity per district. A grid rather than a geographic map:
 * it reads accurately at a glance and needs no boundary data to be correct.
 */
export default function DistrictGrid({ districts = [], activeDistrict, onSelect }) {
  const { lang } = useGov()
  const hi = lang === 'hi'
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
              title={
                hi
                  ? `${d.district}: ${d.mismatch}-अंक अंतराल। ${d.top_gap_course} में सबसे बड़ा अंतर।`
                  : `${d.district}: ${d.mismatch}-point gap. Widest gap in ${d.top_gap_course}.`
              }
            >
              <div className="district__name">{d.district}</div>
              <div className="district__val">{d.mismatch}</div>
              <div className="district__meta">{int(d.trainees)} {hi ? 'प्रशिक्षार्थी' : 'trainees'}</div>
            </button>
          )
        })}
      </div>

      <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
        <div className="scalebar">
          <span>{hi ? 'कम अंतराल' : 'Narrow gap'}</span>
          <span className="scalebar__ramp" aria-hidden="true">
            {STEPS.map((s) => (
              <span key={s} style={{ background: shade(s).bg }} />
            ))}
          </span>
          <span>{hi ? 'अधिक अंतराल' : 'Wide gap'}</span>
        </div>
        <span className="faint small">
          {hi ? 'डैशबोर्ड फ़िल्टर करने के लिए जिले पर क्लिक करें' : 'Click a district to filter the whole dashboard'}
        </span>
      </div>
    </div>
  )
}
