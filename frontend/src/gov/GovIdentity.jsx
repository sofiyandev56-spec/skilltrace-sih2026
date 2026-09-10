import { Link } from 'react-router-dom'
import { useGov } from './GovContext.jsx'
import { STRINGS } from './i18n.js'
import ModeBadge from '../components/ModeBadge.jsx'

/**
 * The masthead: the State Emblem, the government, the ministry that owns the
 * portal, and the portal's own identity — in that order of precedence, which
 * is how an official Indian government header is read.
 *
 * Both language forms of the government's name are shown at once, as they are
 * on official portals; the selected language leads.
 */
export default function GovIdentity() {
  const { t, lang } = useGov()
  const other = lang === 'hi' ? STRINGS.en : STRINGS.hi

  return (
    <div className="gov-identity">
      <div className="gov-identity__inner">
        <div className="gov-identity__org">
          <img
            src="/state-emblem.png"
            alt="State Emblem of India"
            className="gov-identity__emblem"
            width="211"
            height="360"
          />
          <div className="gov-identity__titles">
            <span className="gov-identity__country">{t('govOfIndia')}</span>
            <span className="gov-identity__country-alt">{other.govOfIndia}</span>
            <span className="gov-identity__ministry">{t('ministry')}</span>
          </div>
        </div>

        <div className="gov-identity__portal">
          <ModeBadge />
          <Link to="/" className="gov-identity__brand">
            <span className="gov-identity__name">{t('portalName')}</span>
            <span className="gov-identity__tagline">{t('portalTagline')}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
