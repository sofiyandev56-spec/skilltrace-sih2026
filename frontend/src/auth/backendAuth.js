/**
 * Authentication against the SkillTrace backend.
 *
 * All credential decisions belong to the server. This module holds the bearer
 * token and shapes responses; it never decides who anyone is, and in
 * particular it never lets the client choose its own role — the role travels
 * in the signed token and is re-read from /auth/me on every restore.
 */
import { API_BASE } from '../api/client.js'

const TOKEN_KEY = 'skilltrace.auth.token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable — the session simply will not survive a reload */
  }
}

export function clearToken() {
  setToken(null)
}

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    return { ok: false, status: res.status, detail: data?.detail ?? null }
  }
  return { ok: true, data }
}

/** Normalises the server's user object into the shape the UI already uses. */
function toSession(payload) {
  const u = payload?.user ?? payload
  if (!u) return null
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    // 'government' | 'client' | 'employer', as issued by the server.
    role: u.role,
    designation: u.designation,
    ministry: u.ministry,
    company_name: u.company_name,
    district: u.district ?? null,
    verified: u.verified,
    is_master: u.is_master ?? false,
    permissions: u.permissions ?? null,
  }
}

/** Email/Officer-ID + password. */
export async function login(identifier, password) {
  const id = String(identifier || '').trim()
  const pw = String(password || '')
  if (!id || !pw) return { ok: false, reason: 'missing' }

  const res = await post('/auth/login', { identifier: id, password: pw })
  if (!res.ok) {
    // 401 and 404 are both "those credentials did not work"; saying which
    // would let the form be used to discover which accounts exist.
    return { ok: false, reason: res.status === 0 ? 'offline' : 'invalid' }
  }
  // Deliberately not persisted here. A caller may still reject this session —
  // the officer form refuses a valid trainee — and storing the token first
  // would have destroyed whatever session was already signed in.
  return { ok: true, token: res.data.access_token, session: toSession(res.data) }
}

/**
 * Google sign-in. `preferredRole` is a hint only — the server decides the
 * role from its own whitelist, and the token it returns is authoritative.
 */
export async function loginGoogle({ credential, email, name, preferredRole }) {
  const res = await post('/auth/google', {
    credential: credential ?? null,
    email: email ?? null,
    name: name ?? null,
    role: preferredRole ?? null,
  })
  if (!res.ok) return { ok: false, reason: 'invalid', detail: res.detail }
  return { ok: true, token: res.data.access_token, session: toSession(res.data) }
}

/** Creates an account from the phone sign-up flow. */
export async function register(profile) {
  const res = await post('/auth/register', profile)
  if (!res.ok) return { ok: false, detail: res.detail }
  return { ok: true, token: res.data.access_token, session: toSession(res.data) }
}

/** Re-reads the signed-in user, so a restored token cannot carry a stale role. */
export async function me(token = getToken()) {
  if (!token) return null
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return toSession(await res.json())
  } catch {
    return null
  }
}

/* ---- WhatsApp OTP, used by the trainee sign-in ---------------------- */

export async function requestOtp(phone, extra = {}) {
  const res = await post('/api/whatsapp/send-otp', { phone, ...extra })
  return res.ok ? { ok: true, data: res.data } : { ok: false, detail: res.detail }
}

export async function verifyOtp(phone, otp, traineeId = null) {
  const res = await post('/api/whatsapp/verify-otp', {
    phone,
    otp,
    trainee_id: traineeId,
  })
  if (!res.ok) return { ok: false, detail: res.detail }
  return {
    ok: true,
    data: res.data,
    token: res.data?.access_token ?? null,
    session: res.data?.user ? toSession(res.data) : null,
  }
}

/* ---- Master Portal operations --------------------------------------
 * Every call below is refused by the server without a government token;
 * the UI hides them too, but the server is what actually decides.
 */

async function authed(path, { method = 'GET', body } = {}) {
  const token = getToken()
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    let data = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    if (!res.ok) return { ok: false, status: res.status, detail: data?.detail ?? null }
    return { ok: true, data }
  } catch {
    return { ok: false, status: 0, detail: null }
  }
}

export const listUsers = () => authed('/api/admin/users')

export const assignRole = (userId, role) =>
  authed('/api/admin/users/assign-role', { method: 'POST', body: { user_id: userId, role } })

export const whitelistUser = (email, role) =>
  authed('/api/admin/users/whitelist', { method: 'POST', body: { email, role } })

export const deleteUser = (userId) =>
  authed(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })

export const listAuditLogs = () => authed('/api/admin/audit-logs')
