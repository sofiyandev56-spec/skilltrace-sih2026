import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EvidenceBadge } from './Evidence.jsx'
import { dominantTier } from '../lib/evidence.js'
import { int } from '../lib/format.js'
import { MAGNITUDE } from '../lib/chartTheme.js'
import { useGov } from '../gov/GovContext.jsx'

const PctCell = ({ value, emptyTitle }) =>
  value === null || value === undefined ? (
    <span className="faint" title={emptyTitle}>n/a</span>
  ) : (
    <span className="num">{value}%</span>
  )

/**
 * A cell that goes saffron once it crosses the threshold where an officer
 * should look. Colour is never the only signal: the value is always readable,
 * and crossing cells also carry a title explaining why they are marked.
 */
const FlagCell = ({ value, over, under, why, markLabel }) => {
  if (value === null || value === undefined) {
    return <span className="faint">n/a</span>
  }
  const flagged = (over !== undefined && value >= over) || (under !== undefined && value <= under)
  return (
    <span className={`num ${flagged ? 'cell--flag' : ''}`} title={flagged ? why : undefined}>
      {value}%{flagged ? <i className="cell__mark" aria-label={markLabel}> ●</i> : null}
    </span>
  )
}

/** Centre ranking. Every column sorts; verified placement is the default order. */
export default function ProviderTable({ providers = [], onSelect, activeProvider }) {
  const { t } = useGov()
  const [sort, setSort] = useState({ key: 'verified_placement_pct', dir: 'desc' })

  const COLUMNS = [
    { key: 'name', label: t('colTrainingCentre'), align: 'left' },
    { key: 'district', label: t('colDistrict'), align: 'left' },
    { key: 'certified_count', label: t('colCertified'), align: 'right' },
    { key: 'headline_placement_pct', label: t('colReported'), align: 'right' },
    { key: 'verified_placement_pct', label: t('colVerified'), align: 'right', bar: true },
    { key: 'proof_gap', label: t('colUnprovenGap'), align: 'right' },
    { key: 'retention_3mo', label: t('colRetention3mo'), align: 'right' },
    { key: 'role_match_pct', label: t('colRoleMatch'), align: 'right' },
    { key: 'stale_pct', label: t('colStale'), align: 'right' },
  ]

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

  if (!providers.length) return <div className="empty">{t('noTrainingCentres')}</div>

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
                <Link className="tbl__link" to={`/ministry/providers/${p.id}`}>
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
                  why={t('whyProofGap')}
                  markLabel={t('needsAttentionLabel')}
                />
              </td>
              <td className="right">
                <PctCell value={p.retention_3mo} emptyTitle={t('checkpointNotYetReached')} />
              </td>
              <td className="right">
                <FlagCell
                  value={p.role_match_pct}
                  under={5}
                  why={t('whyRoleMatch')}
                  markLabel={t('needsAttentionLabel')}
                />
              </td>
              <td className="right">
                <FlagCell
                  value={p.stale_pct}
                  over={55}
                  why={t('whyStale')}
                  markLabel={t('needsAttentionLabel')}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
