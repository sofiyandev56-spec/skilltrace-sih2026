import { useGov } from '../gov/GovContext.jsx'
import { inr, monthLabel } from '../lib/format.js'

/**
 * The bank extract, drawn.
 *
 * A run of salary credits is the one piece of evidence in this system that
 * nobody has an incentive to overstate, so it is worth showing rather than
 * asserting: each bar is one month, filled where money arrived, and the run
 * that satisfies the 3-month rule is marked.
 *
 * An unbanked trainee gets an explicit panel instead of an empty chart. No
 * bank record is missing evidence, never a bad outcome, and the two must not
 * be made to look alike.
 */
export default function IncomeContinuity({ record }) {
  const { t } = useGov()
  const summary = record?.bank_summary
  const series = Array.isArray(record?.bank_series) ? record.bank_series : []
  const months = Array.isArray(record?.bank_months) ? record.bank_months : []
  const proven = record?.proof === 'bank' ? record.bank : null

  if (!summary) return null

  if (!summary.verified) {
    return (
      <div className="bankrow bankrow--unbanked">
        <div className="bankrow__head">
          <h3 className="bankrow__title">{t('icTitle')}</h3>
        </div>
        <p className="bankrow__unbanked-title">{t('icUnbanked')}</p>
        <p className="bankrow__unbanked-body">{t('icUnbankedBody')}</p>
      </div>
    )
  }

  const credited = series.filter((v) => typeof v === 'number' && v > 0)
  const peak = credited.length ? Math.max(...credited) : 1
  const fromIdx = proven ? months.indexOf(proven.from) : -1
  const throughIdx = proven ? months.indexOf(proven.through) : -1

  return (
    <div className="bankrow">
      <div className="bankrow__head">
        <h3 className="bankrow__title">{t('icTitle')}</h3>
        <span className="bankrow__count num">
          {t('icMonthsCredited', summary.months_credited, series.length)}
        </span>
      </div>

      <div className="bankrow__chart" role="img" aria-label={t('icChartLabel')}>
        {series.map((v, i) => {
          const amount = typeof v === 'number' ? v : 0
          const isCredited = amount > 0
          const inRun = fromIdx >= 0 && i >= fromIdx && i <= throughIdx
          return (
            <span
              key={months[i] ?? i}
              className={`bankrow__bar${isCredited ? ' is-credited' : ''}${inRun ? ' is-run' : ''}`}
              style={{ '--h': `${isCredited ? Math.max(12, (amount / peak) * 100) : 0}%` }}
              title={`${monthLabel(months[i])} · ${isCredited ? inr(amount) : t('icNoCredit')}`}
            />
          )
        })}
      </div>

      <div className="bankrow__axis">
        <span>{monthLabel(months[0])}</span>
        <span>{monthLabel(months[months.length - 1])}</span>
      </div>

      {proven ? (
        <p className="bankrow__proof">
          <span className="bankrow__proof-tick" aria-hidden="true">
            &#10003;
          </span>
          {t('icProvenRun', proven.months, monthLabel(proven.from), monthLabel(proven.through))}
        </p>
      ) : (
        <p className="bankrow__note">{t('icNoRun')}</p>
      )}

      <details className="bankrow__table">
        <summary>{t('icShowFigures')}</summary>
        <table className="tbl">
          <caption className="sr-only">{t('icChartLabel')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('icMonth')}</th>
              <th scope="col">{t('icCredited')}</th>
            </tr>
          </thead>
          <tbody>
            {series.map((v, i) => (
              <tr key={months[i] ?? i}>
                <th scope="row">{monthLabel(months[i])}</th>
                <td className="num">
                  {typeof v === 'number' && v > 0 ? inr(v) : t('icNoCredit')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
