import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { subscribe } from '../api/mock/store.js'
import { useApi } from '../lib/useApi.js'
import { int, longDate, pct } from '../lib/format.js'
import FilterBar from '../components/FilterBar.jsx'
import CompositionBar from '../components/CompositionBar.jsx'
import Funnel from '../components/Funnel.jsx'
import StoryHeader from '../components/StoryHeader.jsx'
import NeedsAttention from '../components/NeedsAttention.jsx'
import EvidenceDrawer from '../components/EvidenceDrawer.jsx'
import EvidenceFooter from '../components/EvidenceFooter.jsx'
import ReviewInsights from '../components/ReviewInsights.jsx'
import ProviderTable from '../components/ProviderTable.jsx'
import DistrictGrid from '../components/DistrictGrid.jsx'
import RetentionChart from '../components/charts/RetentionChart.jsx'
import WageChart from '../components/charts/WageChart.jsx'
import SkillGapChart from '../components/charts/SkillGapChart.jsx'
import { useGov } from '../gov/GovContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import OfficerHeader from '../components/OfficerHeader.jsx'

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
  const { t } = useGov()
  const { officer } = useAuth()
  const [filters, setFilters] = useState(() => (officer?.district ? { district: officer.district } : {}))
  const [nonce, setNonce] = useState(0)
  const [externalChange, setExternalChange] = useState(null)

  // Synchronize filter when officer session district is available
  useEffect(() => {
    if (officer?.district) {
      setFilters((prev) => (prev.district ? prev : { ...prev, district: officer.district }))
    }
  }, [officer?.officer_id, officer?.district])

  const filtersKey = useMemo(() => sliceKey(filters), [filters])

  const dash = useApi(() => api.getDashboard(filters), [filtersKey, nonce])
  const provs = useApi(() => api.getProviders(filters), [filtersKey, nonce])
  const gap = useApi(() => api.getSkillGap(filters), [filtersKey, nonce])
  const feedback = useApi(() => api.getReviewInsights(filters), [filtersKey, nonce])
  const attention = useApi(() => api.getAttention(filters), [filtersKey, nonce])

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

  const cohortLabel =
    [filters.cohort, filters.course, filters.district].filter(Boolean).join(' · ') || t('allCohorts')

  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="stack">
      {externalChange && (
        <div className="livebanner" role="status">
          <strong>{t('underlyingDataChanged')}</strong>
          <span>
            {externalChange.reason === 'consent_granted' ? t('consentRestoredMsg') : t('consentWithdrawnMsg')}
          </span>
          <span className="spacer" />
          <button type="button" className="btn btn--sm btn--accent" onClick={refresh}>
            {t('refreshFigures')}
          </button>
        </div>
      )}

      {officer && (
        <OfficerHeader
          officer={officer}
          filters={filters}
          onFilterChange={setFilters}
        />
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
        <div className="panel"><div className="empty">{t('couldNotLoad')}</div></div>
      ) : (
        <>
          {/* The contrast the whole system exists to expose. */}
          <StoryHeader
            d={d}
            delta={deltas?.employed}
            onOpenEvidence={() => setEvidenceOpen(true)}
          />

          <div className="panel">
            <div className="panel__head">
              <div>
                <div className="panel__title">{t('whatNeedsAttention')}</div>
                <div className="panel__hint">
                  {t('whatNeedsAttentionHint')}
                </div>
              </div>
            </div>
            <div className="panel__body">
              <NeedsAttention findings={attention.data?.findings} loading={attention.loading} />
            </div>
          </div>

          <div className="privacy" role="note">
            <span className="privacy__icon" aria-hidden="true">🔒</span>
            <p className="privacy__text">
              <strong>
                {t('privacyIncluded', int(d.consent.included), int(d.consent.total))}
              </strong>{' '}
              {d.consent.withdrawn > 0 ? (
                <>
                  {t(
                    'privacyWithdrawn',
                    d.consent.withdrawn,
                    d.consent.withdrawn === 1 ? t('privacyHas') : t('privacyHave'),
                    d.consent.withdrawn === 1 ? t('privacyIs') : t('privacyAre'),
                  )}
                </>
              ) : (
                <>
                  {t('privacyAllActive')}
                </>
              )}
            </p>
            <Link className="privacy__link" to="/client/consent">
              {t('consentAndRights')}
            </Link>
          </div>

          <div className="panel">
            <div className="panel__head">
              <div>
                <div className="panel__title">{t('whereThisCohortIs')}</div>
                <div className="panel__hint">
                  {t('whereThisCohortIsHint')}
                </div>
              </div>
            </div>
            <div className="panel__body">
              <CompositionBar outcomes={d.outcomes} total={d.total_trainees} />
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <div>
                <div className="panel__title">{t('whereDropsOff')}</div>
                <div className="panel__hint">
                  {t('whereDropsOffHint')}
                </div>
              </div>
            </div>
            <div className="panel__body">
              <Funnel stages={d.funnel} />
            </div>
          </div>

          {/* ---- retention + wages ---- */}
          <div className="grid grid--2">
            <div className="panel">
              <div className="panel__head">
                <div>
                  <div className="panel__title">{t('retentionAfterPlacement')}</div>
                  <div className="panel__hint">{t('retentionHint')}</div>
                </div>
              </div>
              <div className="panel__body">
                <RetentionChart retention={d.retention} />
              </div>
            </div>

            <div className="panel">
              <div className="panel__head">
                <div>
                  <div className="panel__title">{t('wageProgressionByCohort')}</div>
                  <div className="panel__hint">{t('wageProgressionHint')}</div>
                </div>
              </div>
              <div className="panel__body">
                <WageChart rows={d.wage_progression} cohorts={d.cohorts_present} />
                <EvidenceFooter evidence={d.wage_evidence} what={t('wageFigures')} />
              </div>
            </div>
          </div>

          {/* ---- centre ranking ---- */}
          <div className="panel">
            <div className="panel__head">
              <div>
                <div className="panel__title">{t('trainingCentreRanking')}</div>
                <div className="panel__hint">
                  {t('trainingCentreRankingHint')}
                </div>
              </div>
              <div className="panel__right">
                <span className="faint small num">
                  {provs.data ? `${provs.data.length} ${t('centres')}` : ''}
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
                  <div className="panel__title">{t('skillGapByDistrict')}</div>
                  <div className="panel__hint">
                    {t('skillGapByDistrictHint')}
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
                  <div className="panel__title">{t('intendedVsActual')}</div>
                  <div className="panel__hint">{t('intendedVsActualHint')}</div>
                </div>
              </div>
              <div className="panel__body">
                {gap.loading && !gap.data ? (
                  <div className="skeleton" style={{ height: 260 }} />
                ) : (
                  <>
                    <SkillGapChart courses={gap.data?.courses || []} />
                    <EvidenceFooter evidence={gap.data?.evidence} what={t('observedJobRoles')} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ---- what trainees said about the training itself ---- */}
          <div className="panel">
            <div className="panel__head">
              <div>
                <div className="panel__title">{t('trainingFeedback')}</div>
                <div className="panel__hint">
                  {t('trainingFeedbackHint')}
                </div>
              </div>
            </div>
            <div className="panel__body">
              <ReviewInsights data={feedback.data} loading={feedback.loading} />
            </div>
          </div>

          <EvidenceDrawer
            open={evidenceOpen}
            onClose={() => setEvidenceOpen(false)}
            title={t('verifiedEmploymentRate')}
            value={pct(d.outcomes.employed.pct)}
            definition={t('verifiedEmploymentDef')}
            cohort={cohortLabel}
            population={int(d.total_trainees)}
            evidence={d.outcomes.employed.evidence}
            eventCount={d.event_count}
            onViewEvents={() => {
              setEvidenceOpen(false)
              navigate('/ministry/audit')
            }}
            onMethodology={() => {
              setEvidenceOpen(false)
              navigate('/consent')
            }}
          />
        </>
      )}
    </div>
  )
}
