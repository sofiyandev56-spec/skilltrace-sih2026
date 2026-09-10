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
  { key: 'verified_placement_pct', label: 'Verified placement', align: 'right', bar: true },
  { key: 'retention_3mo', label: 'Retention 3mo', align: 'right' },
  { key: 'retention_6mo', label: 'Retention 6mo', align: 'right' },
  { key: 'retention_12mo', label: 'Retention 12mo', align: 'right' },
]

const PctCell = ({ value }) =>
  value === null || value === undefined ? (
    <span className="faint" title="Checkpoint not yet reached for this centre">n/a</span>
  ) : (
    <span className="num">{value}%</span>
  )

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
                background: activeProvider === p.id ? '#fbf1ec' : undefined,
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
              <td className="right"><PctCell value={p.retention_3mo} /></td>
              <td className="right"><PctCell value={p.retention_6mo} /></td>
              <td className="right"><PctCell value={p.retention_12mo} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
