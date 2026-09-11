/**
 * SkillTrace API client.
 *
 * Every call hits the real backend first. If the backend is unreachable, slow
 * or returns an error, the call silently falls back to the local mock store so
 * the demo never dead-ends. The current mode is exposed so the UI can show a
 * "LIVE API" / "MOCK DATA" badge — the operator always knows which they are
 * looking at.
 */
import * as mock from './mock/handlers.js'

// 127.0.0.1, not localhost. On macOS `localhost` resolves to ::1 before
// 127.0.0.1, and the backend listens on IPv4; Chromium quietly retries over
// IPv4, Safari and Firefox do not, and the page then renders the offline
// store under a "Mock data" badge with a live backend sitting right there.
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'
const FORCE_MOCK = import.meta.env.VITE_FORCE_MOCK === '1'
// Long enough for the whole-cohort analytics (about 2 s cold on a laptop),
// short enough that an absent backend still falls back before the page
// feels stuck. 2.5 s was chosen when the backend was assumed to be missing.
const TIMEOUT_MS = 8000

/* ---- mode tracking -------------------------------------------------- */

let mode = FORCE_MOCK ? 'mock' : 'unknown'
let lastError = null
const modeListeners = new Set()

export function getMode() {
  return { mode, lastError, base: API_BASE, forced: FORCE_MOCK }
}

export function onModeChange(fn) {
  modeListeners.add(fn)
  return () => modeListeners.delete(fn)
}

function setMode(next, error = null) {
  if (mode === next && lastError === error) return
  mode = next
  lastError = error
  modeListeners.forEach((fn) => fn(getMode()))
}

/* ---- transport ------------------------------------------------------ */

function qs(params = {}) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, v)
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

async function live(path, { method = 'GET', body } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    // The bearer token is read per request rather than captured once, so a
    // sign-in or sign-out takes effect on the very next call.
    const headers = {}
    if (body) headers['Content-Type'] = 'application/json'
    let token = null
    try {
      token = localStorage.getItem('skilltrace.auth.token')
    } catch {
      token = null
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const text = await res.text()
    return text ? JSON.parse(text) : {}
  } finally {
    clearTimeout(timer)
  }
}

/** A short delay so loading states are visible rather than flickering. */
const settle = (value) => new Promise((r) => setTimeout(() => r(value), 90))

/**
 * @param path    real endpoint to try
 * @param opts    fetch options
 * @param fallback  () => value  computed locally when the backend is unavailable
 */
async function request(path, opts, fallback) {
  if (FORCE_MOCK) return settle(fallback())
  try {
    const data = await live(path, opts)
    setMode('live')
    return data
  } catch (err) {
    setMode('mock', err.name === 'AbortError' ? 'backend timed out' : err.message)
    return settle(fallback())
  }
}

/* ---- endpoints ------------------------------------------------------ */

export const api = {
  /* dashboard */
  getDashboard: (f = {}) =>
    request(
      `/dashboard${qs({
        cohort: f.cohort,
        course: f.course,
        provider: f.provider,
        district: f.district,
        demographic: f.demographic,
      })}`,
      {},
      () => mock.getDashboard(f),
    ),

  getProviders: (f = {}) => request(`/providers${qs(f)}`, {}, () => mock.getProviders(f)),

  getProvider: (id, f = {}) =>
    request(`/providers/${id}${qs(f)}`, {}, () => mock.getProvider(id, f)),

  getSkillGap: (f = {}) => request(`/skill-gap${qs(f)}`, {}, () => mock.getSkillGap(f)),

  getAttention: (f = {}) => request(`/attention${qs(f)}`, {}, () => mock.getAttention(f)),

  getAuditLog: (f = {}) => request(`/audit${qs(f)}`, {}, () => mock.getAuditLog(f)),

  /* disputes */
  getDisputes: () => request('/disputes', {}, () => mock.getDisputes()),

  resolveDispute: (id, body) =>
    request(`/disputes/${id}/resolve`, { method: 'POST', body }, () => mock.resolveDispute(id, body)),

  getFieldOfficers: () => request('/field-officers', {}, () => mock.getFieldOfficers()),

  assignFieldOfficer: (id, body) =>
    request(`/disputes/${id}/assign-officer`, { method: 'POST', body }, () =>
      mock.assignFieldOfficer(id, body),
    ),

  /* post-training review */
  getReview: (traineeId) =>
    request(`/reviews/${traineeId}`, {}, () => mock.getReview(traineeId)),

  submitReview: (body) =>
    request('/reviews', { method: 'POST', body }, () => mock.submitReview(body)),

  getReviewInsights: (f = {}) =>
    request(`/reviews/insights${qs(f)}`, {}, () => mock.getReviewInsights(f)),

  /* consent */
  listConsents: () => request('/consent', {}, () => mock.listConsents()),

  getConsent: (id) => request(`/consent/${id}`, {}, () => mock.getConsent(id)),

  grantConsent: (body) => request('/consent', { method: 'POST', body }, () => mock.grantConsent(body)),

  withdrawConsent: (id) =>
    request(`/consent/${id}`, { method: 'DELETE' }, () => mock.withdrawConsent(id)),

  /* check-in */
  postCheckin: (body) => request('/checkin', { method: 'POST', body }, () => mock.postCheckin(body)),

  /* trainee requests */
  submitRequest: (body) => request('/requests', { method: 'POST', body }, () => mock.submitRequest(body)),

  /* skill record PDF download */
  downloadSkillRecord: async (traineeId) => {
    try {
      const headers = {}
      let token = null
      try {
        token = localStorage.getItem('skilltrace.auth.token')
      } catch {
        token = null
      }
      if (token) headers.Authorization = `Bearer ${token}`

      const res = await fetch(`${API_BASE}/trainees/${traineeId}/skill-record`, {
        headers,
      })
      if (res.status === 404) {
        return { ok: false, notFound: true, message: 'Skill record is not available yet.' }
      }
      if (!res.ok) {
        return { ok: false, message: 'Unable to generate your skill record. Please try again.' }
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SkillRecord-${traineeId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      return { ok: true }
    } catch (err) {
      console.error('Error downloading skill record:', err)
      return { ok: false, message: 'Unable to generate your skill record. Please try again.' }
    }
  },

  getFollowupQueue: (params) => {
    const q = new URLSearchParams()
    if (params?.district) q.set('district', params.district)
    const qs = q.toString() ? `?${q.toString()}` : ''
    return request(`/followup-queue${qs}`, {}, () => mock.getFollowupQueue(params))
  },

  // Employer confirmation. There is no mock fallback: an employer's own
  // roster and the milestone they confirm are backend records, and inventing
  // either locally would put unverified claims behind a Verified badge.
  getEmployerTrainees: () => request('/employer/trainees', {}, () => []),

  verifyMilestone: (payload) =>
    request('/employer/verify-milestone', { method: 'POST', body: payload }, () => ({
      ok: false,
      offline: true,
    })),

  assignFollowup: (traineeId, officer) =>
    request(
      `/followup-queue/${traineeId}/assign`,
      { method: 'POST', body: { officer } },
      () => mock.assignFollowup(traineeId, officer),
    ),

  /* trainees (used by the consent picker and check-in simulator) */
  getTrainees: (f = {}) => request(`/trainees${qs(f)}`, {}, () => mock.getTrainees(f)),
  getTrainee: (id) => request(`/trainees/${id}`, {}, () => mock.getTrainee(id)),
}

export { mock }
