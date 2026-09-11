import { AGE_GROUPS, CATEGORIES, COHORTS, COURSES, DISTRICTS, GENDERS } from '../api/mock/dataset.js'
import { useGov } from '../gov/GovContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'

function Select({ label, value, onChange, disabled, children }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value || '')} disabled={disabled}>
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
  const { t } = useGov()
  const { officer } = useAuth()
  const assignedDistrict = officer?.district || null

  const set = (key) => (value) => {
    if (key === 'district' && assignedDistrict) return
    onChange({
      ...filters,
      [key]: value,
      ...(assignedDistrict ? { district: assignedDistrict } : {}),
    })
  }

  const active = Object.entries(filters).filter(([, v]) => v)
  const availableDistricts = assignedDistrict ? [assignedDistrict] : DISTRICTS
  const clearableActive = assignedDistrict ? active.filter(([k]) => k !== 'district') : active

  const handleClearAll = () => {
    onChange(assignedDistrict ? { district: assignedDistrict } : {})
  }

  const DEMOGRAPHICS = [
    { group: t('age'), options: AGE_GROUPS.map((v) => ({ value: `age_group:${v}`, label: `${v} ${t('years')}` })) },
    { group: t('gender'), options: GENDERS.map((v) => ({ value: `gender:${v}`, label: v })) },
    { group: t('category'), options: CATEGORIES.map((v) => ({ value: `category:${v}`, label: v })) },
  ]

  const labelFor = (key, value) => {
    if (key === 'provider') return providers.find((p) => p.id === value)?.name || value
    if (key === 'demographic') {
      const [field, v] = value.split(':')
      const fieldLabel = field === 'age_group' ? t('age') : field === 'gender' ? t('gender') : t('category')
      return `${fieldLabel}: ${v}`
    }
    return value
  }

  return (
    <div className="filters">
      <Select label={t('cohortBatch')} value={filters.cohort} onChange={set('cohort')}>
        <option value="">{t('allCohortsOption')}</option>
        {COHORTS.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </Select>

      <Select label={t('course')} value={filters.course} onChange={set('course')}>
        <option value="">{t('allCourses')}</option>
        {COURSES.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </Select>

      <Select label={t('trainingCentre')} value={filters.provider} onChange={set('provider')}>
        <option value="">{t('allCentres')}</option>
        {providers.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>

      <Select
        label={t('district')}
        value={assignedDistrict || filters.district}
        onChange={set('district')}
        disabled={Boolean(assignedDistrict)}
      >
        {!assignedDistrict && <option value="">{t('allDistricts')}</option>}
        {availableDistricts.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </Select>

      <Select label={t('demographic')} value={filters.demographic} onChange={set('demographic')}>
        <option value="">{t('allTrainees')}</option>
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
          onClick={handleClearAll}
          disabled={clearableActive.length === 0}
        >
          {t('clearAll')}
        </button>
      </div>

      <div className="filters__summary">
        {active.length === 0 ? (
          <span>
            {t('showing')} <b className="num">{resultCount ?? '—'}</b> {t('traineesAllCohorts')}
          </span>
        ) : (
          <>
            <span>
              {t('showing')} <b className="num">{resultCount ?? '—'}</b> {t('traineesMatching')}
            </span>
            {active.map(([k, v]) => (
              <span className="chip" key={k}>
                {labelFor(k, v)}
                {!(assignedDistrict && k === 'district') && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, [k]: '', ...(assignedDistrict ? { district: assignedDistrict } : {}) })}
                    aria-label={`${t('removeFilter')} ${labelFor(k, v)}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            <span className="faint">{t('allConditionsMustMatch')}</span>
          </>
        )}
      </div>
    </div>
  )
}
