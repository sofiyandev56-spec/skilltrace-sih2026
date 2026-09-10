import { MINISTRY_OFFICERS } from '../api/mock/data/ministryOfficers.js'

/**
 * Ministry authentication, kept behind one narrow surface.
 *
 * Every credential check in the application goes through `authenticate()`.
 * Components never see the officer list, never compare a password themselves,
 * and never decide on their own that someone is an officer — so replacing this
 * with a real endpoint later means rewriting this file and nothing else.
 */

const SESSION_KEY = 'skilltrace.ministry.session'

/**
 * Verify an Officer ID and password pair.
 *
 * The failure message is deliberately identical whether the ID is unknown or
 * the password is wrong. Saying which half failed would let anyone enumerate
 * valid officer IDs, and the ID format here is guessable by design.
 */
export function authenticate(officerId, password) {
  const id = String(officerId || '').trim().toUpperCase()
  const pw = String(password || '')

  if (!id || !pw) {
    return { ok: false, reason: 'missing' }
  }

  const officer = MINISTRY_OFFICERS.find((o) => o.officer_id.toUpperCase() === id)
  if (!officer || officer.password !== pw) {
    return { ok: false, reason: 'invalid' }
  }

  return { ok: true, officer: toSession(officer) }
}

/** The officer record as the rest of the app is allowed to see it — no password. */
function toSession(officer) {
  return {
    officer_id: officer.officer_id,
    name: officer.name,
    phone_no: officer.phone_no,
    designation: officer.designation,
    cadre: officer.cadre,
    division: officer.division,
    district: officer.district,
    email: officer.email,
    scope: officer.scope,
    role: 'ministry',
    issued_at: new Date().toISOString(),
  }
}

export function saveSession(officer) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(officer))
  } catch {
    /* private browsing — the session simply will not survive a reload */
  }
}

export function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Never trust a stored blob to describe its own privileges: re-check the
    // id against the authorised list before honouring it.
    const stillAuthorised = MINISTRY_OFFICERS.some((o) => o.officer_id === parsed?.officer_id)
    return stillAuthorised ? parsed : null
  } catch {
    return null
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* nothing to clear */
  }
}

/**
 * Ministry sessions live in sessionStorage, not localStorage, so closing the
 * tab ends the session. A governance console left open on a shared machine
 * should not still be signed in tomorrow.
 */
export const MINISTRY_SESSION_KEY = SESSION_KEY
