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
      {/* Subtle animated Indian Tricolor light effect */}
      <div className="tricolor-footer-effect" aria-hidden="true">
        <div className="tricolor-glow tricolor-orange" />
        <div className="tricolor-glow tricolor-white" />
        <div className="tricolor-glow tricolor-green" />
        <div className="tricolor-wave" />
      </div>

      <div className="gov-footer__top">
        <div className="gov-footer__inner">
          <div className="gov-footer__brand-row">
            <div className="gov-footer__brand-text">
              <h3 className="gov-footer__brand-title">
                {hi ? 'राष्ट्रीय कौशल अनुरेखणीयता प्राधिकरण' : 'National Skill Traceability Authority'}
              </h3>
              <p className="gov-footer__brand-sub">
                {hi ? 'कौशल विकास एवं उद्यमशीलता मंत्रालय, भारत सरकार' : 'Ministry of Skill Development & Entrepreneurship, Government of India'}
              </p>
            </div>
            <div className="gov-footer__badges">
              <span className="gov-footer__badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                GIGW 3.0 Certified
              </span>
              <span className="gov-footer__badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                STQC Cleared Level 3
              </span>
              <span className="gov-footer__badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
                NIC Cloud Infrastructure
              </span>
            </div>
          </div>

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
              <span className="gov-footer__statement">
                {hi 
                  ? '© राष्ट्रीय कौशल अनुरेखणीयता प्राधिकरण | कौशल विकास एवं उद्यमशीलता मंत्रालय। सर्वाधिकार सुरक्षित।'
                  : '© National Skill Traceability Authority | Ministry of Skill Development & Entrepreneurship. All Rights Reserved.'}
              </span>
              <span className="gov-footer__sub">
                {hi
                  ? 'राष्ट्रीय सूचना विज्ञान केंद्र (एनआईसी) द्वारा डिजाइन एवं होस्ट किया गया। जीआईजीडब्ल्यू 3.0 अनुरूप।'
                  : 'Designed & Hosted by National Informatics Centre (NIC). GIGW 3.0 Compliant.'}
              </span>
            </div>

            <div className="gov-footer__meta">
              <span className="gov-footer__meta-item">
                <span className="gov-footer__meta-label">{hi ? 'पोर्टल संस्करण:' : 'Portal Version:'}</span>
                <strong className="num">v4.2.8-LTS</strong>
              </span>
              <span className="gov-footer__meta-sep">|</span>
              <span className="gov-footer__meta-item">
                <span className="gov-footer__meta-label">{hi ? 'अंतिम अद्यतन:' : 'Last Updated:'}</span>
                <strong className="num">10 Sep 2026</strong>
              </span>
              <span className="gov-footer__meta-sep">|</span>
              <span className="gov-footer__meta-item">
                <span className="gov-footer__meta-label">{hi ? 'कुल आगंतुक:' : 'Total Visitors:'}</span>
                <strong className="num">14,892,410</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
