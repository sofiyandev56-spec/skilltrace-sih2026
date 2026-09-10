import React from 'react'
import { useGov } from './GovContext.jsx'

const POLICY_SECTIONS = [
  {
    id: 'privacy',
    title: 'Privacy Policy & DPDPA 2023 Compliance',
    titleHi: 'गोपनीयता नीति एवं डीपीडीपीए 2023 अनुपालन',
    content: (
      <>
        <p>
          SkillTrace is designed with a <strong>Consent-First Architecture</strong> in strict compliance
          with the <strong>Digital Personal Data Protection Act (DPDPA), 2023</strong> and the Guidelines for
          Indian Government Websites (GIGW 3.0).
        </p>
        <h4>1. Purpose Limitation & Data Minimisation</h4>
        <p>
          Trainee contact details and outcomes are collected solely for measuring longitudinal skilling
          effectiveness and provider performance. Personal identifiers are pseudonymised in all published
          analytics.
        </p>
        <h4>2. Revocable & Granular Consent</h4>
        <p>
          Every trainee retains the absolute statutory right to withdraw their consent at any time without
          prejudice to their certification or entitlements. Upon withdrawal, the individual's record is
          immediately purged from all active ledgers and downstream aggregate reports without batch delay.
        </p>
        <h4>3. Evidence Triangulation without Mass Surveillance</h4>
        <p>
          Income and placement verification uses the RBI-regulated Account Aggregator (AA) framework where
          the Ministry acts as a Financial Information User (FIU) under explicit citizen consent.
        </p>
      </>
    ),
  },
  {
    id: 'accessibility',
    title: 'Accessibility Statement & RPwD Act 2016',
    titleHi: 'सुगम्यता विवरण एवं दिव्यांगजन अधिकार अधिनियम 2016',
    content: (
      <>
        <p>
          This portal has been developed to achieve conformity with the <strong>Guidelines for Indian
          Government Websites (GIGW 3.0)</strong> and the <strong>World Wide Web Consortium (W3C) Web
          Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong>, as mandated under the{' '}
          <strong>Rights of Persons with Disabilities (RPwD) Act, 2016</strong>.
        </p>
        <h4>Accessibility Provisions Built-In:</h4>
        <ul>
          <li><strong>Skip to Main Content:</strong> Primary keyboard access link at the top of every page.</li>
          <li><strong>Font Resizing:</strong> A- / A / A+ controls allowing on-demand text scaling up to 200% without loss of layout integrity.</li>
          <li><strong>High Contrast Mode:</strong> High contrast color schemes catering to users with visual impairments.</li>
          <li><strong>Bilingual Chrome:</strong> Full support for English and Hindi (हिन्दी) Devanagari script.</li>
          <li><strong>Tabular Numerics & Non-reliance on Color:</strong> Every chart and table metric provides descriptive text and distinct shape semantics so information is not conveyed solely by color.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    titleHi: 'नियम और शर्तें',
    content: (
      <>
        <p>
          This system is maintained by the Ministry of Skill Development and Entrepreneurship (MSDE),
          Government of India, as a proof-of-concept prototype for Smart India Hackathon (SIH) 2026.
        </p>
        <p>
          Access to this dashboard is intended for authorized government evaluation officers, accredited
          training partners, and designated field verification personnel. Unauthorised tampering with outcome
          records or submission of fraudulent placement assertions is punishable under the Information
          Technology Act, 2000.
        </p>
      </>
    ),
  },
  {
    id: 'copyright',
    title: 'Copyright Policy',
    titleHi: 'कॉपीराइट नीति',
    content: (
      <>
        <p>
          The contents of this portal may not be reproduced partially or fully without due permission from the
          Ministry of Skill Development and Entrepreneurship. If referred to as part of research or public
          reporting, the source must be acknowledged appropriately as &ldquo;SkillTrace &mdash; Ministry of Skill
          Development and Entrepreneurship, Government of India&rdquo;.
        </p>
      </>
    ),
  },
  {
    id: 'hyperlink',
    title: 'Hyperlinking Policy',
    titleHi: 'हाइपरलिंकिंग नीति',
    content: (
      <>
        <p>
          We do not object to you linking directly to the information hosted on this portal. However, we do
          not permit our pages to be loaded into frames on your site. The pages must load into a newly opened
          browser window of the user.
        </p>
      </>
    ),
  },
  {
    id: 'rti',
    title: 'Right to Information (RTI Act 2005)',
    titleHi: 'सूचना का अधिकार (RTI Act 2005)',
    content: (
      <>
        <p>
          In accordance with Section 4(1)(b) of the <strong>Right to Information Act, 2005</strong>, SkillTrace
          proactively publishes objective, evidence-backed post-training outcome metrics to promote
          transparency and accountability in government-funded vocational schemes.
        </p>
        <p>
          Citizens can inspect certified vs verified placement ratios, centre rankings, and attrition trends
          directly through this public oversight interface.
        </p>
      </>
    ),
  },
  {
    id: 'disclaimer',
    title: 'Disclaimer',
    titleHi: 'अस्वीकरण',
    content: (
      <>
        <p>
          This portal has been developed as an ideation and working prototype for <strong>Smart India Hackathon
          2026</strong> (Problem Statement ID: SIH26135, Team: Tech Titans).
        </p>
        <p>
          The sample trainee records, employer check-ins, and center evaluations shown in the demonstration
          environment are synthetically seeded for realistic stress-testing and demonstration of the 3-month
          verification rule and evidence-tier decomposition algorithms.
        </p>
      </>
    ),
  },
]

/** Matches the topbar's steps; textSize is a named step, not a multiplier. */
const MODAL_TEXT_SIZES = [
  { key: 'small', glyph: 'A', labelKey: 'decrease', px: 10 },
  { key: 'normal', glyph: 'A', labelKey: 'normal', px: 12 },
  { key: 'large', glyph: 'A', labelKey: 'increase', px: 14 },
]

export default function GovPolicyModal() {
  const { policyModal, setPolicyTab, closePolicy, lang, textSize, setTextSize, t } = useGov()
  if (!policyModal.open) return null

  const active = POLICY_SECTIONS.find((s) => s.id === policyModal.tab) || POLICY_SECTIONS[0]

  return (
    <div className="gov-modal-backdrop" onClick={closePolicy} role="dialog" aria-modal="true">
      <div className="gov-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gov-modal__header">
          <div className="gov-modal__title">
            <span className="gov-modal__tag">GIGW 3.0 / भारत सरकार</span>
            <h3>{lang === 'hi' ? active.titleHi : active.title}</h3>
          </div>
          <div className="gov-modal__header-actions">
            {/* These are the longest passages of text in the product, so the
                text-size control belongs here as well as in the topbar. */}
            <div
              className="gov-text-controls gov-text-controls--modal"
              role="group"
              aria-label={t('textSize')}
            >
              <span className="gov-text-controls__label">{t('textSize')}</span>
              {MODAL_TEXT_SIZES.map((size) => (
                <button
                  key={size.key}
                  type="button"
                  className="gov-text-btn"
                  aria-pressed={textSize === size.key}
                  aria-label={t(size.labelKey)}
                  title={t(size.labelKey)}
                  onClick={() => setTextSize(size.key)}
                  style={{ fontSize: size.px }}
                >
                  {size.glyph}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="gov-modal__close"
              onClick={closePolicy}
              aria-label={t('closeDialog')}
            >
              &times;
            </button>
          </div>
        </div>

        <div className="gov-modal__layout">
          <aside className="gov-modal__tabs">
            {POLICY_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                className={`gov-modal__tab-btn ${sec.id === active.id ? 'is-active' : ''}`}
                onClick={() => setPolicyTab(sec.id)}
              >
                {lang === 'hi' ? sec.titleHi.split('(')[0] : sec.title.split('&')[0]}
              </button>
            ))}
          </aside>

          <div className="gov-modal__body">
            {active.content}
          </div>
        </div>

        <div className="gov-modal__footer">
          <div className="small muted">
            Ministry of Skill Development &amp; Entrepreneurship &middot; Government of India
          </div>
          <button type="button" className="btn btn--sm btn--primary" onClick={closePolicy}>
            {lang === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
