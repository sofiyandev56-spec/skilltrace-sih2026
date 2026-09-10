import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EvidenceBadge } from './Evidence.jsx'
import { dominantTier } from '../lib/evidence.js'
import { int } from '../lib/format.js'
import { MAGNITUDE } from '../lib/chartTheme.js'

const COLUMNS = [
  { key: 'name', label: 'Training centre', align: 'left' },
  { key: 'district', label: 'District', align: 'left' },
  { key: 'certified_count', label: 'Certified', align: 'right' },
  { key: 'headline_placement_pct', label: 'Reported', align: 'right' },
  { key: 'verified_placement_pct', label: 'Verified', align: 'right', bar: true },
  { key: 'proof_gap', label: 'Unproven gap', align: 'right' },
  { key: 'retention_3mo', label: 'Retention 3mo', align: 'right' },
  { key: 'role_match_pct', label: 'Role match', align: 'right' },
  { key: 'stale_pct', label: 'Stale', align: 'right' },
]

const PctCell = ({ value }) =>
  value === null || value === undefined ? (
    <span className="faint" title="Checkpoint not yet reached for this centre">n/a</span>
  ) : (
    <span className="num">{value}%</span>
  )

/**
 * A cell that goes saffron once it crosses the threshold where an officer
 * should look. Colour is never the only signal: the value is always readable,
 * and crossing cells also carry a title explaining why they are marked.
 */
const FlagCell = ({ value, over, under, why }) => {
  if (value === null || value === undefined) {
    return <span className="faint">n/a</span>
  }
  const flagged = (over !== undefined && value >= over) || (under !== undefined && value <= under)
  return (
    <span className={`num ${flagged ? 'cell--flag' : ''}`} title={flagged ? why : undefined}>
      {value}%{flagged ? <i className="cell__mark" aria-label=", needs attention"> ●</i> : null}
    </span>
  )
}

/** Centre ranking. Every column sorts; verified placement is the default order. */
export default function ProviderTable({ providers = [], onSelect, activeProvider }) {
  const [sort, setSort] = useState({ key: 'verified_placement_pct', dir: 'desc' })

  const rows = useMemo(() => {
    const copy = [...providers]
    copy.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      // Centres whose checkpoint has not come round yet always sort last.
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === 'string') {
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sort.dir === 'asc' ? av - bv : bv - av
    })
    return copy
  }, [providers, sort])

  const toggle = (key) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' || key === 'district' ? 'asc' : 'desc' },
    )

  if (!providers.length) return <div className="empty">No training centres match these filters.</div>

  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th className="rank">#</th>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                className={`sortable ${c.align === 'right' ? 'right' : ''}`}
                onClick={() => toggle(c.key)}
                aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {c.label}
                {sort.key === c.key && <span className="arrow">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr
              key={p.id}
              onClick={() => onSelect?.(activeProvider === p.id ? '' : p.id)}
              style={{
                cursor: onSelect ? 'pointer' : undefined,
                background: activeProvider === p.id ? 'var(--accent-wash)' : undefined,
              }}
            >
              <td className="rank">{i + 1}</td>
              <td>
                <Link className="tbl__link" to={`/providers/${p.id}`}>
                  {p.name}
                </Link>
                <div className="faint small mono">{p.id}</div>
              </td>
              <td>{p.district}</td>
              <td className="right num">{int(p.certified_count)}</td>
              <td className="right num faint">{p.headline_placement_pct}%</td>
              <td className="right">
                <div className="cellbar">
                  <EvidenceBadge trust={dominantTier(p.evidence).key} small />
                  <span className="num" style={{ fontWeight: 650, minWidth: 34 }}>
                    {p.verified_placement_pct}%
                  </span>
                  <span className="cellbar__track">
                    {/* Neutral fill — length carries the magnitude. Colouring this
                        by threshold would reuse a tier colour to mean "above
                        target", which is not what green means anywhere else. */}
                    <span
                      className="cellbar__fill"
                      style={{ width: `${p.verified_placement_pct}%`, background: MAGNITUDE }}
                    />
                  </span>
                </div>
              </td>
              <td className="right">
                <FlagCell
                  value={p.proof_gap}
                  over={45}
                  why="Most of this centre's reported placements cannot be shown to have lasted three months."
                />
              </td>
              <td className="right"><PctCell value={p.retention_3mo} /></td>
              <td className="right">
                <FlagCell
                  value={p.role_match_pct}
                  under={5}
                  why="Almost no one from this centre is working in the occupation they trained for."
                />
              </td>
              <td className="right">
                <FlagCell
                  value={p.stale_pct}
                  over={55}
                  why="This centre's outcome rates rest on a shrinking base of responding trainees."
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
