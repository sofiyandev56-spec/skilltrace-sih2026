import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { api, mock } from '../api/client.js'
import { subscribe } from '../api/mock/store.js'
import ModeBadge from './ModeBadge.jsx'
import { NAV, ROUTE_META } from '../routes.js'

export default function AppShell() {
  const { pathname } = useLocation()
  const meta = ROUTE_META[pathname] || { title: 'SkillTrace', desc: '' }
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
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__mark">
            <span aria-hidden="true">ST</span>
            SkillTrace
          </div>
          <div className="sidebar__sub">
            Ministry of Skill Development
            <br />
            Outcomes Tracking System
          </div>
        </div>

        <nav className="sidebar__nav">
          {NAV.map((group) => (
            <div key={group.group}>
              <div className="sidebar__group">{group.group}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                  {item.badge && counts[item.badge] > 0 ? (
                    <span className="navlink__badge num">{counts[item.badge]}</span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div style={{ marginBottom: 8 }}>Data as of 10 Sep 2026</div>
          <button type="button" className="btn btn--sm" onClick={resetDemo} style={{ width: '100%' }}>
            Reset demo data
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="topbar__title">{meta.title}</div>
            {meta.desc ? <div className="topbar__desc">{meta.desc}</div> : null}
          </div>
          <div className="topbar__right">
            <ModeBadge />
          </div>
        </header>
        <main className={`content ${meta.narrow ? 'content--narrow' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
