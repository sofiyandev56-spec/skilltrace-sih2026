import { useMemo, useState } from 'react'
import { EvidenceBadge } from './Evidence.jsx'
import { dominantTier } from '../lib/evidence.js'
import { int } from '../lib/format.js'
import { MAGNITUDE } from '../lib/chartTheme.js'
import { useGov } from '../gov/GovContext.jsx'

const COLUMNS = [
  { key: 'name', label: 'Training centre', labelHi: 'प्रशिक्षण केंद्र', align: 'left' },
  { key: 'district', label: 'District', labelHi: 'जिला', align: 'left' },
  { key: 'certified_count', label: 'Certified', labelHi: 'प्रमाणित', align: 'right' },
  { key: 'verified_placement_pct', label: 'Verified placement', labelHi: 'सत्यापित प्लेसमेंट', align: 'right', bar: true },
  { key: 'retention_3mo', label: 'Retention 3mo', labelHi: '3-माह रिटेंशन', align: 'right' },
  { key: 'retention_6mo', label: 'Retention 6mo', labelHi: '6-माह रिटेंशन', align: 'right' },
  { key: 'retention_12mo', label: 'Retention 12mo', labelHi: '12-माह रिटेंशन', align: 'right' },
]

const PctCell = ({ value, hi }) =>
  value === null || value === undefined ? (
    <span className="faint" title={hi ? 'इस केंद्र हेतु जांच बिंदु अभी देय नहीं है' : 'Checkpoint not yet reached for this centre'}>n/a</span>
  ) : (
    <span className="num">{value}%</span>
  )

/** Centre ranking. Every column sorts; verified placement is the default order. */
export default function ProviderTable({ providers = [], onSelect, activeProvider }) {
  const { lang } = useGov()
  const hi = lang === 'hi'
  const [sort, setSort] = useState({ key: 'verified_placement_pct', dir: 'desc' })

  const rows = useMemo(() => {
    const copy = [...providers]
    copy.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
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

  if (!providers.length) return <div className="empty">{hi ? 'कोई प्रशिक्षण केंद्र इन फ़िल्टर से मेल नहीं खाता।' : 'No training centres match these filters.'}</div>

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
                {hi ? c.labelHi : c.label}
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
                <div style={{ fontWeight: 600 }}>{p.name}</div>
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
              <td className="right"><PctCell value={p.retention_3mo} hi={hi} /></td>
              <td className="right"><PctCell value={p.retention_6mo} hi={hi} /></td>
              <td className="right"><PctCell value={p.retention_12mo} hi={hi} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
