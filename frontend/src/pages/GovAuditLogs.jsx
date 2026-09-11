import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { useGov } from '../gov/GovContext.jsx'
import { longDate } from '../lib/format.js'

/**
 * What the backend has written to Supabase, newest first.
 *
 * This is the synchronisation record rather than the outcome ledger: it shows
 * that a row left this service and arrived somewhere durable, which is the
 * claim an auditor would otherwise have to take on trust.
 */
const FILTERS = [
  { key: 'all', labelKey: 'alAll' },
  { key: 'checkins', labelKey: 'alCheckins' },
  { key: 'whatsapp_sessions', labelKey: 'alWhatsapp' },
  { key: 'events', labelKey: 'alEvents' },
]

const REFRESH_MS = 10000

export default function GovAuditLogs() {
  const { t } = useGov()
  const { listAuditLogs } = useAuth()

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    const res = await listAuditLogs()
    if (!res.ok) {
      setError(res.status === 401 || res.status === 403 ? 'forbidden' : 'unavailable')
      setLogs([])
    } else {
      setError(null)
      setLogs(Array.isArray(res.data) ? res.data : [])
    }
    setLoading(false)
  }, [listAuditLogs])

  useEffect(() => {
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  const rows = logs.filter((l) => filter === 'all' || l.table === filter)

  return (
    <div className="page">
      <div className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">{t('alTitle')}</h2>
            <p className="panel__sub">{t('alSubtitle')}</p>
          </div>
          <button type="button" className="btn btn--sm" onClick={load}>
            {t('alRefresh')}
          </button>
        </div>

        <div className="filters" role="group" aria-label={t('alFilterLabel')}>
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

        {loading ? (
          <div className="skeleton" style={{ height: 220 }} />
        ) : error ? (
          <div className="empty">
            <p>{t(error === 'forbidden' ? 'alForbidden' : 'alUnavailable')}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty">
            <p>{t('alEmpty')}</p>
          </div>
        ) : (
          <div className="tblwrap">
            <table className="tbl">
              <caption className="sr-only">{t('alTitle')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('alWhen')}</th>
                  <th scope="col">{t('alTable')}</th>
                  <th scope="col">{t('alRecord')}</th>
                  <th scope="col">{t('alAction')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l, i) => (
                  <tr key={l.id ?? `${l.table}-${i}`}>
                    <td className="num">{l.created_at ? longDate(String(l.created_at).slice(0, 10)) : '—'}</td>
                    <td>{l.table ?? '—'}</td>
                    <td className="mono">{l.record_id ?? l.id ?? '—'}</td>
                    <td>{l.action ?? t('alSynced')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="note">{t('alAutoRefresh')}</p>
      </div>
    </div>
  )
}
