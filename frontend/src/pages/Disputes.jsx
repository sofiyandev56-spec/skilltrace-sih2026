import React, { useMemo, useState } from 'react'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { useToast } from '../components/Toast.jsx'
import Modal from '../components/Modal.jsx'
import { longDate, relativeAge } from '../lib/format.js'
import { useGov } from '../gov/GovContext.jsx'

/* ------------------------------------------------------------------ */
/* assignment dialog                                                   */
/* ------------------------------------------------------------------ */

function AssignOfficerModal({ dispute, officers, open, onClose, onAssign, busy }) {
  const { t } = useGov()
  const [selected, setSelected] = useState(dispute?.assigned_officer_id || '')
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return officers
    return officers.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.division.toLowerCase().includes(q) ||
        o.designation.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q),
    )
  }, [officers, query])

  if (!dispute) return null
  const reassigning = Boolean(dispute.assigned_officer_id)

  const statusLabel = (d) =>
    d.status === 'resolved' ? t('statusResolved') : d.assigned_officer_id ? t('statusUnderReview') : t('statusDisputed')

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelId="assign-officer-title"
      title={reassigning ? t('changeFieldOfficer') : t('assignFieldOfficerTitle')}
      subtitle={`${dispute.record_id} · ${dispute.trainee_name}`}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!selected || busy || selected === dispute.assigned_officer_id}
            onClick={() => onAssign(selected, note)}
          >
            {busy ? t('assigning') : reassigning ? t('confirmReassignment') : t('confirmAssignment')}
          </button>
        </>
      }
    >
      <section className="assign-case">
        <dl>
          <div>
            <dt>{t('record')}</dt>
            <dd className="mono">{dispute.record_id}</dd>
          </div>
          <div>
            <dt>{t('colTrainee')}</dt>
            <dd>
              {dispute.trainee_name} <span className="faint mono">({dispute.trainee_id})</span>
            </dd>
          </div>
          <div>
            <dt>{t('disputeType')}</dt>
            <dd>{dispute.type}</dd>
          </div>
          <div>
            <dt>{t('currentStatus')}</dt>
            <dd>{statusLabel(dispute)}</dd>
          </div>
          <div>
            <dt>{t('employer')}</dt>
            <dd>{dispute.employer}</dd>
          </div>
          <div>
            <dt>{t('raised')}</dt>
            <dd className="num">{longDate(dispute.date)}</dd>
          </div>
        </dl>
      </section>

      <p className="small muted" style={{ margin: '16px 0 10px' }}>
        {t('assignInstructions')}
      </p>

      <label className="field">
        <span className="label">{t('findAnOfficer')}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchOfficerPlaceholder')}
        />
      </label>

      <div className="officer-list" role="radiogroup" aria-label={t('findAnOfficer')}>
        {filtered.length === 0 ? (
          <p className="muted small" style={{ padding: '12px 2px' }}>
            {t('noOfficerMatch', query)}
          </p>
        ) : (
          filtered.map((o) => (
            <button
              type="button"
              key={o.id}
              role="radio"
              aria-checked={selected === o.id}
              className={`officer ${selected === o.id ? 'is-picked' : ''}`}
              onClick={() => setSelected(o.id)}
            >
              <span className="officer__mark" aria-hidden="true" />
              <span className="officer__id" aria-hidden="true">
                {o.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </span>
              <span className="officer__body">
                <span className="officer__name">
                  {o.name}
                  {o.id === dispute.assigned_officer_id ? (
                    <span className="officer__current">{t('currentlyAssigned')}</span>
                  ) : null}
                </span>
                <span className="officer__meta">
                  {o.designation} · {o.division} {t('division')} · <span className="mono">{o.id}</span>
                </span>
              </span>
              <span className={`officer__load ${o.active_cases >= 4 ? 'is-heavy' : ''}`}>
                <span className="num">{o.active_cases}</span>
                <span>{t('tabOpen')?.toLowerCase() || 'open'}</span>
              </span>
            </button>
          ))
        )}
      </div>

      <label className="field" style={{ marginTop: 14 }}>
        <span className="label">{t('instructionLabel')}</span>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('instructionPlaceholder')}
        />
      </label>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* resolution dialog                                                   */
/* ------------------------------------------------------------------ */

function ResolveModal({ dispute, open, onClose, onResolve, busy }) {
  const { t } = useGov()
  const [resolution, setResolution] = useState('')
  const [note, setNote] = useState('')
  if (!dispute) return null

  const RESOLUTIONS = [
    { key: 'employer_stands', label: t('employerStands') },
    { key: 'trainee_stands', label: t('traineeStands') },
    { key: 'field_verification', label: t('upheldField') },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelId="resolve-title"
      title={t('recordDecision')}
      subtitle={`${dispute.record_id} · ${dispute.trainee_name}`}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!resolution || busy}
            onClick={() => onResolve(resolution, note)}
          >
            {busy ? t('saving') : t('markResolved')}
          </button>
        </>
      }
    >
      <p className="small muted" style={{ marginBottom: 12 }}>
        {t('resolutionNote')}
      </p>
      <div className="stack" style={{ gap: 8 }}>
        {RESOLUTIONS.map((r) => (
          <button
            type="button"
            key={r.key}
            className={`choice ${resolution === r.key ? 'is-picked' : ''}`}
            aria-pressed={resolution === r.key}
            onClick={() => setResolution(r.key)}
          >
            <span className="choice__mark" aria-hidden="true" />
            {r.label}
          </button>
        ))}
      </div>
      <label className="field" style={{ marginTop: 14 }}>
        <span className="label">{t('reviewerNote')}</span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export default function Disputes() {
  const { t, lang } = useGov()
  const [tab, setTab] = useState('open')
  const [expanded, setExpanded] = useState(null)
  const [assignTarget, setAssignTarget] = useState(null)
  const [resolveTarget, setResolveTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const { data, loading, reload } = useApi(() => api.getDisputes(), [])
  const officersReq = useApi(() => api.getFieldOfficers(), [])

  const disputes = data || []
  const officers = officersReq.data || []
  const open = disputes.filter((d) => d.status !== 'resolved')
  const resolved = disputes.filter((d) => d.status === 'resolved')
  const shown = tab === 'open' ? open : resolved
  const unassigned = open.filter((d) => !d.assigned_officer_id).length

  const RESOLUTION_LABEL = {
    employer_stands: t('employerStands'),
    trainee_stands: t('traineeStands'),
    field_verification: t('upheldField'),
  }

  const statusLabel = (d) =>
    d.status === 'resolved' ? t('statusResolved') : d.assigned_officer_id ? t('statusUnderReview') : t('statusDisputed')

  const handleAssign = async (officerId, note) => {
    setBusy(true)
    const res = await api.assignFieldOfficer(assignTarget.id, {
      officer_id: officerId,
      note,
      assigned_by: 'Dr. S. K. Sharma, IES',
    })
    await Promise.all([reload(), officersReq.reload()])
    setBusy(false)
    setAssignTarget(null)
    const name = res?.dispute?.officer?.name || officers.find((o) => o.id === officerId)?.name
    toast.push(`${assignTarget.record_id} → ${name}`, {
      detail: t('assignInstructions'),
    })
  }

  const handleResolve = async (resolution, note) => {
    setBusy(true)
    await api.resolveDispute(resolveTarget.id, {
      resolution,
      note,
      resolved_by: 'Dr. S. K. Sharma, IES',
    })
    await reload()
    setBusy(false)
    const label = RESOLUTION_LABEL[resolution] || resolution
    setResolveTarget(null)
    toast.push(`${resolveTarget.record_id} → ${t('statusResolved')}`, { detail: label })
  }

  return (
    <div className="stack">
      <div className="note">
        <b>{t('disputeNoteIntro')}</b> {t('disputeNoteBody')}
      </div>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row">
          <button
            type="button"
            className={`btn btn--sm ${tab === 'open' ? 'btn--primary' : ''}`}
            onClick={() => setTab('open')}
          >
            {t('tabOpen')} <span className="num">({open.length})</span>
          </button>
          <button
            type="button"
            className={`btn btn--sm ${tab === 'resolved' ? 'btn--primary' : ''}`}
            onClick={() => setTab('resolved')}
          >
            {t('tabResolved')} <span className="num">({resolved.length})</span>
          </button>
        </div>
        {unassigned > 0 && tab === 'open' ? (
          <span className="small muted">
            {t('openRecords', unassigned, unassigned === 1 ? '' : (lang === 'hi' ? '' : 's'))}
          </span>
        ) : null}
      </div>

      {loading && !data ? (
        <div className="skeleton" style={{ height: 240 }} />
      ) : shown.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <h4>{tab === 'open' ? t('noOpenDisputes') : t('nothingResolvedYet')}</h4>
            <p>
              {tab === 'open'
                ? t('everyConflictReviewed')
                : t('resolvedAppearsHere')}
            </p>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel__body panel__body--flush">
            <div className="table-wrap">
              <table className="tbl tbl--disputes">
                <thead>
                  <tr>
                    <th>{t('colRecordId')}</th>
                    <th>{t('colTrainee')}</th>
                    <th>{t('colIssue')}</th>
                    <th>{t('colStatus')}</th>
                    <th>{t('colFieldOfficer')}</th>
                    <th className="right">{t('colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((d) => {
                    const isOpen = expanded === d.id
                    return [
                      <tr key={d.id} className={isOpen ? 'is-expanded' : ''}>
                        <td>
                          <button
                            type="button"
                            className="rowtoggle"
                            aria-expanded={isOpen}
                            onClick={() => setExpanded(isOpen ? null : d.id)}
                          >
                            <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
                            <span className="mono">{d.record_id}</span>
                          </button>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{d.trainee_name}</div>
                          <div className="faint small">
                            {d.district} · {relativeAge(d.date, '2026-09-10')}
                          </div>
                        </td>
                        <td>{d.type}</td>
                        <td>
                          <span className={`pill pill--${d.status === 'resolved' ? 'resolved' : d.assigned_officer_id ? 'review' : 'disputed'}`}>
                            {statusLabel(d)}
                          </span>
                        </td>
                        <td>
                          {d.officer ? (
                            <div>
                              <div style={{ fontWeight: 600 }}>{d.officer.name}</div>
                              <div className="faint small">
                                {d.officer.division} · {t('assignedAt') || 'assigned'} {longDate(d.assigned_at)}
                              </div>
                            </div>
                          ) : (
                            <span className="faint">{t('unassigned') || 'Unassigned'}</span>
                          )}
                        </td>
                        <td className="right">
                          <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              type="button"
                              className={`btn btn--sm ${d.officer ? '' : 'btn--accent'}`}
                              onClick={() => setAssignTarget(d)}
                            >
                              {d.officer ? t('changeOfficer') : t('assignFieldOfficer')}
                            </button>
                            {d.status !== 'resolved' ? (
                              <button
                                type="button"
                                className="btn btn--sm btn--primary"
                                onClick={() => setResolveTarget(d)}
                              >
                                {t('resolve')}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>,
                      isOpen ? (
                        <tr key={`${d.id}-detail`} className="detailrow">
                          <td colSpan={6}>
                            <div className="dispute__claims">
                              <div className="claim claim--employer">
                                <div className="claim__src">
                                  <span className="claim__label">{t('employerSays')}</span>
                                  <span className="faint small">{d.employer}</span>
                                </div>
                                <p className="claim__text">{d.employer_claim}</p>
                              </div>
                              <div className="claim claim--trainee">
                                <div className="claim__src">
                                  <span className="claim__label">{t('traineeSays')}</span>
                                  <span className="faint small">{d.trainee_name}</span>
                                </div>
                                <p className="claim__text">{d.trainee_claim}</p>
                              </div>
                            </div>
                            {d.assignment_note ? (
                              <p className="small muted" style={{ padding: '10px 15px 0' }}>
                                <b>{t('instructionToOfficer')}</b> {d.assignment_note}
                              </p>
                            ) : null}
                            {d.status === 'resolved' ? (
                              <p className="small muted" style={{ padding: '10px 15px 0' }}>
                                <b>{t('decision')}</b> {RESOLUTION_LABEL[d.resolution] || d.resolution} ·{' '}
                                {longDate(d.resolved_at)} · {d.resolved_by}
                                {d.note ? ` · “${d.note}”` : ''}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ) : null,
                    ]
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <AssignOfficerModal
        dispute={assignTarget}
        officers={officers}
        open={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        onAssign={handleAssign}
        busy={busy}
      />
      <ResolveModal
        dispute={resolveTarget}
        open={Boolean(resolveTarget)}
        onClose={() => setResolveTarget(null)}
        onResolve={handleResolve}
        busy={busy}
      />
    </div>
  )
}
