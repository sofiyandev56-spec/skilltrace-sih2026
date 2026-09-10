import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { api, mock } from '../api/client.js'
import { subscribe } from '../api/mock/store.js'
import ModeBadge from './ModeBadge.jsx'
import Breadcrumbs from '../gov/Breadcrumbs.jsx'
import { useA11y } from '../gov/AccessibilityProvider.jsx'
import { NAV, ROUTE_META } from '../routes.js'

export default function AppShell() {
  const { pathname } = useLocation()
  const { t } = useA11y()
  const meta = ROUTE_META[pathname] || {}
  const [counts, setCounts] = useState({ disputes: 0, followup: 0 })

  useEffect(() => {
    let alive = true
    const load = async () => {
      const [d, f] = await Promise.all([api.getDisputes(), api.getFollowupQueue()])
      if (!alive) return
      setCounts({
        disputes: (d || []).filter((x) => x.status !== 'resolved').length,
        followup: (f || []).filter((x) => !x.assigned_to).length,
      })
    }
    load()
    const off = subscribe(load) // keep badges honest after a resolve/assign/withdrawal
    return () => {
      alive = false
      off()
    }
  }, [pathname])

  const resetDemo = () => {
    mock.resetAll()
    window.location.reload()
  }

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Sections">
        {NAV.map((group) => (
          <div key={group.groupKey}>
            <div className="sidebar__group">{t(group.groupKey)}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}
              >
                {t(item.labelKey)}
                {item.badge && counts[item.badge] > 0 ? (
                  <span className="navlink__badge num">{counts[item.badge]}</span>
                ) : null}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar__foot">
          <button type="button" className="btn btn--sm" onClick={resetDemo} style={{ width: '100%' }}>
            Reset demo data
          </button>
        </div>
      </nav>

      <div className="main">
        <div className="topbar">
          <div>
            <h1 className="topbar__title">{meta.titleKey ? t(meta.titleKey) : t('portalName')}</h1>
            {meta.descKey ? <p className="topbar__desc">{t(meta.descKey)}</p> : null}
          </div>
          <div className="topbar__right">
            <ModeBadge />
          </div>
        </div>

        <main className="content" id="main-content" tabIndex={-1}>
          {meta.crumbKey ? (
            <div style={{ marginBottom: 16 }}>
              <Breadcrumbs trail={[{ label: t(meta.crumbKey) }]} />
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
