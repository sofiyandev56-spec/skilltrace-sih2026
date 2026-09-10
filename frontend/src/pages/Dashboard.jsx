import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { subscribe } from '../api/mock/store.js'
import { useApi } from '../lib/useApi.js'
import { int, longDate, pct } from '../lib/format.js'
import FilterBar from '../components/FilterBar.jsx'
import StatCard from '../components/StatCard.jsx'
import CompositionBar from '../components/CompositionBar.jsx'
import EvidenceFooter from '../components/EvidenceFooter.jsx'
import ProviderTable from '../components/ProviderTable.jsx'
import DistrictGrid from '../components/DistrictGrid.jsx'
import RetentionChart from '../components/charts/RetentionChart.jsx'
import WageChart from '../components/charts/WageChart.jsx'
import SkillGapChart from '../components/charts/SkillGapChart.jsx'

const SNAP_KEY = 'skilltrace.snapshot.'

/** Stable key for a filter combination, ignoring cleared fields and key order. */
function sliceKey(filters = {}) {
  const clean = {}
  for (const k of Object.keys(filters).sort()) {
    if (filters[k]) clean[k] = filters[k]
  }
  return JSON.stringify(clean)
}

/** Remember the last figures seen for a given filter combination. */
function readSnapshot(key) {
  try {
    const raw = sessionStorage.getItem(SNAP_KEY + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function writeSnapshot(key, snap) {
  try {
    sessionStorage.setItem(SNAP_KEY + key, JSON.stringify(snap))
  } catch {
    /* non-fatal */
  }
}

export default function Dashboard() {
  const [filters, setFilters] = useState({})
  const [nonce, setNonce] = useState(0)
  const [externalChange, setExternalChange] = useState(null)

  const filtersKey = useMemo(() => sliceKey(filters), [filters])

  const dash = useApi(() => api.getDashboard(filters), [filtersKey, nonce])
  const provs = useApi(() => api.getProviders(filters), [filtersKey, nonce])
  const gap = useApi(() => api.getSkillGap(filters), [filtersKey, nonce])

  const refresh = useCallback(() => {
    setExternalChange(null)
    setNonce((n) => n + 1)
  }, [])

  /* Another tab (or the consent screen) changed the underlying data. */
  useEffect(
    () =>
      subscribe((e) => {
        if (e.reason === 'consent_withdrawn' || e.reason === 'consent_granted' || e.external) {
          setExternalChange({ at: Date.now(), reason: e.reason || 'updated' })
        }
      }),
    [],
  )

  /* ---- deltas: what moved since this slice was last on screen ---- */
  const [deltas, setDeltas] = useState(null)
  const clearTimer = useRef(null)

  useEffect(() => () => clearTimer.current && clearTimeout(clearTimer.current), [])

  useEffect(() => {
    const d = dash.data
    if (!d) return
    // Key off the filters the RESPONSE was built from, not the local filter
    // state: the state changes first, so using it would compare this slice's
    // figures against the previous slice's and report a bogus drop.
    const key = sliceKey(d.filters_applied)
    const snap = {
      total: d.total_trainees,
      employed: d.outcomes.employed.pct,
      self_employed: d.outcomes.self_employed.pct,
      apprentice: d.outcomes.apprentice.pct,
      no_data: d.outcomes.no_data.pct,
    }
    const prev = readSnapshot(key)
    const next = {}
    if (prev) {
      for (const k of Object.keys(snap)) {
        const diff = Math.round((snap[k] - prev[k]) * 10) / 10
        if (diff !== 0) {
          next[k] = {
            direction: diff < 0 ? 'down' : 'up',
            text: k === 'total' ? `${Math.abs(diff)}` : `${Math.abs(diff)}pp`,
          }
        }
      }
    }
    if (clearTimer.current) clearTimeout(clearTimer.current)
    setDeltas(Object.keys(next).length ? next : null)
    if (Object.keys(next).length) {
      clearTimer.current = setTimeout(() => setDeltas(null), 9000)
    }
    writeSnapshot(key, snap)
  }, [dash.data])

  const d = dash.data
  const loading = dash.loading && !d

  return (
    <div className="stack">
      {externalChange && (
        <div className="livebanner" role="status">
          <strong>Underlying data changed.</strong>
          <span>
            A consent record was {externalChange.reason === 'consent_granted' ? 'restored' : 'withdrawn'}.
            These figures are now out of date.
          </span>
          <span className="spacer" />
          <button type="button" className="btn btn--sm btn--accent" onClick={refresh}>
            Refresh figures
          </button>
        </div>
      )}

      <FilterBar
        filters={filters}
        onChange={setFilters}
        providers={provs.data || []}
        resultCount={d?.total_trainees}
      />

      {loading ? (
        <div className="grid grid--5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 118 }} />
          ))}
        </div>
      ) : !d ? (
        <div className="panel"><div className="empty">Could not load dashboard figures.</div></div>
      ) : (
        <>
          {/* The contrast the whole system exists to expose. */}
          <div className="panel">
            <div className="panel__body" style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <div className="label">Reported placement rate</div>
                <div className="num" style={{ fontSize: 25, fontWeight: 680, color: 'var(--text-faint)' }}>
                  {pct(d.headline_placement_pct)}
                </div>
                <div className="small muted">Anyone with a placement on record ({int(d.headline_placement_count)})</div>
              </div>
              <div style={{ fontSize: 22, color: 'var(--border-strong)' }} aria-hidden="true">→</div>
              <div>
                <div className="label" style={{ color: 'var(--accent-dark)' }}>Verified employment rate</div>
                <div className="num" style={{ fontSize: 25, fontWeight: 680, color: 'var(--tier-high)' }}>
                  {pct(d.outcomes.employed.pct)}
                </div>
                <div className="small muted">Still at the same employer after 3+ months ({int(d.outcomes.employed.count)})</div>
              </div>
              <div className="callout-rule" style={{ flex: '1 1 320px' }}>
                <span aria-hidden="true" style={{ fontSize: 15 }}>⚖</span>
                <span>
                  <b>{pct(Math.round((d.headline_placement_pct - d.outcomes.employed.pct) * 10) / 10)}</b> of
                  this cohort was reported as placed but cannot be shown to have held the job for three
                  months. SkillTrace never reports those as employment.
                </span>
              </div>
            </div>
          </div>

          {d.consent.withdrawn > 0 && (
            <div className="note">
              <b className="num">{d.consent.withdrawn}</b> trainee record
              {d.consent.withdrawn === 1 ? ' has' : 's have'} been excluded from every figure on this page
              because consent was withdrawn. Denominator is now{' '}
              <b className="num">{int(d.consent.included)}</b> of {int(d.consent.total)}.
            </div>
          )}

          {/* ---- the five summary cards ---- */}
          <div className="grid grid--5">
            <StatCard
              tone="total"
              label="Total trainees"
              value={int(d.total_trainees)}
              sub={`Certified up to ${longDate(d.as_of)}`}
              evidence={d.evidence_totals}
              note="Evidence mix across every outcome record in this slice."
              delta={deltas?.total}
              changed={Boolean(deltas?.total)}
            />
            <StatCard
              label="Employed"
              value={pct(d.outcomes.employed.pct, 1).replace('%', '')}
              unit="%"
              sub={`${int(d.outcomes.employed.count)} trainees · 3+ months at one employer`}
              evidence={d.outcomes.employed.evidence}
              note="Only placements confirmed 3+ months later at the same employer are counted here."
              delta={deltas?.employed}
              changed={Boolean(deltas?.employed)}
            />
            <StatCard
              label="Self-employed"
              value={pct(d.outcomes.self_employed.pct, 1).replace('%', '')}
              unit="%"
              sub={`${int(d.outcomes.self_employed.count)} trainees running their own work`}
              evidence={d.outcomes.self_employed.evidence}
              note="Bank-verified income is treated as the strongest evidence of self-employment."
              delta={deltas?.self_employed}
              changed={Boolean(deltas?.self_employed)}
            />
            <StatCard
              label="Apprentice"
              value={pct(d.outcomes.apprentice.pct, 1).replace('%', '')}
              unit="%"
              sub={`${int(d.outcomes.apprentice.count)} trainees in apprenticeships`}
              evidence={d.outcomes.apprentice.evidence}
              note="Apprenticeships are tracked separately from employment — a stipend is not a wage."
              delta={deltas?.apprentice}
              changed={Boolean(deltas?.apprentice)}
            />
            <StatCard
              label="No data"
              value={pct(d.outcomes.no_data.pct, 1).replace('%', '')}
              unit="%"
              sub={`${int(d.outcomes.no_data.count)} trainees never responded`}
              evidence={d.outcomes.no_data.evidence}
              note="We report this as unknown rather than assuming an outcome. These names feed the follow-up queue."
              delta={deltas?.no_data}
              changed={Boolean(deltas?.no_data)}
            />
          </div>

          <div className="panel">
            <div className="panel__head">
              <div>
                <div className="panel__title">Where this cohort actually is</div>
                <div className="panel__hint">
                  Full breakdown including outcomes not shown in the cards above.
                </div>
              </div>
            </div>
            <div className="panel__body">
              <CompositionBar outcomes={d.outcomes} total={d.total_trainees} />
            </div>
          </div>

          {/* ---- retention + wages ---- */}
          <div className="grid grid--2">
            <div className="panel">
              <div className="panel__head">
                <div>
                  <div className="panel__title">Retention after placement</div>
                  <div className="panel__hint">Share still at the same employer at each checkpoint.</div>
                </div>
              </div>
              <div className="panel__body">
                <RetentionChart retention={d.retention} />
              </div>
            </div>

            <div className="panel">
              <div className="panel__head">
                <div>
                  <div className="panel__title">Wage progression by cohort</div>
                  <div className="panel__hint">Average monthly wage from placement onwards.</div>
                </div>
              </div>
              <div className="panel__body">
                <WageChart rows={d.wage_progression} cohorts={d.cohorts_present} />
                <EvidenceFooter evidence={d.wage_evidence} what="Wage figures" />
              </div>
            </div>
          </div>

          {/* ---- centre ranking ---- */}
          <div className="panel">
            <div className="panel__head">
              <div>
                <div className="panel__title">Training centre ranking</div>
                <div className="panel__hint">
                  Sort by any column. Click a row to filter the whole dashboard to that centre.
                </div>
              </div>
              <div className="panel__right">
                <span className="faint small num">
                  {provs.data ? `${provs.data.length} centres` : ''}
                </span>
              </div>
            </div>
            <div className="panel__body panel__body--flush">
              {provs.loading && !provs.data ? (
                <div className="skeleton" style={{ height: 220 }} />
              ) : (
                <ProviderTable
                  providers={provs.data || []}
                  activeProvider={filters.provider}
                  onSelect={(id) => setFilters((f) => ({ ...f, provider: id }))}
                />
              )}
            </div>
          </div>

          {/* ---- skill gap ---- */}
          <div className="grid grid--2">
            <div className="panel">
              <div className="panel__head">
                <div>
                  <div className="panel__title">Skill gap by district</div>
                  <div className="panel__hint">
                    Gap between the roles courses train for and the roles trainees land in.
                  </div>
                </div>
              </div>
              <div className="panel__body">
                {gap.loading && !gap.data ? (
                  <div className="skeleton" style={{ height: 200 }} />
                ) : (
                  <DistrictGrid
                    districts={gap.data?.districts || []}
                    activeDistrict={filters.district}
                    onSelect={(dist) => setFilters((f) => ({ ...f, district: dist }))}
                  />
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel__head">
                <div>
                  <div className="panel__title">Intended role vs actual role</div>
                  <div className="panel__hint">Per course, target placement rate against what happened.</div>
                </div>
              </div>
              <div className="panel__body">
                {gap.loading && !gap.data ? (
                  <div className="skeleton" style={{ height: 260 }} />
                ) : (
                  <>
                    <SkillGapChart courses={gap.data?.courses || []} />
                    <EvidenceFooter evidence={gap.data?.evidence} what="Observed job roles" />
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
