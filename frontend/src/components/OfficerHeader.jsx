import React from 'react'
import { useGov } from '../gov/GovContext.jsx'

/**
 * Officer Header component for accredited Ministry officials.
 *
 * Displays the authenticated officer's credentials, phone number from Officers.xlsx,
 * designation, and their respective jurisdiction with one-click toggles.
 */
export default function OfficerHeader({ officer, filters, onFilterChange }) {
  const { t } = useGov()
  if (!officer) return null

  const isDistrictScoped = Boolean(officer.district)
  const isCurrentlyFilteredToOfficerDistrict = filters?.district === officer.district

  const toggleScope = (toOfficerDistrict) => {
    if (toOfficerDistrict) {
      onFilterChange({ ...filters, district: officer.district })
    } else {
      const next = { ...filters }
      delete next.district
      onFilterChange(next)
    }
  }

  const formatPhone = (p) => {
    if (!p) return ''
    const clean = String(p).replace(/\D/g, '')
    if (clean.length === 10) {
      return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`
    }
    return p
  }

  return (
    <section className="officer-banner" aria-label="Officer Profile & Jurisdiction">
      <div className="officer-banner__main">
        <div className="officer-banner__avatar">
          <img
            src="/state-emblem.png"
            alt="National Emblem"
            className="officer-banner__emblem"
            width="34"
            height="44"
          />
          <span className="officer-banner__badge">
            {officer.scope === 'national' ? 'NATIONAL' : officer.scope === 'state' ? 'STATE' : 'DISTRICT'}
          </span>
        </div>

        <div className="officer-banner__identity">
          <div className="officer-banner__eyebrow">
            <span>GOVERNMENT OF INDIA</span>
            <span className="officer-banner__dot">·</span>
            <span>MINISTRY OF SKILL DEVELOPMENT & ENTREPRENEURSHIP</span>
          </div>

          <h1 className="officer-banner__name">
            {officer.name}
            <span className="officer-banner__id mono">{officer.officer_id}</span>
          </h1>

          <div className="officer-banner__meta">
            <span className="officer-banner__designation">
              <strong>{officer.designation}</strong>
              {officer.cadre ? ` · ${officer.cadre}` : ''}
            </span>
            <span className="officer-banner__sep">|</span>
            <span className="officer-banner__division">
              🏛️ {officer.division || 'MSDE Central Division'}
            </span>
            {officer.phone_no && (
              <>
                <span className="officer-banner__sep">|</span>
                <span className="officer-banner__phone mono">
                  📞 {formatPhone(officer.phone_no)}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="officer-banner__actions">
          {isDistrictScoped ? (
            <div className="officer-scope-controls">
              <span className="officer-scope-controls__label">Dashboard Jurisdiction</span>
              <div className="btn-group" role="group" aria-label="Jurisdiction View Selection">
                <button
                  type="button"
                  className={`btn btn--sm ${isCurrentlyFilteredToOfficerDistrict ? 'btn--primary' : 'btn--outline'}`}
                  onClick={() => toggleScope(true)}
                  title={`Focus on ${officer.district} district data`}
                >
                  📍 {officer.district} (Assigned)
                </button>
                <button
                  type="button"
                  className={`btn btn--sm ${!isCurrentlyFilteredToOfficerDistrict ? 'btn--primary' : 'btn--outline'}`}
                  onClick={() => toggleScope(false)}
                  title="View all Maharashtra districts"
                >
                  🌐 All Districts
                </button>
              </div>
            </div>
          ) : (
            <div className="officer-scope-pill">
              <span className="officer-scope-pill__title">
                {officer.scope === 'state' ? 'Statewide Jurisdiction' : 'All-India National Oversight'}
              </span>
              <span className="officer-scope-pill__sub">Consolidated Reporting Active</span>
            </div>
          )}
        </div>
      </div>

      {isDistrictScoped && isCurrentlyFilteredToOfficerDistrict && (
        <div className="officer-banner__footer">
          <span className="officer-banner__footer-icon">✓</span>
          <span>
            Currently viewing your assigned district dashboard: <strong>{officer.district}</strong>.
            All outcomes, centre rankings, and skill-gap metrics are scoped to your jurisdiction.
          </span>
        </div>
      )}
    </section>
  )
}
