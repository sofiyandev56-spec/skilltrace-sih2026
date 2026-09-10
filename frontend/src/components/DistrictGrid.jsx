import { int } from '../lib/format.js'
import { heatShade as shade } from '../lib/chartTheme.js'
import { useGov } from '../gov/GovContext.jsx'

const STEPS = [0, 12, 24, 36, 48, 60]

/**
 * Skill-gap intensity per district. A grid rather than a geographic map:
 * it reads accurately at a glance and needs no boundary data to be correct.
 */
export default function DistrictGrid({ districts = [], activeDistrict, onSelect }) {
  const { t } = useGov()
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
              title={t('districtGapTooltip', d.district, d.mismatch, d.top_gap_course)}
            >
              <div className="district__name">{d.district}</div>
              <div className="district__val">{d.mismatch}</div>
              <div className="district__meta">{int(d.trainees)} {t('trainees')}</div>
            </button>
          )
        })}
      </div>

      <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
        <div className="scalebar">
          <span>{t('narrowGap')}</span>
          <span className="scalebar__ramp" aria-hidden="true">
            {STEPS.map((s) => (
              <span key={s} style={{ background: shade(s).bg }} />
            ))}
          </span>
          <span>{t('wideGap')}</span>
        </div>
        <span className="faint small">{t('clickDistrictToFilter')}</span>
      </div>
    </div>
  )
}

