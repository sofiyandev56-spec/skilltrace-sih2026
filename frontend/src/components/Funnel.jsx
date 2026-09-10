import React from 'react'
import { int } from '../lib/format.js'
import { useGov } from '../gov/GovContext.jsx'

/**
 * Certification through to work in the trained occupation.
 *
 * Each bar is a share of the original certified cohort, not of the stage above
 * it, so the bars stay comparable and the drop-off between two stages is the
 * difference between their widths rather than something the reader has to
 * compute. The drop annotations name where people are actually being lost.
 */
export default function Funnel({ stages }) {
  const { t } = useGov()

  if (!stages?.length) {
    return <p className="empty">{t('noCohortData')}</p>
  }

  return (
    <>
      <div className="funnel">
        {stages.map((s, i) => {
          const prev = i > 0 ? stages[i - 1] : null
          const lost = prev ? prev.count - s.count : 0
          return (
            <div key={s.stage}>
              {prev && lost > 0 ? (
                <p className="funnel__drop">
                  {t('didNotReach', int(lost))}
                </p>
              ) : null}
              <div className="funnel__row">
                <span className="funnel__label">
                  {s.stage}
                  <span className="funnel__note">{s.note}</span>
                </span>
                <span className="funnel__track">
                  <span className="funnel__fill" style={{ width: `${Math.max(s.pct, 3)}%` }}>
                    {s.pct}%
                  </span>
                </span>
                <span className="funnel__count">{int(s.count)}</span>
              </div>
            </div>
          )
        })}
      </div>

      <details className="datatable">
        <summary>{t('viewAsTable')}</summary>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">{t('colStage')}</th>
                <th scope="col">{t('colMeaning')}</th>
                <th scope="col">{t('trainees')}</th>
                <th scope="col">{t('colShareCertified')}</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s) => (
                <tr key={s.stage}>
                  <td>{s.stage}</td>
                  <td className="muted">{s.note}</td>
                  <td className="num">{int(s.count)}</td>
                  <td className="num">{s.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  )
}
