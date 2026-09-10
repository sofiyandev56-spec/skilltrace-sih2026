import Breadcrumbs from '../gov/Breadcrumbs.jsx'
import { useA11y } from '../gov/AccessibilityProvider.jsx'

const SECTIONS = [
  {
    id: 'terms',
    title: 'Terms & Conditions',
    body: [
      'This portal is a prototype built for Smart India Hackathon 2026. It is not an official website of the Government of India, and nothing on it constitutes an official record, decision or communication of any ministry or department.',
      'All trainee names, employer names, outcome records and figures shown are synthetic data generated for demonstration. They do not describe any real person or organisation. Any resemblance to a real individual is coincidental.',
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    body: [
      'This prototype does not collect, store or transmit personal information about its visitors. It sets no analytics or advertising cookies and performs no tracking.',
      'Preferences you set in the header — language, text size and contrast — are stored in your own browser using local storage so they persist between visits. They never leave your device.',
      'Where the prototype is connected to a backend, the outcome records it displays are held under the consent of the trainee concerned. A trainee may withdraw that consent at any time from the Consent screen, and withdrawal removes their records from every figure in the system immediately and without further approval.',
    ],
  },
  {
    id: 'copyright',
    title: 'Copyright Policy',
    body: [
      'Material on this prototype may be reproduced free of charge in any format provided it is reproduced accurately and not used in a misleading context. Where material is being republished, the source must be acknowledged.',
      'Permission to reproduce does not extend to any material identified as being the copyright of a third party. Authorisation to reproduce such material must be obtained from the copyright holder.',
      'The State Emblem of India is not displayed on this prototype. Its use is restricted by the State Emblem of India (Prohibition of Improper Use) Act, 2005, and this project holds no authorisation to display it.',
    ],
  },
  {
    id: 'hyperlinking',
    title: 'Hyperlinking Policy',
    body: [
      'Links to external websites are provided for convenience and information only. This prototype is not responsible for the content of external sites and does not endorse the views expressed on them, nor guarantee the availability of linked pages.',
      'No prior permission is required to link directly to any page hosted here. We do not permit our pages to be loaded into frames on your site; our pages must load into a newly opened browser window.',
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility Statement',
    body: [
      'This portal aims to conform to Level AA of the Web Content Accessibility Guidelines (WCAG) 2.1, the standard set for Indian government websites by GIGW 3.0 and required under section 40 of the Rights of Persons with Disabilities Act, 2016.',
      'Measures taken include: a skip link to the main content on every page, semantic landmark regions, visible keyboard focus on every interactive control, text-size controls offering up to 120% enlargement, a high-contrast theme, form controls with associated labels, colour never used as the only means of conveying meaning, and text alternatives for graphical content.',
      'Evidence tiers are conveyed by a written label as well as by colour, so the trust level attached to a figure is available to a reader who cannot distinguish the tier colours.',
      'If you encounter a page you cannot access, please report it through the Feedback section below so it can be corrected.',
    ],
  },
  {
    id: 'disclaimer',
    title: 'Disclaimer',
    body: [
      'The figures presented in this prototype are computed from synthetic demonstration data. They must not be cited, quoted or relied upon as skilling outcome statistics.',
      'Where the prototype cannot verify an outcome, it reports the outcome as unknown rather than estimating it. Figures shown as "self-reported" or "stale" have not been independently confirmed and should be read accordingly.',
    ],
  },
  {
    id: 'rti',
    title: 'Right to Information',
    body: [
      'On a live deployment, this section would carry the name and contact details of the Central Public Information Officer and the First Appellate Authority for the department, together with the proactive disclosures required under section 4(1)(b) of the Right to Information Act, 2005.',
      'As a hackathon prototype, this portal designates no such officer and holds no records subject to the Act.',
    ],
  },
  {
    id: 'help',
    title: 'Help',
    body: [
      'The dashboard reports outcomes for trainees certified under government skilling courses. Employment is counted only where there is evidence the person was still with the same employer three or more months after being placed; a placement on its own is reported as awaiting confirmation.',
      'Every figure carries an evidence tier. Select any figure to see the breakdown of how the underlying records were confirmed.',
      'Use the filters at the top of the dashboard to narrow the figures by cohort, course, training centre, district or demographic group. All filters apply together.',
    ],
  },
  {
    id: 'feedback',
    title: 'Feedback',
    body: [
      'A live deployment would provide a feedback form and a departmental grievance address here, together with the expected time to respond.',
      'For this prototype, feedback should be directed to the project team through the hackathon submission channel.',
    ],
  },
  {
    id: 'sitemap',
    title: 'Sitemap',
    links: [
      ['/', 'Dashboard — skilling outcomes for the selected cohort'],
      ['/disputes', 'Disputes — records where employer and trainee accounts differ'],
      ['/follow-up', 'Follow-up queue — trainees unreachable after three attempts'],
      ['/check-in', 'Check-in simulator — simulated messaging check-in'],
      ['/employer', 'Employer confirmation — public confirmation page'],
      ['/consent', 'Consent — view and withdraw consent'],
      ['/policies', 'Website policies — this page'],
    ],
  },
]

export default function Policies() {
  const { t } = useA11y()

  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      <Breadcrumbs trail={[{ label: t('navPolicies') }]} />

      <nav className="panel" aria-label="On this page">
        <div className="panel__body">
          <ul className="policy-toc">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {SECTIONS.map((s) => (
        <section className="panel" id={s.id} key={s.id} aria-labelledby={`${s.id}-h`}>
          <div className="panel__head">
            <h2 className="panel__title" id={`${s.id}-h`}>
              {s.title}
            </h2>
          </div>
          <div className="panel__body policy-body">
            {(s.body || []).map((para) => (
              <p key={para.slice(0, 40)}>{para}</p>
            ))}
            {s.links ? (
              <ul className="policy-sitemap">
                {s.links.map(([to, label]) => (
                  <li key={to}>
                    <a href={to}>{label}</a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  )
}
