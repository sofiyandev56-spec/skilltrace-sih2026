import { AGE_GROUPS, CATEGORIES, COHORTS, COURSES, DISTRICTS, GENDERS } from '../api/mock/dataset.js'
import { useGov } from '../gov/GovContext.jsx'

const GENDER_HI = {
  Male: 'पुरुष (Male)',
  Female: 'महिला (Female)',
  Other: 'अन्य (Other)',
}

const CATEGORY_HI = {
  General: 'सामान्य (General)',
  OBC: 'अन्य पिछड़ा वर्ग (OBC)',
  SC: 'अनुसूचित जाति (SC)',
  ST: 'अनुसूचित जनजाति (ST)',
}

function Select({ label, value, onChange, children }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value || '')}>
        {children}
      </select>
    </label>
  )
}

/**
 * The five dashboard filters. They combine with AND — every figure below the
 * bar describes exactly the slice named in the summary line.
 */
export default function FilterBar({ filters, onChange, providers = [], resultCount }) {
  const { lang } = useGov()
  const hi = lang === 'hi'

  const demographics = [
    {
      group: hi ? 'आयु वर्ग' : 'Age',
      options: AGE_GROUPS.map((v) => ({
        value: `age_group:${v}`,
        label: hi ? `${v} वर्ष` : `${v} years`,
      })),
    },
    {
      group: hi ? 'लिंग' : 'Gender',
      options: GENDERS.map((v) => ({
        value: `gender:${v}`,
        label: hi ? (GENDER_HI[v] || v) : v,
      })),
    },
    {
      group: hi ? 'सामाजिक वर्ग' : 'Category',
      options: CATEGORIES.map((v) => ({
        value: `category:${v}`,
        label: hi ? (CATEGORY_HI[v] || v) : v,
      })),
    },
  ]

  const set = (key) => (value) => onChange({ ...filters, [key]: value })
  const active = Object.entries(filters).filter(([, v]) => v)

  const labelFor = (key, value) => {
    if (key === 'provider') return providers.find((p) => p.id === value)?.name || value
    if (key === 'demographic') {
      const [field, v] = value.split(':')
      const fieldLabel = hi
        ? (field === 'age_group' ? 'आयु' : field === 'gender' ? 'लिंग' : 'वर्ग')
        : (field === 'age_group' ? 'Age' : field === 'gender' ? 'Gender' : 'Category')
      const valLabel = hi
        ? (field === 'gender' ? GENDER_HI[v] || v : field === 'category' ? CATEGORY_HI[v] || v : `${v} वर्ष`)
        : (field === 'age_group' ? `${v} years` : v)
      return `${fieldLabel}: ${valLabel}`
    }
    return value
  }

  return (
    <div className="filters">
      <Select label={hi ? 'कोहॉर्ट / बैच' : 'Cohort / Batch'} value={filters.cohort} onChange={set('cohort')}>
        <option value="">{hi ? 'सभी कोहॉर्ट' : 'All cohorts'}</option>
        {COHORTS.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </Select>

      <Select label={hi ? 'कोर्स / ट्रेड' : 'Course'} value={filters.course} onChange={set('course')}>
        <option value="">{hi ? 'सभी कोर्स' : 'All courses'}</option>
        {COURSES.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </Select>

      <Select label={hi ? 'प्रशिक्षण केंद्र' : 'Training Centre'} value={filters.provider} onChange={set('provider')}>
        <option value="">{hi ? 'सभी केंद्र' : 'All centres'}</option>
        {providers.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>

      <Select label={hi ? 'जिला' : 'District'} value={filters.district} onChange={set('district')}>
        <option value="">{hi ? 'सभी जिले' : 'All districts'}</option>
        {DISTRICTS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </Select>

      <Select label={hi ? 'जनसांख्यिकी' : 'Demographic'} value={filters.demographic} onChange={set('demographic')}>
        <option value="">{hi ? 'सभी प्रशिक्षार्थी' : 'All trainees'}</option>
        {demographics.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </optgroup>
        ))}
      </Select>

      <div className="filters__actions">
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => onChange({})}
          disabled={active.length === 0}
        >
          {hi ? 'सभी फ़िल्टर साफ़ करें' : 'Clear all'}
        </button>
      </div>

      <div className="filters__summary">
        {active.length === 0 ? (
          <span>
            {hi ? (
              <>
                दिखाए जा रहे हैं <b className="num">{resultCount ?? '—'}</b> प्रशिक्षार्थी — सभी कोहॉर्ट, सभी केंद्र, सभी जिले।
              </>
            ) : (
              <>
                Showing <b className="num">{resultCount ?? '—'}</b> trainees — all cohorts, all centres,
                all districts.
              </>
            )}
          </span>
        ) : (
          <>
            <span>
              {hi ? (
                <>दिखाए जा रहे हैं <b className="num">{resultCount ?? '—'}</b> प्रशिक्षार्थी जो मेल खाते हैं:</>
              ) : (
                <>Showing <b className="num">{resultCount ?? '—'}</b> trainees matching</>
              )}
            </span>
            {active.map(([k, v]) => (
              <span className="chip" key={k}>
                {labelFor(k, v)}
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, [k]: '' })}
                  aria-label={hi ? `फ़िल्टर हटाएं ${labelFor(k, v)}` : `Remove filter ${labelFor(k, v)}`}
                >
                  ×
                </button>
              </span>
            ))}
            <span className="faint">{hi ? '(सभी शर्तें पूरी होनी चाहिए)' : '(all conditions must match)'}</span>
          </>
        )}
      </div>
    </div>
  )
}
