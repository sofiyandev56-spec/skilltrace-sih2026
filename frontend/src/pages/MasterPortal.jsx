import React, { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import GovTopbar from '../gov/GovTopbar.jsx'
import GovNav from '../gov/GovNav.jsx'

export default function MasterPortal() {
  const {
    user,
    isMasterAdmin,
    getUsersRoster,
    assignUserRole,
    whitelistUser,
    deleteUser,
    MASTER_GOV_EMAIL
  } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  // Pre-authorization form state
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('employer')
  const [newOrg, setNewOrg] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const refreshUsers = async () => {
    setLoading(true)
    try {
      const roster = await getUsersRoster()
      setUsers(roster)
    } catch (err) {
      console.error('Failed to load roster:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUsers()
  }, [])

  const showNotification = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4500)
  }

  const handleRoleChange = async (userId, targetRole, verified = true, email = null) => {
    const actionKey = userId || email
    setActionLoading(actionKey)
    try {
      const updatedRoster = await assignUserRole({
        userId,
        email,
        role: targetRole,
        verified: Boolean(verified)
      })
      if (Array.isArray(updatedRoster)) {
        setUsers(updatedRoster)
      } else {
        await refreshUsers()
      }
      showNotification(`Updated ${email || userId} to '${targetRole}' (Verified: ${verified ? 'Active' : 'Pending'})`)
    } catch (err) {
      showNotification(err.message || 'Failed to update user', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleVerification = async (u) => {
    const nextVerified = !u.verified
    await handleRoleChange(u.id, u.role, nextVerified, u.email)
  }

  const handleDelete = async (userId, userEmail) => {
    if (userEmail === MASTER_GOV_EMAIL) {
      alert('Master Sovereign Administrator cannot be deleted.')
      return
    }
    if (!window.confirm(`Are you sure you want to remove user: ${userEmail}?`)) return
    setActionLoading(userId)
    try {
      await deleteUser(userId)
      showNotification(`Removed user ${userEmail} from access roster`)
      await refreshUsers()
    } catch (err) {
      showNotification(err.message || 'Failed to delete user', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleWhitelistSubmit = async (e) => {
    e.preventDefault()
    if (!newEmail.trim()) {
      showNotification('Email is required', 'error')
      return
    }
    try {
      await whitelistUser({
        email: newEmail.trim().toLowerCase(),
        name: newName.trim() || newEmail.split('@')[0],
        role: newRole,
        organization: newOrg.trim()
      })
      showNotification(`User ${newEmail} pre-authorized with role '${newRole}'`)
      setNewEmail('')
      setNewName('')
      setNewOrg('')
      setShowAddModal(false)
      await refreshUsers()
    } catch (err) {
      showNotification(err.message || 'Failed to pre-authorize user', 'error')
    }
  }

  // Filter and search
  const filteredUsers = users.filter((u) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'pending' && !u.verified && u.email !== MASTER_GOV_EMAIL) ||
      (filter === 'verified' && u.verified) ||
      (filter === 'employer' && u.role === 'employer') ||
      (filter === 'client' && u.role === 'client') ||
      (filter === 'government' && u.role === 'government')

    const q = search.toLowerCase()
    const matchesSearch =
      !search ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.organization || '').toLowerCase().includes(q)

    return matchesFilter && matchesSearch
  })

  const stats = {
    total: users.length,
    pending: users.filter((u) => !u.verified && u.email !== MASTER_GOV_EMAIL).length,
    verified: users.filter((u) => u.verified).length,
    employers: users.filter((u) => u.role === 'employer').length,
    trainees: users.filter((u) => u.role === 'client').length,
    officers: users.filter((u) => u.role === 'government').length
  }

  return (
    <div className="layout">
      <GovTopbar />
      <GovNav active="master" />

      <main className="content" style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
        {/* Sovereign Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%)',
            color: '#fff',
            borderRadius: 14,
            padding: '28px 32px',
            marginBottom: 24,
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: '1.8rem' }}>👑</span>
              <span
                style={{
                  background: 'rgba(234, 179, 8, 0.2)',
                  color: '#facc15',
                  padding: '3px 12px',
                  borderRadius: 999,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  border: '1px solid rgba(234, 179, 8, 0.3)'
                }}
              >
                MASTER GOV AUTHORITY PORTAL
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>&bull; MSDE Sovereign Administration</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              National SkillTrace User Access Controller
            </h1>
            <p style={{ margin: '8px 0 0', color: '#cbd5e1', fontSize: '0.92rem', maxWidth: 780 }}>
              Master Authority: <strong style={{ color: '#60a5fa' }}>{MASTER_GOV_EMAIL}</strong>. Only verified users can access the Trainee or Employer portals. All public Google logins default to unverified quarantine until approved here.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn--outline"
              style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
              onClick={refreshUsers}
            >
              &#8635; Refresh Roster
            </button>
            <button
              type="button"
              className="btn btn--primary"
              style={{ background: '#2563eb', border: 'none', fontWeight: 700 }}
              onClick={() => setShowAddModal(true)}
            >
              + Pre-Authorize User
            </button>
          </div>
        </div>

        {/* Notifications */}
        {message && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 8,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: message.type === 'error' ? '#fee2e2' : '#dcfce7',
              color: message.type === 'error' ? '#991b1b' : '#166534',
              border: `1px solid ${message.type === 'error' ? '#fca5a5' : '#86efac'}`
            }}
          >
            <span>{message.type === 'error' ? '⚠️ ' : '✅ '} {message.text}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'inherit' }}
            >
              &times;
            </button>
          </div>
        )}

        {/* KPI Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Users</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{stats.total}</div>
          </div>
          <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b', background: stats.pending > 0 ? '#fffbeb' : '#fff' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
              Pending Approval {stats.pending > 0 && `(${stats.pending})`}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', marginTop: 4 }}>{stats.pending}</div>
          </div>
          <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Verified & Active</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#065f46', marginTop: 4 }}>{stats.verified}</div>
          </div>
          <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>Employers</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4c1d95', marginTop: 4 }}>{stats.employers}</div>
          </div>
          <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #06b6d4' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0e7490', textTransform: 'uppercase' }}>Trainees</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#155e75', marginTop: 4 }}>{stats.trainees}</div>
          </div>
          <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #64748b' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Gov Officers</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginTop: 4 }}>{stats.officers}</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All Users (${stats.total})` },
                { id: 'pending', label: `⏳ Pending (${stats.pending})` },
                { id: 'verified', label: `✓ Verified (${stats.verified})` },
                { id: 'employer', label: `🏢 Employers (${stats.employers})` },
                { id: 'client', label: `🎓 Trainees (${stats.trainees})` },
                { id: 'government', label: `🏛️ Gov Officers (${stats.officers})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: filter === tab.id ? '#2563eb' : '#e2e8f0',
                    background: filter === tab.id ? '#2563eb' : '#fff',
                    color: filter === tab.id ? '#fff' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ minWidth: 260 }}>
              <input
                type="text"
                placeholder="Search email, name, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem'
                }}
              />
            </div>
          </div>
        </div>

        {/* Users Roster Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Access Control & Authorization Directory ({filteredUsers.length})
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Changes are immediately applied to active sessions.
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              Loading user credentials and authority records...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              No users matching the selected filter or search query.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 18px' }}>User Details</th>
                    <th style={{ padding: '12px 14px' }}>Assigned Role</th>
                    <th style={{ padding: '12px 14px' }}>Verification Status</th>
                    <th style={{ padding: '12px 14px' }}>Organization</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const isMaster = u.email === MASTER_GOV_EMAIL
                    const isPending = !u.verified && !isMaster

                    return (
                      <tr
                        key={u.id || u.email}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isPending ? '#fffdf5' : isMaster ? '#f0fdf4' : 'transparent',
                          transition: 'background 0.15s'
                        }}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: isMaster ? '#2563eb' : isPending ? '#f59e0b' : '#64748b',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.9rem'
                              }}
                            >
                              {isMaster ? '👑' : (u.name || u.email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{u.name || 'Anonymous User'}</span>
                                {isMaster && (
                                  <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
                                    MASTER SOVEREIGN
                                  </span>
                                )}
                              </div>
                              <div style={{ color: '#64748b', fontSize: '0.82rem' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 14px' }}>
                          {isMaster ? (
                            <span style={{ fontWeight: 700, color: '#1e3a8a' }}>
                              🏛️ Sovereign Government
                            </span>
                          ) : (
                            <select
                              value={u.role || 'unassigned'}
                              disabled={actionLoading === (u.id || u.email)}
                              onChange={(e) => handleRoleChange(u.id || u.email, e.target.value, u.verified, u.email)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                fontSize: '0.84rem',
                                fontWeight: 600,
                                background: '#fff',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="unassigned">⛔ Unassigned (No Access)</option>
                              <option value="employer">🏢 Employer (Corporate)</option>
                              <option value="client">🎓 Trainee / Candidate</option>
                              <option value="government">🏛️ Government Officer</option>
                            </select>
                          )}
                        </td>

                        <td style={{ padding: '14px 14px' }}>
                          {isMaster ? (
                            <span style={{ color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span>✓</span> Sovereign Verified
                            </span>
                          ) : u.verified ? (
                            <span
                              style={{
                                background: '#dcfce7',
                                color: '#166534',
                                padding: '3px 10px',
                                borderRadius: 999,
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <span>✓</span> Verified Active
                            </span>
                          ) : (
                            <span
                              style={{
                                background: '#fef3c7',
                                color: '#92400e',
                                padding: '3px 10px',
                                borderRadius: 999,
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <span>⏳</span> Pending Master Approval
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '14px 14px', color: '#475569' }}>
                          {u.organization || (u.verified ? (u.role === 'client' ? 'National Skill Registry (MSDE)' : u.company_name || u.designation) : (u.designation || 'Pending Master Verification'))}
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          {isMaster ? (
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              Protected Root Admin
                            </span>
                          ) : (
                            <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                              {!u.verified ? (
                                <button
                                  type="button"
                                  className="btn btn--sm"
                                  disabled={actionLoading === (u.id || u.email)}
                                  style={{ background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, padding: '5px 12px', cursor: 'pointer' }}
                                  onClick={() => handleRoleChange(u.id || u.email, (!u.role || u.role === 'unassigned') ? 'client' : u.role, true, u.email)}
                                >
                                  ✓ Approve & Activate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn--outline btn--sm"
                                  disabled={actionLoading === (u.id || u.email)}
                                  style={{ color: '#b45309', borderColor: '#fde68a', padding: '5px 10px' }}
                                  onClick={() => handleToggleVerification(u)}
                                >
                                  Revoke Access
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn btn--danger btn--sm"
                                disabled={actionLoading === (u.id || u.email)}
                                style={{ padding: '5px 10px' }}
                                onClick={() => handleDelete(u.id || u.email, u.email)}
                              >
                                Remove
                              </button>
                            </div>
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

        {/* Pre-Authorization Modal */}
        {showAddModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 20
            }}
          >
            <div
              className="card"
              style={{
                maxWidth: 480,
                width: '100%',
                padding: '24px 28px',
                borderRadius: 12,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Pre-Authorize User Access
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}
                >
                  &times;
                </button>
              </div>

              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 18px' }}>
                Pre-authorized accounts will immediately have verified access when signing in with their Google account.
              </p>

              <form onSubmit={handleWhitelistSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Google Account Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@gmail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Full Name / Designation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vikram Sharma"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Authorized Portal Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600, background: '#fff' }}
                  >
                    <option value="employer">🏢 Employer (Corporate Verification Portal)</option>
                    <option value="client">🎓 Trainee / Candidate (Self-Records Portal)</option>
                    <option value="government">🏛️ Government Officer (MSDE Portal)</option>
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Organization / Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tata Advanced Systems / Infosys"
                    value={newOrg}
                    onChange={(e) => setNewOrg(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    style={{ background: '#2563eb', border: 'none', fontWeight: 700 }}
                  >
                    Grant & Pre-Authorize
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
