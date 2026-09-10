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

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const FORCE_MOCK = import.meta.env.VITE_FORCE_MOCK === '1'
const TIMEOUT_MS = 2500

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
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
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

  /* follow-up queue */
  getFollowupQueue: () => request('/followup-queue', {}, () => mock.getFollowupQueue()),

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
