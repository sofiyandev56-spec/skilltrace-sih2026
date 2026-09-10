import { int } from '../lib/format.js'

/**
 * Certification through to work in the trained occupation.
 *
 * Each bar is a share of the original certified cohort, not of the stage above
 * it, so the bars stay comparable and the drop-off between two stages is the
 * difference between their widths rather than something the reader has to
 * compute. The drop annotations name where people are actually being lost.
 */
export default function Funnel({ stages }) {
  if (!stages?.length) {
    return <p className="empty">No cohort data for this filter selection yet.</p>
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
                  ↓ {int(lost)} did not reach this stage
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
        <summary>View this funnel as a table</summary>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col">Meaning</th>
                <th scope="col">Trainees</th>
                <th scope="col">Share of certified</th>
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
