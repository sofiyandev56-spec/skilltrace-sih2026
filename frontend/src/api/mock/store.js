/**
 * Mutable overlay on top of the deterministic dataset.
 *
 * The base dataset is regenerated from a fixed seed on every load; only the
 * things a user *does* during the demo (withdraw consent, resolve a dispute,
 * answer a check-in, assign a field officer) are persisted. They live in
 * localStorage so that:
 *   - a withdrawal survives a page refresh, and
 *   - a dashboard open in ANOTHER TAB sees the change via the `storage` event.
 */
import { buildDataset, groupEventsByTrainee } from './dataset.js'

const KEY = 'skilltrace.overlay.v1'

const emptyOverlay = () => ({
  withdrawn: {},      // trainee_id -> ISO date
  disputes: {},       // dispute_id -> { status, resolved_at, resolution, note }
  extraEvents: [],    // events created by check-ins / employer confirmations
  assignments: {},    // trainee_id -> { officer, assigned_at }
  seq: 0,
})

let overlay = emptyOverlay()
let base = null
const listeners = new Set()

function readOverlay() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyOverlay()
    return { ...emptyOverlay(), ...JSON.parse(raw) }
  } catch {
    return emptyOverlay()
  }
}

function writeOverlay() {
  try {
    localStorage.setItem(KEY, JSON.stringify(overlay))
  } catch {
    /* private mode / quota — the demo still works in-memory */
  }
}

export function initStore() {
  if (base) return
  base = buildDataset()
  overlay = readOverlay()

  if (typeof window !== 'undefined') {
    // Another tab changed something — pull it in and tell every listener.
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY) return
      overlay = readOverlay()
      listeners.forEach((fn) => {
        try {
          fn({ external: true })
        } catch {
          /* a listener blowing up must not take the others down */
        }
      })
    })
  }
}

/** Subscribe to store changes. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify(detail = {}) {
  writeOverlay()
  listeners.forEach((fn) => {
    try {
      fn({ external: false, ...detail })
    } catch {
      /* ignore */
    }
  })
}

/**
 * The dataset as it stands right now: base data, minus anything belonging to a
 * trainee who has withdrawn consent, plus events created during the session.
 */
export function currentData() {
  initStore()
  const withdrawn = overlay.withdrawn

  const trainees = base.trainees.filter((t) => !withdrawn[t.id])
  const events = [...base.events, ...overlay.extraEvents]
    .filter((e) => !withdrawn[e.trainee_id])
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  const disputes = base.disputes
    .filter((d) => !withdrawn[d.trainee_id])
    .map((d) => ({ ...d, ...(overlay.disputes[d.id] || {}) }))

  const consents = base.consents.map((c) =>
    withdrawn[c.trainee_id]
      ? { ...c, status: 'withdrawn', withdrawn_date: withdrawn[c.trainee_id] }
      : c,
  )

  // Anyone who has since answered a check-in is no longer unresponsive.
  const responded = new Set(overlay.extraEvents.map((e) => e.trainee_id))
  const followupQueue = base.followupQueue
    .filter((f) => !withdrawn[f.trainee_id] && !responded.has(f.trainee_id))
    .map((f) => ({ ...f, ...(overlay.assignments[f.trainee_id] || {}) }))

  return {
    trainees,
    events,
    disputes,
    consents,
    followupQueue,
    eventsByTrainee: groupEventsByTrainee(events),
    consentTotals: {
      total: base.trainees.length,
      withdrawn: Object.keys(withdrawn).length,
      included: trainees.length,
    },
  }
}

/** Base dataset including withdrawn trainees — only the consent screen needs this. */
export function rawData() {
  initStore()
  return base
}

export function isWithdrawn(traineeId) {
  initStore()
  return Boolean(overlay.withdrawn[traineeId])
}

export function withdrawConsent(traineeId, date) {
  initStore()
  overlay.withdrawn[traineeId] = date
  notify({ reason: 'consent_withdrawn', traineeId })
}

export function grantConsent(traineeId) {
  initStore()
  delete overlay.withdrawn[traineeId]
  notify({ reason: 'consent_granted', traineeId })
}

export function resolveDispute(disputeId, patch) {
  initStore()
  overlay.disputes[disputeId] = { ...(overlay.disputes[disputeId] || {}), ...patch }
  notify({ reason: 'dispute_resolved', disputeId })
}

export function addEvent(event) {
  initStore()
  overlay.seq += 1
  const full = { id: `EVT-LIVE-${String(overlay.seq).padStart(4, '0')}`, ...event }
  overlay.extraEvents.push(full)
  notify({ reason: 'event_added', event: full })
  return full
}

export function assignOfficer(traineeId, officer) {
  initStore()
  overlay.assignments[traineeId] = { assigned_to: officer, assigned_at: new Date().toISOString().slice(0, 10) }
  notify({ reason: 'officer_assigned', traineeId })
}

/** Wipe every session change and go back to the seeded dataset. */
export function resetStore() {
  initStore()
  overlay = emptyOverlay()
  notify({ reason: 'reset' })
}
