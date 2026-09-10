import { Link } from 'react-router-dom'
import { useGov } from './GovContext.jsx'
import ModeBadge from '../components/ModeBadge.jsx'

/**
 * The masthead: who the government is, which ministry owns the portal, and
 * what the portal is called.
 *
 * The mark used here is a neutral prototype placeholder. The State Emblem of
 * India is deliberately not displayed — its use is restricted by the State
 * Emblem of India (Prohibition of Improper Use) Act, 2005, and a hackathon
 * project holds no authorisation to display it.
 */
export default function GovIdentity() {
  const { t } = useGov()

  return (
    <div className="gov-identity">
      <div className="gov-identity__inner">
        <div className="gov-identity__org">
          <img src="/emblem.svg" alt="" className="gov-identity__emblem" aria-hidden="true" />
          <div className="gov-identity__titles">
            <span className="gov-identity__country">
              <img src="/ashoka-chakra.svg" alt="" className="gov-identity__chakra" aria-hidden="true" />
              {t('govOfIndia')}
            </span>
            <span className="gov-identity__ministry">{t('ministry')}</span>
          </div>
        </div>

        <div className="gov-identity__portal">
          <ModeBadge />
          <Link to="/" className="gov-identity__brand" style={{ textDecoration: 'none' }}>
            <span className="gov-identity__name">
              <span className="gov-identity__badge" aria-hidden="true">
                ST
              </span>
              {t('portalName')}
            </span>
            <span className="gov-identity__tagline">{t('portalTagline')}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
