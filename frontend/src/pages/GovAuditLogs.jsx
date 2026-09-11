import React, { useState, useEffect } from 'react'
import { useGov } from '../gov/GovContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import GovTopbar from '../gov/GovTopbar.jsx'
import GovNav from '../gov/GovNav.jsx'
import { api } from '../api/client.js'

export default function GovAuditLogs() {
  const { lang } = useGov()
  const { user } = useAuth()
  const hi = lang === 'hi'

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all | checkins | whatsapp_sessions | events

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${api.baseUrl}/api/admin/audit-logs`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('skilltrace_token')}`
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }
      const data = await response.json()
      setLogs(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 10000) // Auto-refresh every 10s
    return () => clearInterval(interval)
  }, [])

  const filteredLogs = logs.filter(log => filter === 'all' || log.table === filter)

  return (
    <div className="layout">
      <GovTopbar />
      <GovNav active="audit" />

      <main className="content" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#fff',
          borderRadius: 12,
          padding: '24px',
          marginBottom: 24,
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: '1.8rem' }}>🛡️</span>
              <span style={{
                background: 'rgba(34, 197, 94, 0.2)',
                color: '#4ade80',
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: '0.75rem',
                fontWeight: 800,
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>SUPABASE SECURE AUDIT TRAIL</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
              {hi ? 'डेटाबेस ऑडिट लॉग्स' : 'Database Audit Logs'}
            </h1>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
              {hi ? 'Sovereign Supabase रजिस्ट्री के साथ रीयल-टाइम डेटा सिंक्रोनाइज़ेशन।' : 'Real-time synchronization logs with the Sovereign Supabase Registry.'}
            </p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            style={{
              background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px',
              borderRadius: 6, fontWeight: 600, cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? (hi ? 'रिफ्रेश हो रहा है...' : 'Refreshing...') : (hi ? 'रिफ्रेश करें' : 'Refresh Logs')}
          </button>
        </div>

        <div className="card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 10 }}>
          {['all', 'checkins', 'whatsapp_sessions', 'events'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600,
                border: '1px solid',
                borderColor: filter === tab ? '#2563eb' : '#e2e8f0',
                background: filter === tab ? '#2563eb' : '#fff',
                color: filter === tab ? '#fff' : '#475569',
                cursor: 'pointer'
              }}
            >
              {tab === 'all' ? 'All Activity' : tab.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {error ? (
          <div style={{ color: '#b91c1c', background: '#fee2e2', padding: 16, borderRadius: 8 }}>
            Error fetching logs: {error}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '12px 16px' }}>Timestamp</th>
                  <th style={{ padding: '12px 16px' }}>Table</th>
                  <th style={{ padding: '12px 16px' }}>Actor/ID</th>
                  <th style={{ padding: '12px 16px' }}>Action</th>
                  <th style={{ padding: '12px 16px' }}>Payload Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      {loading ? 'Loading...' : 'No activity logs found.'}
                    </td>
                  </tr>
                ) : filteredLogs.map((log, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: log.table === 'checkins' ? '#dbeafe' : log.table === 'whatsapp_sessions' ? '#dcfce7' : '#f3e8ff',
                        color: log.table === 'checkins' ? '#1d4ed8' : log.table === 'whatsapp_sessions' ? '#15803d' : '#7e22ce',
                        padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700
                      }}>
                        {log.table.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                      {log.actor}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
