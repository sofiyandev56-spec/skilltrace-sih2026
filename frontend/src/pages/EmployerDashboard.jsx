import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useGov } from '../gov/GovContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { inr, longDate } from '../lib/format.js'

/**
 * The employer's side of the three-month rule.
 *
 * An employer confirming that someone is still on their payroll is one of the
 * two things that can turn a reported placement into counted employment, so
 * this form is deliberately plain about what it is being asked: whether the
 * person is still working, at what wage, in what role. "No longer working" is
 * as useful an answer as "still working", and is recorded rather than
 * discouraged.
 */
const FILTERS = [
  { key: 'all', labelKey: 'edAll' },
  { key: 'pending', labelKey: 'edPending' },
  { key: 'confirmed', labelKey: 'edConfirmed' },
]

const emptyForm = { is_working: true, salary: '', job_role: '', notes: '' }

export default function EmployerDashboard() {
  const { t } = useGov()
  const { toast } = useToast()
  const { employer, session } = useAuth()

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [active, setActive] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const data = await api.getEmployerTrainees()
    setRows(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const open = (row) => {
    setActive(row)
    setForm({
      is_working: true,
      salary: row.salary ?? '',
      job_role: row.job_role ?? '',
      notes: '',
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!active) return
    setSaving(true)
    const res = await api.verifyMilestone({
      trainee_id: active.id ?? active.trainee_id,
      employer: employer?.company_name ?? session?.company_name ?? null,
      is_working: form.is_working,
      salary: form.salary === '' ? null : Number(form.salary),
      job_role: form.job_role || null,
      notes: form.notes || null,
    })
    setSaving(false)
    if (res?.offline) {
      toast.push(t('edOffline'), { tone: 'danger' })
      return
    }
    toast.push(form.is_working ? t('edConfirmedToast') : t('edEndedToast'))
    setActive(null)
    load()
  }

  const visible = rows.filter((r) => {
    if (filter === 'all') return true
    const done = Boolean(r.verified || r.confirmed)
    return filter === 'confirmed' ? done : !done
  })

  return (
    <div className="page">
      <div className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">{t('edTitle')}</h2>
            <p className="panel__sub">
              {employer?.company_name || session?.company_name
                ? t('edSubtitleNamed', employer?.company_name ?? session?.company_name)
                : t('edSubtitle')}
            </p>
          </div>
          <button type="button" className="btn btn--sm" onClick={load}>
            {t('edRefresh')}
          </button>
        </div>

        <div className="callout-rule">
          <div>
            <strong>{t('edWhyTitle')}</strong> {t('edWhyBody')}
          </div>
        </div>

        <div className="filters__actions" role="group" aria-label={t('edFilterLabel')}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`btn btn--sm${filter === f.key ? ' btn--primary' : ''}`}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 240 }} />
        ) : visible.length === 0 ? (
          <div className="empty">
            <p>{t('edEmpty')}</p>
          </div>
        ) : (
          <div className="tblwrap">
            <table className="tbl">
              <caption className="sr-only">{t('edTitle')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('edColTrainee')}</th>
                  <th scope="col">{t('edColRole')}</th>
                  <th scope="col">{t('edColSince')}</th>
                  <th scope="col">{t('edColAction')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id ?? r.trainee_id}>
                    <th scope="row">
                      <strong>{r.name || '—'}</strong>
                      <br />
                      <span className="faint small mono">{r.id ?? r.trainee_id}</span>
                    </th>
                    <td>{r.job_role || '—'}</td>
                    <td className="num">{r.placement_date ? longDate(r.placement_date) : '—'}</td>
                    <td>
                      <button type="button" className="btn btn--sm btn--accent" onClick={() => open(r)}>
                        {t('edConfirmAction')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {active ? (
        <div className="panel">
          <div className="panel__head">
            <h3 className="panel__title">{t('edFormTitle', active.name ?? active.id)}</h3>
            <button type="button" className="btn btn--sm" onClick={() => setActive(null)}>
              {t('edCancel')}
            </button>
          </div>

          <form className="filters" onSubmit={submit}>
            <fieldset className="fieldset">
              <legend className="fieldset__legend">{t('edStillWorking')}</legend>
              <div className="filters__actions">
                <button
                  type="button"
                  className={`btn btn--sm${form.is_working ? ' btn--primary' : ''}`}
                  aria-pressed={form.is_working}
                  onClick={() => setForm((f) => ({ ...f, is_working: true }))}
                >
                  {t('edYesWorking')}
                </button>
                <button
                  type="button"
                  className={`btn btn--sm${form.is_working ? '' : ' btn--primary'}`}
                  aria-pressed={!form.is_working}
                  onClick={() => setForm((f) => ({ ...f, is_working: false }))}
                >
                  {t('edNoLonger')}
                </button>
              </div>
            </fieldset>

            <label className="field">
              <span className="field__label" htmlFor="ed-role">
                {t('edColRole')}
              </span>
              <input
                id="ed-role"
                className="input"
                type="text"
                value={form.job_role}
                onChange={(e) => setForm((f) => ({ ...f, job_role: e.target.value }))}
              />
            </label>

            <label className="field">
              <span className="field__label" htmlFor="ed-salary">
                {t('edMonthlyWage')}
              </span>
              <input
                id="ed-salary"
                className="input"
                type="number"
                inputMode="numeric"
                min="0"
                value={form.salary}
                onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
              />
            </label>

            <label className="field">
              <span className="field__label" htmlFor="ed-notes">
                {t('edNotes')}
              </span>
              <input
                id="ed-notes"
                className="input"
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>

            <div className="filters__actions">
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? t('edSubmitting') : t('edSubmit')}
              </button>
            </div>
          </form>

          <p className="note">
            {t('edRecordedAs')}{' '}
            {form.salary !== '' ? t('edWageShown', inr(Number(form.salary))) : t('edNoWage')}
          </p>
        </div>
      ) : null}
    </div>
  )
}
