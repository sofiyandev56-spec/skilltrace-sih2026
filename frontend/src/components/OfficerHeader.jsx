import { useGov } from '../gov/GovContext.jsx'

/**
 * Who is signed in, and how much of the country they are entitled to see.
 *
 * A district officer's jurisdiction is a fact about their posting, so the
 * dashboard opens scoped to it rather than to all of Maharashtra. The toggle
 * makes that scoping visible and reversible instead of silent — an officer
 * should never wonder whether a figure covers their district or the country.
 */
const SCOPE_KEY = {
  national: 'ohScopeNational',
  state: 'ohScopeState',
  district: 'ohScopeDistrict',
}

/** 10 digits as the Indian government writes them: +91 XXXXX XXXXX. */
function formatPhone(p) {
  if (!p) return ''
  const clean = String(p).replace(/\D/g, '')
  return clean.length === 10 ? `+91 ${clean.slice(0, 5)} ${clean.slice(5)}` : p
}

export default function OfficerHeader({ officer, filters, onFilterChange }) {
  const { t } = useGov()
  if (!officer) return null

  const districtScoped = Boolean(officer.district)
  const onOwnDistrict = filters?.district === officer.district

  const toggleScope = (toOwnDistrict) => {
    if (toOwnDistrict) {
      onFilterChange({ ...filters, district: officer.district })
      return
    }
    const next = { ...filters }
    delete next.district
    onFilterChange(next)
  }

  return (
    <section className="officer" aria-labelledby="officer-name">
      <div className="officer__main">
        <div className="officer__seal">
          <img
            src="/state-emblem.png"
            alt=""
            className="officer__emblem"
            width="34"
            height="44"
          />
          <span className="officer__badge">{t(SCOPE_KEY[officer.scope] || SCOPE_KEY.district)}</span>
        </div>

        <div className="officer__identity">
          <p className="officer__eyebrow">
            {t('govOfIndia')}
            <span className="officer__dot" aria-hidden="true">
              ·
            </span>
            {t('ministry')}
          </p>

          <h2 className="officer__name" id="officer-name">
            {officer.name}
            <span className="officer__id mono">{officer.officer_id}</span>
          </h2>

          <p className="officer__meta">
            <strong>{officer.designation}</strong>
            {officer.cadre ? ` · ${officer.cadre}` : ''}
            {officer.division ? (
              <>
                <span className="officer__sep" aria-hidden="true">
                  |
                </span>
                {officer.division}
              </>
            ) : null}
            {officer.phone_no ? (
              <>
                <span className="officer__sep" aria-hidden="true">
                  |
                </span>
                <span className="mono">{formatPhone(officer.phone_no)}</span>
              </>
            ) : null}
          </p>
        </div>

        <div className="officer__actions">
          {districtScoped ? (
            <div className="officer__scope">
              <span className="officer__scope-label">{t('ohJurisdiction')}</span>
              <div className="officer__toggle" role="group" aria-label={t('ohJurisdiction')}>
                <button
                  type="button"
                  className={`btn btn--sm${onOwnDistrict ? ' btn--primary' : ''}`}
                  aria-pressed={onOwnDistrict}
                  onClick={() => toggleScope(true)}
                >
                  {t('ohAssignedDistrict', officer.district)}
                </button>
                <button
                  type="button"
                  className={`btn btn--sm${onOwnDistrict ? '' : ' btn--primary'}`}
                  aria-pressed={!onOwnDistrict}
                  onClick={() => toggleScope(false)}
                >
                  {t('ohAllDistricts')}
                </button>
              </div>
            </div>
          ) : (
            <div className="officer__pill">
              <span className="officer__pill-title">
                {t(officer.scope === 'state' ? 'ohStatewide' : 'ohNationwide')}
              </span>
              <span className="officer__pill-sub">{t('ohConsolidated')}</span>
            </div>
          )}
        </div>
      </div>

      {districtScoped && onOwnDistrict ? (
        <p className="officer__footer">
          <span className="officer__footer-tick" aria-hidden="true">
            &#10003;
          </span>
          {t('ohScopedNotice', officer.district)}
        </p>
      ) : null}
    </section>
  )
}
