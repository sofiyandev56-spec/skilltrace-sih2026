import { useGov } from './GovContext.jsx'

/**
 * GIGW 3.0 requires a defined set of disclosures to be reachable from every
 * page: the website policies, an accessibility statement, RTI, and a clear
 * statement of who owns the content and when it was last updated.
 *
 * `compact` keeps every one of those disclosures but drops the ownership and
 * version grid to a single line, so the footer supports a short page such as
 * the officer sign-in rather than out-weighing it.
 */
const POLICY_LINKS = [
  ['privacy', 'footerPrivacy'],
  ['terms', 'footerTerms'],
  ['copyright', 'footerCopyright'],
  ['hyperlink', 'footerHyperlinking'],
  ['accessibility', 'footerAccessibility'],
  ['rti', 'footerRti'],
  ['disclaimer', 'footerDisclaimer'],
]

const LAST_UPDATED = '10 Sep 2026'
const VERSION = '0.1 (prototype)'

export default function GovFooter({ compact = false }) {
  const { openPolicy, t } = useGov()

  const links = (
    <ul className="gov-footer__nav">
      {POLICY_LINKS.map(([id, key]) => (
        <li key={id}>
          <button type="button" className="gov-footer__link" onClick={() => openPolicy(id)}>
            {t(key)}
          </button>
        </li>
      ))}
    </ul>
  )

  if (compact) {
    return (
      <footer className="gov-footer gov-footer--compact" role="contentinfo">
        <div className="gov-footer__inner">
          {links}
          <p className="gov-footer__line">
            <span>{t('contentOwned')}</span>
            <span className="gov-footer__dot" aria-hidden="true">
              ·
            </span>
            <span>{t('prototypeNotice')}</span>
            <span className="gov-footer__dot" aria-hidden="true">
              ·
            </span>
            <span>
              {t('lastUpdated')} <span className="num">{LAST_UPDATED}</span>
            </span>
          </p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="gov-footer" role="contentinfo">
      <div className="gov-footer__top">
        <div className="gov-footer__inner">
          {links}

          <div className="gov-footer__info-grid">
            <div className="gov-footer__ownership">
              <span className="gov-footer__statement">{t('contentOwned')}</span>
              <span className="gov-footer__sub">{t('accessibilityCompliance')}</span>
              <span className="gov-footer__compliance">{t('prototypeNotice')}</span>
            </div>

            <div className="gov-footer__meta">
              <div className="gov-footer__meta-item">
                <span className="gov-footer__meta-label">{t('lastUpdated')}</span>
                <strong className="num">{LAST_UPDATED}</strong>
              </div>
              <div className="gov-footer__meta-item">
                <span className="gov-footer__meta-label">{t('version')}</span>
                <strong className="num">{VERSION}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
