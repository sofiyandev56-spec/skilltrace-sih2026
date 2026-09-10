import { Link } from 'react-router-dom'
import { useGov } from './GovContext.jsx'
import { STRINGS } from './i18n.js'

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
          <span
            className="mode mode--live"
            style={{
              background: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 9px',
              borderRadius: 4,
              fontSize: '0.74rem',
              fontWeight: 700,
              letterSpacing: '0.03em'
            }}
          >
            <i className="mode__dot" aria-hidden="true" style={{ background: '#22c55e', width: 6, height: 6, borderRadius: '50%' }} />
            NIC Cloud Infrastructure &bull; Sovereign Encrypted
          </span>
          <Link to="/" className="gov-identity__brand">
            <span className="gov-identity__name">{t('portalName')}</span>
            <span className="gov-identity__tagline">{t('portalTagline')}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
