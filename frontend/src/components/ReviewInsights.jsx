import React from 'react'
import { EvidenceBadge } from './Evidence.jsx'
import { int } from '../lib/format.js'
import { useGov } from '../gov/GovContext.jsx'

/**
 * Aggregate post-training feedback for the oversight view.
 *
 * Ratings are the one thing on this dashboard that can never be corroborated:
 * they are opinions, held only by the person who gave them. So they are shown
 * under an explicit Self-reported tier and kept visually distinct from the
 * verified outcome figures above, rather than sitting alongside them as if
 * they were the same kind of fact. Individual responses are never shown.
 */
function Meter({ value }) {
  const pct = value === null ? 0 : ((value - 1) / 4) * 100
  const tone = value === null ? 'var(--border-strong)' : value >= 4 ? 'var(--tier-high)' : value >= 3 ? 'var(--tier-medium)' : 'var(--accent)'
  return (
    <span className="ratebar" aria-hidden="true">
      <span style={{ width: `${pct}%`, background: tone }} />
    </span>
  )
}

export default function ReviewInsights({ data, loading }) {
  const { t } = useGov()

  if (loading && !data) return <div className="skeleton" style={{ height: 190 }} />
  if (!data || !data.responses) {
    return (
      <div className="empty">
        <h4>{t('noFeedbackTitle')}</h4>
        <p>{t('noFeedbackBody')}</p>
      </div>
    )
  }

  const worst = data.providers.length > 2 ? data.providers[data.providers.length - 1] : null

  return (
    <div>
      <div className="rategrid">
        {data.questions.map((q) => (
          <div className="rate" key={q.id} title={t(q.promptKey)}>
            <span className="rate__label">{t(q.labelKey)}</span>
            <span className="rate__value num">
              {q.out_of_five ?? '—'}
              <small>/5</small>
            </span>
            <Meter value={q.out_of_five} />
          </div>
        ))}
        <div className="rate rate--accent">
          <span className="rate__label">{t('recommendationRate')}</span>
          <span className="rate__value num">
            {data.recommend_rate ?? '—'}
            <small>%</small>
          </span>
          <span className="rate__foot">{t('saidDefinitely')}</span>
        </div>
      </div>

      <div className="rate__meta">
        <EvidenceBadge trust="low" small />
        <span className="small muted">
          {t('responsesFrom', int(data.responses), int(data.eligible), data.response_rate)}
        </span>
      </div>

      {data.providers.length > 1 && (
        <div className="ratecentres">
          <div>
            <span className="label">{t('bestRated')}</span>
            <div className="ratecentres__row">
              <b>{data.providers[0].name}</b>
              <span className="num">{data.providers[0].out_of_five}/5</span>
            </div>
            <span className="faint small">
              {data.providers[0].district} · {data.providers[0].responses} {t('responses')}
            </span>
          </div>
          {worst && (
            <div>
              <span className="label" style={{ color: 'var(--accent-dark)' }}>
                {t('lowestRated')}
              </span>
              <div className="ratecentres__row">
                <b>{worst.name}</b>
                <span className="num">{worst.out_of_five}/5</span>
              </div>
              <span className="faint small">
                {worst.district} · {worst.responses} {t('responses')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
