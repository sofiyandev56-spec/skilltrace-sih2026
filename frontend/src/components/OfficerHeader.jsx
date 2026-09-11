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

  // The backend describes reach as a permission rather than a scope string,
  // and identifies officers by `id`. Both spellings are accepted so the
  // component works against the API and against a seeded officer record.
  const officerId = officer.officer_id ?? officer.id
  const phone = officer.phone_no ?? officer.phone
  const nationwide =
    officer.permissions?.can_view_all_districts ?? officer.scope !== 'district'
  const scope = officer.scope ?? (nationwide ? 'national' : 'district')

  // Only an officer actually posted to a district can scope the dashboard to
  // one; a national officer has nothing to toggle between.
  const districtScoped = Boolean(officer.district) && !nationwide
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
          <span className="officer__badge">{t(SCOPE_KEY[scope] || SCOPE_KEY.district)}</span>
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
            {officerId ? <span className="officer__id mono">{officerId}</span> : null}
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
            {phone ? (
              <>
                <span className="officer__sep" aria-hidden="true">
                  |
                </span>
                <span className="mono">{formatPhone(phone)}</span>
              </>
            ) : null}
          </p>
        </div>

        <div className="officer__actions">
          {districtScoped ? (
            <div className="officer__pill">
              <span className="officer__pill-title">
                {officer.district}
              </span>
              <span className="officer__pill-sub">{t('ohAssignedDistrict', officer.district)}</span>
            </div>
          ) : (
            <div className="officer__pill">
              <span className="officer__pill-title">
                {t(scope === 'state' ? 'ohStatewide' : 'ohNationwide')}
              </span>
              <span className="officer__pill-sub">{t('ohConsolidated')}</span>
            </div>
          )}
        </div>
      </div>

      {districtScoped ? (
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
