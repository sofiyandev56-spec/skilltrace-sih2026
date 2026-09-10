import { Link } from 'react-router-dom'
import { useA11y } from './AccessibilityProvider.jsx'

/**
 * GIGW 3.0 requires a defined set of links to be reachable from every page:
 * the website policies, an accessibility statement, help, feedback, a sitemap
 * and RTI. It also requires the page to say who owns the content and when it
 * was last updated.
 */
const POLICY_LINKS = [
  ['footerPolicies', '/policies'],
  ['footerTerms', '/policies#terms'],
  ['footerPrivacy', '/policies#privacy'],
  ['footerCopyright', '/policies#copyright'],
  ['footerHyperlinking', '/policies#hyperlinking'],
  ['footerAccessibility', '/policies#accessibility'],
  ['footerDisclaimer', '/policies#disclaimer'],
  ['footerRti', '/policies#rti'],
  ['footerHelp', '/policies#help'],
  ['footerFeedback', '/policies#feedback'],
  ['footerSitemap', '/policies#sitemap'],
]

/** A real count of visits from this browser — not an invented number. */
function visitCount() {
  try {
    const n = Number(localStorage.getItem('skilltrace.visits') || 0) + 1
    localStorage.setItem('skilltrace.visits', String(n))
    return n
  } catch {
    return 1
  }
}

const VISITS = visitCount()

export default function GovFooter() {
  const { t } = useA11y()

  return (
    <footer className="gov-foot" role="contentinfo">
      <div className="gov-foot__links">
        <ul>
          {POLICY_LINKS.map(([key, to]) => (
            <li key={key}>
              <Link to={to}>{t(key)}</Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="gov-foot__meta">
        <p>{t('contentOwned')}</p>
        <p>{t('accessibilityCompliance')}</p>
        <p className="gov-foot__proto">{t('developedBy')}</p>
        <p className="gov-foot__stamp">
          <span>
            {t('lastUpdated')}: <span className="num">10 Sep 2026</span>
          </span>
          <span>
            {t('visitors')}: <span className="num">{VISITS.toLocaleString('en-IN')}</span>
          </span>
        </p>
      </div>
    </footer>
  )
}
