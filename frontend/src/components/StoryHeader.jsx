import React from 'react'
import { int, pct } from '../lib/format.js'
import { useGov } from '../gov/GovContext.jsx'

/**
 * Headline outcome summary — Redesigned 3-stage visual:
 * Reported placement -> 3-Month verification filter -> Verified employment outcome.
 *
 * Clearly communicates the core platform premise:
 * The gap between unverified reported placement and sustained verified employment.
 */
export default function StoryHeader({ d, delta, onOpenEvidence }) {
  const { t } = useGov()
  const reported = d.headline_placement_pct
  const verified = d.outcomes.employed.pct
  const gap = Math.round((reported - verified) * 10) / 10
  const unproven = d.headline_placement_count - d.outcomes.employed.count

  const retained = d.retention?.find((r) => r.months === 3)
  const roleMatched = d.funnel?.find((s) => s.stage === 'Role-matched')

  return (
    <section className="story" aria-labelledby="story-h">
      <h2 className="sr-only" id="story-h">
        {t('headlineOutcomeSummary')}
      </h2>

      <div className="story__main">
        {/* Stage 1: Reported Placement */}
        <div className="story__card story__card--reported">
          <div className="story__card-header">
            <span className="story__tag story__tag--reported">
              {t('reportedPlacementRate')}
            </span>
          </div>
          <div className="story__card-body">
            <p className="story__fig story__fig--weak">{pct(reported)}</p>
            <p className="story__sub">
              {t('placementOnRecord', int(d.headline_placement_count), int(d.total_trainees))}
            </p>
          </div>
        </div>

        {/* Stage 2: 3-Month Rule Filter (Center Connector) */}
        <div className="story__connector" aria-hidden="true">
          <div className="story__connector-badge">
            <div className="story__connector-icon">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 2l6 3v5c0 4.5-3 7.5-6 8.5C4 17.5 1 14.5 1 10V5l6-3h3z" />
                <path d="M7 10l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="story__connector-text">
              <span className="story__connector-title">{t('afterThreeMonthRule')}</span>
              <span className="story__connector-sub">{t('verificationFilter')}</span>
            </div>
          </div>
          <div className="story__connector-arrow">
            <svg className="story__arrow-icon story__arrow-icon--h" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 12h14M12 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg className="story__arrow-icon story__arrow-icon--v" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 4v14M6 12l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Stage 3: Verified Employment Outcome */}
        <div className="story__card story__card--verified">
          <div className="story__card-header">
            <span className="story__tag story__tag--verified">
              {t('verifiedEmploymentRate')}
            </span>
          </div>
          <div className="story__card-body">
            <div className="story__figrow">
              <button
                type="button"
                className="story__fig story__fig--strong story__fig--btn"
                onClick={onOpenEvidence}
                aria-label={`${t('verifiedEmploymentRate')} ${pct(verified)}. ${t('selectToSeeEvidence')}`}
              >
                {pct(verified)}
              </button>
              {delta ? (
                <span className={`delta delta--${delta.direction}`} role="status">
                  {delta.direction === 'down' ? '▼' : '▲'} {delta.text} {t('vsLastView')}
                </span>
              ) : null}
            </div>
            <p className="story__hint">{t('selectToSeeEvidence')}</p>
            <p className="story__sub">
              {t('traineesStillAt', int(d.outcomes.employed.count))}
            </p>
          </div>
        </div>
      </div>

      <p className="story__gap">
        {t('gapText', pct(gap), int(unproven))}
      </p>

      <dl className="story__rail">
        <div className="story__cell">
          <dt>{t('certified')}</dt>
          <dd className="num">{int(d.total_trainees)}</dd>
          <span className="story__note">{t('completedAssessed')}</span>
        </div>
        <div className="story__cell">
          <dt>{t('independentlyVerified')}</dt>
          <dd className="num" style={{ color: 'var(--tier-high)' }}>
            {d.outcomes.employed.evidence?.high ?? 0}%
          </dd>
          <span className="story__note">{t('ofEmploymentFromRecords')}</span>
        </div>
        <div className="story__cell">
          <dt>{t('stillEmployed3mo')}</dt>
          <dd className="num">{retained?.pct != null ? pct(retained.pct) : '—'}</dd>
          <span className="story__note">
            {retained
              ? t('eligibleCheckpoint', int(retained.retained), int(retained.eligible))
              : t('notYetDue')}
          </span>
        </div>
        <div className="story__cell">
          <dt>{t('workingInTrainedRole')}</dt>
          <dd className="num" style={{ color: roleMatched && roleMatched.pct < 20 ? 'var(--accent-dark)' : undefined }}>
            {roleMatched ? pct(roleMatched.pct) : '—'}
          </dd>
          <span className="story__note">
            {roleMatched ? t('inOccupationTrainedFor', int(roleMatched.count)) : '—'}
          </span>
        </div>
      </dl>
    </section>
  )
}
