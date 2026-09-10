import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { useGov } from './GovContext.jsx'
import { routeMetaFor } from '../routes.js'


export default function GovBreadcrumbs() {
  const { isMinistry } = useAuth()
  const home = isMinistry ? '/ministry' : '/client'
  const { pathname } = useLocation()
  const { lang, t } = useGov()
  const meta = routeMetaFor(pathname)

  return (
    <div className="gov-breadcrumb-bar">
      <div className="gov-breadcrumb-bar__inner">
        <nav aria-label="Breadcrumb" className="gov-breadcrumb">
          <ol>
            <li>
              <Link to={home} className="gov-breadcrumb__link">
                {t('breadcrumbHome')}
              </Link>
            </li>
            <li className="gov-breadcrumb__sep" aria-hidden="true">&rsaquo;</li>
            <li>
              <span className="gov-breadcrumb__text">
                {t(meta.sectionKey)}
              </span>
            </li>
            <li className="gov-breadcrumb__sep" aria-hidden="true">&rsaquo;</li>
            <li aria-current="page">
              <span className="gov-breadcrumb__current">
                {t(meta.titleKey)}
              </span>
            </li>
          </ol>
        </nav>

        {meta.desc && (
          <div className="gov-page-desc">
            {meta.descKey ? t(meta.descKey) : null}
          </div>
        )}
      </div>
    </div>
  )
}
