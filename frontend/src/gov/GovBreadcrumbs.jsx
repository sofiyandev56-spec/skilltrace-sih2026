import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useGov } from './GovContext.jsx'
import { ROUTE_META } from '../routes.js'

const ROUTE_SECTIONS = {
  '/': { sectionEn: 'Oversight', sectionHi: 'निगरानी' },
  '/disputes': { sectionEn: 'Oversight', sectionHi: 'निगरानी' },
  '/follow-up': { sectionEn: 'Oversight', sectionHi: 'निगरानी' },
  '/check-in': { sectionEn: 'Data Collection', sectionHi: 'डेटा संग्रह' },
  '/consent': { sectionEn: 'Trainee Rights', sectionHi: 'प्रशिक्षार्थी अधिकार' },
}

export default function GovBreadcrumbs() {
  const { pathname } = useLocation()
  const { lang, t } = useGov()
  const meta = ROUTE_META[pathname] || { title: 'SkillTrace' }
  const sec = ROUTE_SECTIONS[pathname] || { sectionEn: 'Portal', sectionHi: 'पोर्टल' }

  return (
    <div className="gov-breadcrumb-bar">
      <div className="gov-breadcrumb-bar__inner">
        <nav aria-label="Breadcrumb" className="gov-breadcrumb">
          <ol>
            <li>
              <Link to="/" className="gov-breadcrumb__link">
                {t('breadcrumbHome')}
              </Link>
            </li>
            <li className="gov-breadcrumb__sep" aria-hidden="true">&rsaquo;</li>
            <li>
              <span className="gov-breadcrumb__text">
                {lang === 'hi' ? sec.sectionHi : sec.sectionEn}
              </span>
            </li>
            <li className="gov-breadcrumb__sep" aria-hidden="true">&rsaquo;</li>
            <li aria-current="page">
              <span className="gov-breadcrumb__current">
                {lang === 'hi' && meta.titleHi ? meta.titleHi : meta.title}
              </span>
            </li>
          </ol>
        </nav>

        {meta.desc && (
          <div className="gov-page-desc">
            {lang === 'hi' && meta.descHi ? meta.descHi : meta.desc}
          </div>
        )}
      </div>
    </div>
  )
}
