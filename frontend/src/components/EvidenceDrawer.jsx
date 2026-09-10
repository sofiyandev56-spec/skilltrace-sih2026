import React, { useEffect, useRef } from 'react'
import { TIERS, TIER_ORDER } from '../lib/evidence.js'
import { useGov } from '../gov/GovContext.jsx'

/**
 * The full evidence breakdown for a single headline figure.
 *
 * The popover on a stat card answers "how much of this is verified"; this
 * answers "what exactly is this number, who said so, and where can I go and
 * read the underlying events". It is the screen that has to make the
 * transparency claim feel real rather than decorative.
 */
export default function EvidenceDrawer({
  open,
  onClose,
  title,
  value,
  definition,
  cohort,
  population,
  evidence,
  eventCount,
  onViewEvents,
  onMethodology,
}) {
  const { t } = useGov()
  const panelRef = useRef(null)
  const openerRef = useRef(null)

  const SOURCE_CHIPS = [
    { key: 'checkin', label: t('srcTraineeCheckin') },
    { key: 'employer', label: t('srcEmployerConfirmation') },
    { key: 'income', label: t('srcConsentIncome') },
  ]

  const tierLabels = {
    high: t('tierVerified'),
    medium: t('tierCorroborated'),
    low: t('tierSelfReported'),
    stale: t('tierStale'),
    conflict: t('tierNeedsReview'),
  }

  useEffect(() => {
    if (!open) return undefined
    openerRef.current = document.activeElement
    const panel = panelRef.current
    panel?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const focusable = panel.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const total = evidence?.total || 0

  return (
    <>
      <div className="drawer__scrim" onClick={onClose} aria-hidden="true" />
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="drawer__head">
          <div>
            <h2 className="drawer__title" id="drawer-title">
              {title} — {t('evidenceBreakdown')}
            </h2>
            <p className="drawer__sub">
              {cohort ? t('cohortLabel2', cohort) : ''}
              {population ? t('populationLabel', population) : ''}
            </p>
          </div>
          <button type="button" className="drawer__close" onClick={onClose} aria-label={t('closeEvidence')}>
            ✕
          </button>
        </header>

        <div className="drawer__body">
          <div className="drawer__figure">
            <span className="drawer__value">{value}</span>
            <p className="drawer__def">{definition}</p>
          </div>

          <section className="drawer__section" aria-labelledby="drawer-tiers">
            <h3 className="drawer__h3" id="drawer-tiers">
              {t('howEvidenced')}
            </h3>

            {total ? (
              <ul className="tierlist">
                {TIER_ORDER.filter((k) => (evidence[k] || 0) > 0).map((k) => {
                  const tier = TIERS[k]
                  const pct = evidence[k]
                  const count = Math.round((pct / 100) * total)
                  return (
                    <li className="tierlist__item" key={k}>
                      <span
                        className={`tier ${tier.className}`}
                        style={{ flexShrink: 0 }}
                      >
                        <i className="tier__dot" aria-hidden="true" />
                        {tierLabels[k] || tier.label}
                      </span>
                      <div className="tierlist__body">
                        <p className="tierlist__stat">
                          <strong className="num">{pct}%</strong>
                          <span className="tierlist__count num">
                            {count.toLocaleString('en-IN')} {t('trainees')}
                          </span>
                        </p>
                        <p className="tierlist__meaning">{tier.meaning}</p>
                        <p className="tierlist__source">{t('source') || 'Source:'} {tier.source}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="empty">
                {t('noVerifiedOutcomes')}
              </p>
            )}
          </section>

          <section className="drawer__section" aria-labelledby="drawer-sources">
            <h3 className="drawer__h3" id="drawer-sources">
              {t('dataSourcesUsed')}
            </h3>
            <ul className="chips">
              {SOURCE_CHIPS.map((c) => (
                <li className="chip" key={c.key}>
                  {c.label}
                </li>
              ))}
            </ul>
          </section>

          <p className="drawer__prov num">
            {t('metricCalcFrom', (eventCount || 0).toLocaleString('en-IN'))}
          </p>
        </div>

        <footer className="drawer__foot">
          <button type="button" className="btn btn--primary" onClick={onViewEvents}>
            {t('viewSourceEvents')}
          </button>
          <button type="button" className="btn" onClick={onMethodology}>
            {t('methodology')}
          </button>
        </footer>
      </aside>
    </>
  )
}
