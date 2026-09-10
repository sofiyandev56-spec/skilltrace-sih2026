import { AGE_GROUPS, CATEGORIES, COHORTS, COURSES, DISTRICTS, GENDERS } from '../api/mock/dataset.js'

const DEMOGRAPHICS = [
  { group: 'Age', options: AGE_GROUPS.map((v) => ({ value: `age_group:${v}`, label: `${v} years` })) },
  { group: 'Gender', options: GENDERS.map((v) => ({ value: `gender:${v}`, label: v })) },
  { group: 'Category', options: CATEGORIES.map((v) => ({ value: `category:${v}`, label: v })) },
]

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
  const set = (key) => (value) => onChange({ ...filters, [key]: value })
  const active = Object.entries(filters).filter(([, v]) => v)

  const labelFor = (key, value) => {
    if (key === 'provider') return providers.find((p) => p.id === value)?.name || value
    if (key === 'demographic') {
      const [field, v] = value.split(':')
      return `${field === 'age_group' ? 'Age' : field === 'gender' ? 'Gender' : 'Category'}: ${v}`
    }
    return value
  }

  return (
    <div className="filters">
      <Select label="Cohort / Batch" value={filters.cohort} onChange={set('cohort')}>
        <option value="">All cohorts</option>
        {COHORTS.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </Select>

      <Select label="Course" value={filters.course} onChange={set('course')}>
        <option value="">All courses</option>
        {COURSES.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </Select>

      <Select label="Training Centre" value={filters.provider} onChange={set('provider')}>
        <option value="">All centres</option>
        {providers.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>

      <Select label="District" value={filters.district} onChange={set('district')}>
        <option value="">All districts</option>
        {DISTRICTS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </Select>

      <Select label="Demographic" value={filters.demographic} onChange={set('demographic')}>
        <option value="">All trainees</option>
        {DEMOGRAPHICS.map((g) => (
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
          Clear all
        </button>
      </div>

      <div className="filters__summary">
        {active.length === 0 ? (
          <span>
            Showing <b className="num">{resultCount ?? '—'}</b> trainees — all cohorts, all centres,
            all districts.
          </span>
        ) : (
          <>
            <span>
              Showing <b className="num">{resultCount ?? '—'}</b> trainees matching
            </span>
            {active.map(([k, v]) => (
              <span className="chip" key={k}>
                {labelFor(k, v)}
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, [k]: '' })}
                  aria-label={`Remove filter ${labelFor(k, v)}`}
                >
                  ×
                </button>
              </span>
            ))}
            <span className="faint">(all conditions must match)</span>
          </>
        )}
      </div>
    </div>
  )
}
