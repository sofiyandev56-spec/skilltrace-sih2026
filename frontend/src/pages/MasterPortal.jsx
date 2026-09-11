import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { useGov } from '../gov/GovContext.jsx'
import { useToast } from '../components/Toast.jsx'

/**
 * Who may sign in, and as what.
 *
 * Granting a role here is the most consequential action in the product, so
 * the page states what each role can reach and shows the change landing
 * rather than assuming it did. The server refuses every one of these calls
 * without a government token — this screen is the convenience, not the
 * control.
 */
const ROLES = [
  { key: 'client', labelKey: 'mpRoleClient', descKey: 'mpRoleClientDesc' },
  { key: 'employer', labelKey: 'mpRoleEmployer', descKey: 'mpRoleEmployerDesc' },
  { key: 'government', labelKey: 'mpRoleGovernment', descKey: 'mpRoleGovernmentDesc' },
]

const FILTERS = [
  { key: 'all', labelKey: 'mpAll' },
  { key: 'government', labelKey: 'mpRoleGovernment' },
  { key: 'employer', labelKey: 'mpRoleEmployer' },
  { key: 'client', labelKey: 'mpRoleClient' },
]

export default function MasterPortal() {
  const { t } = useGov()
  const { toast } = useToast()
  const { listUsers, assignRole, whitelistUser, deleteUser, session } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)

  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('employer')
  const [adding, setAdding] = useState(false)

  const refresh = useCallback(async () => {
    const res = await listUsers()
    if (!res.ok) {
      setError(res.status === 401 || res.status === 403 ? 'forbidden' : 'unavailable')
      setUsers([])
    } else {
      setError(null)
      setUsers(Array.isArray(res.data) ? res.data : [])
    }
    setLoading(false)
  }, [listUsers])

  useEffect(() => {
    refresh()
  }, [refresh])

  const changeRole = async (user, role) => {
    if (role === user.role) return
    setBusyId(user.id)
    const res = await assignRole(user.id, role)
    setBusyId(null)
    if (!res.ok) {
      toast.push(t('mpRoleFailed'), { tone: 'danger' })
      return
    }
    toast.push(t('mpRoleChanged', user.name || user.email, t(`mpRole${role[0].toUpperCase()}${role.slice(1)}`)))
    refresh()
  }

  const remove = async (user) => {
    setBusyId(user.id)
    const res = await deleteUser(user.id)
    setBusyId(null)
    if (!res.ok) {
      toast.push(t('mpRemoveFailed'), { tone: 'danger' })
      return
    }
    toast.push(t('mpRemoved', user.name || user.email))
    refresh()
  }

  const submitWhitelist = async (e) => {
    e.preventDefault()
    const email = newEmail.trim()
    if (!email) return
    setAdding(true)
    const res = await whitelistUser(email, newRole)
    setAdding(false)
    if (!res.ok) {
      toast.push(t('mpWhitelistFailed'), { tone: 'danger' })
      return
    }
    toast.push(t('mpWhitelisted', email))
    setNewEmail('')
    refresh()
  }

  const q = search.trim().toLowerCase()
  const rows = users.filter((u) => {
    if (filter !== 'all' && u.role !== filter) return false
    if (!q) return true
    return `${u.name ?? ''} ${u.email ?? ''} ${u.id ?? ''}`.toLowerCase().includes(q)
  })

  if (error) {
    return (
      <div className="page">
        <div className="panel">
          <div className="empty">
            <p>{t(error === 'forbidden' ? 'mpForbidden' : 'mpUnavailable')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">{t('mpTitle')}</h2>
            <p className="panel__sub">{t('mpSubtitle')}</p>
          </div>
          <button type="button" className="btn btn--sm" onClick={refresh}>
            {t('mpRefresh')}
          </button>
        </div>

        <div className="callout-rule">
          <div>
            <strong>{t('mpWhatRolesMean')}</strong>{' '}
            {ROLES.map((r, i) => (
              <span key={r.key}>
                {i > 0 ? ' · ' : ''}
                <strong>{t(r.labelKey)}</strong> — {t(r.descKey)}
              </span>
            ))}
          </div>
        </div>

        <form className="filters" onSubmit={submitWhitelist}>
          <label className="field">
            <span className="field__label" htmlFor="mp-email">
              {t('mpInviteEmail')}
            </span>
            <input
              id="mp-email"
              className="input"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t('mpInvitePlaceholder')}
            />
          </label>
          <label className="field">
            <span className="field__label" htmlFor="mp-role">
              {t('mpInviteRole')}
            </span>
            <select
              id="mp-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r.key} value={r.key}>
                  {t(r.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <div className="filters__actions">
            <button type="submit" className="btn btn--primary" disabled={adding || !newEmail.trim()}>
              {adding ? t('mpInviting') : t('mpInvite')}
            </button>
          </div>
        </form>
        <p className="note">{t('mpInviteNote')}</p>
      </div>

      <div className="panel">
        <div className="filters">
          <div className="filters__actions" role="group" aria-label={t('mpFilterLabel')}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`btn btn--sm${filter === f.key ? ' btn--primary' : ''}`}
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>
          <label className="field">
            <span className="field__label" htmlFor="mp-search">
              {t('mpSearch')}
            </span>
            <input
              id="mp-search"
              className="input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('mpSearchPlaceholder')}
            />
          </label>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 260 }} />
        ) : rows.length === 0 ? (
          <div className="empty">
            <p>{t('mpNoUsers')}</p>
          </div>
        ) : (
          <div className="tblwrap">
            <table className="tbl">
              <caption className="sr-only">{t('mpTitle')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('mpColName')}</th>
                  <th scope="col">{t('mpColRole')}</th>
                  <th scope="col">{t('mpColStatus')}</th>
                  <th scope="col">{t('mpColActions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const isSelf = u.id === session?.id
                  return (
                    <tr key={u.id}>
                      <th scope="row">
                        <strong>{u.name || '—'}</strong>
                        <br />
                        <span className="faint small">{u.email}</span>
                      </th>
                      <td>
                        <select
                          value={u.role}
                          disabled={busyId === u.id || u.is_master}
                          onChange={(e) => changeRole(u, e.target.value)}
                          aria-label={t('mpColRole')}
                        >
                          {ROLES.map((r) => (
                            <option key={r.key} value={r.key}>
                              {t(r.labelKey)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {u.is_master ? (
                          <span className="pill">{t('mpMaster')}</span>
                        ) : u.verified ? (
                          <span className="pill">{t('mpVerified')}</span>
                        ) : (
                          <span className="faint small">{t('mpUnverified')}</span>
                        )}
                      </td>
                      <td>
                        {/* The master account and your own account are not
                            removable here — locking yourself out of the portal
                            that grants access is not a recoverable mistake. */}
                        {u.is_master || isSelf ? (
                          <span className="faint small">{t('mpProtected')}</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--sm btn--danger"
                            disabled={busyId === u.id}
                            onClick={() => remove(u)}
                          >
                            {t('mpRemove')}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
