import { useGov } from './GovContext.jsx'

/**
 * GIGW 3.0 requires a defined set of disclosures to be reachable from every
 * page: the website policies, an accessibility statement, RTI, and a clear
 * statement of who owns the content and when it was last updated.
 */
const POLICY_LINKS = [
  ['privacy', 'Privacy Policy & DPDPA 2023', 'गोपनीयता नीति एवं डीपीडीपीए'],
  ['terms', 'Terms & Conditions', 'नियम एवं शर्तें'],
  ['copyright', 'Copyright Policy', 'कॉपीराइट नीति'],
  ['hyperlink', 'Hyperlinking Policy', 'हाइपरलिंकिंग नीति'],
  ['accessibility', 'Accessibility Statement', 'सुगम्यता विवरण'],
  ['rti', 'Right to Information', 'सूचना का अधिकार'],
  ['disclaimer', 'Disclaimer', 'अस्वीकरण'],
]

export default function GovFooter() {
  const { lang, openPolicy, t } = useGov()
  const hi = lang === 'hi'

  return (
    <footer className="gov-footer" role="contentinfo">
      <div className="gov-footer__top">
        <div className="gov-footer__inner">
          <ul className="gov-footer__nav">
            {POLICY_LINKS.map(([id, en, hiLabel]) => (
              <li key={id}>
                <button type="button" className="gov-footer__link" onClick={() => openPolicy(id)}>
                  {hi ? hiLabel : en}
                </button>
              </li>
            ))}
          </ul>

          <div className="gov-footer__info-grid">
            <div className="gov-footer__ownership">
              <span className="gov-footer__statement">{t('contentOwned')}</span>
              <span className="gov-footer__sub">{t('accessibilityCompliance')}</span>
              <span className="gov-footer__compliance">{t('prototypeNotice')}</span>
            </div>

            <div className="gov-footer__meta">
              <div className="gov-footer__meta-item">
                <span className="gov-footer__meta-label">{t('lastUpdated')}</span>
                <strong className="num">10 Sep 2026</strong>
              </div>
              <div className="gov-footer__meta-item">
                <span className="gov-footer__meta-label">{hi ? 'संस्करण' : 'Version'}</span>
                <strong className="num">0.1 (prototype)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
