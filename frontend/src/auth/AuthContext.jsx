import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as backendAuth from './backendAuth.js'
import * as ministryAuth from './ministryAuth.js'
import { API_BASE } from '../api/client.js'

const AuthContext = createContext(null)

/**
 * The single authenticated session, owned by the backend.
 *
 * One sign-in, one token, one role — and the role is whatever the server
 * signed into the token, never something the browser picks. `user`,
 * `officer` and `employer` below are three views onto that one session, kept
 * because the existing screens read them by those names; they are derived,
 * not independent, so there is no way to hold two roles at once or to
 * promote yourself by writing to state.
 */
export function AuthProvider({ children }) {
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [restoring, setRestoring] = useState(true)

  // The ministry session is separate by design: different store, different
  // lifetime, different credentials. Holding one never implies the other.
  const [officer, setOfficer] = useState(() => ministryAuth.readSession())

  const [modalState, setModalState] = useState({
    isOpen: false,
    step: 'select',
    phone: '',
    pendingUser: null,
    error: '',
    loading: false,
  })

  // On boot, a stored token is re-validated against /auth/me rather than
  // trusted. A token whose account was deleted or demoted resolves to null
  // here instead of granting whatever role it was issued with.
  useEffect(() => {
    let alive = true
    const restore = async () => {
      const token = backendAuth.getToken()
      if (!token) {
        if (alive) setRestoring(false)
        return
      }
      const fresh = await backendAuth.me(token)
      if (!alive) return
      if (!fresh) backendAuth.clearToken()
      setSession(fresh)
      setRestoring(false)
    }
    restore()
    return () => {
      alive = false
    }
  }, [])

  const backendRole = session?.role ?? null
  const isMinistry = Boolean(officer)
  const isClient = backendRole === 'client'
  const isEmployer = backendRole === 'employer'
  const role = isMinistry ? 'ministry' : backendRole

  const openLogin = (step = 'select') => {
    setModalState({
      isOpen: true,
      step,
      phone: '',
      pendingUser: null,
      error: '',
      loading: false,
    })
  }

  const closeLogin = () => {
    setModalState((prev) => ({ ...prev, isOpen: false, error: '', loading: false }))
  }

  const setStep = (step, extras = {}) => {
    setModalState((prev) => ({ ...prev, step, error: '', loading: false, ...extras }))
  }

  /** Where a session belongs once it exists. */
  const homeFor = (r) =>
    r === 'government' ? '/ministry' : r === 'employer' ? '/employer' : '/client'

  const adopt = (next, token, { navigateHome = true } = {}) => {
    if (token) backendAuth.setToken(token)
    setSession(next)
    setModalState((prev) => ({ ...prev, isOpen: false, loading: false, error: '' }))
    if (navigateHome && next) navigate(homeFor(next.role), { replace: true })
  }

  /* ---- password sign-in ------------------------------------------- */

  /**
   * Ministry sign-in, checked against the ten issued Officer IDs.
   *
   * Deliberately not the backend account system: the governance console is
   * opened only by an Officer ID from ministryAuth's list, so no Google
   * account and no ordinary backend user — whatever role it carries — can
   * reach it. ministryAuth is the only module that can see the officer list.
   */
  const loginMinistry = async (officerId, password) => {
    const result = ministryAuth.authenticate(officerId, password)
    if (!result.ok) return result
    ministryAuth.saveSession(result.officer)
    setOfficer(result.officer)
    return result
  }

  /** Trainee/employer sign-in through the ordinary modal. */
  const loginPassword = async (identifier, password) => {
    const res = await backendAuth.login(identifier, password)
    if (!res.ok) {
      setModalState((prev) => ({ ...prev, loading: false, error: 'invalid' }))
      return res
    }
    adopt(res.session, res.token)
    return res
  }

  /* ---- Google ------------------------------------------------------ */

  /**
   * Google sign-in.
   *
   * Hands off to the backend, which owns the client secret and performs the
   * code exchange with Google. The browser never sees the secret, and the
   * role is whatever the server decides — signing in with Google cannot by
   * itself produce an officer session.
   */
  const loginGoogle = (preferredRole = 'client') => {
    const url = new URL(`${API_BASE}/auth/google/start`)
    if (preferredRole === 'employer') url.searchParams.set('role', preferredRole)
    window.location.assign(url.toString())
    return Promise.resolve({ ok: true, redirecting: true })
  }

  /** Seats a session from the token the OAuth callback handed back. */
  const completeGoogle = async (token) => {
    const fresh = await backendAuth.me(token)
    if (!fresh) return { ok: false }
    adopt(fresh, token)
    return { ok: true, session: fresh }
  }

  /* ---- WhatsApp OTP ------------------------------------------------ */

  const requestOtp = async (rawPhone) => {
    const clean = String(rawPhone || '').replace(/\D/g, '')
    if (clean.length !== 10 || !['6', '7', '8', '9'].includes(clean[0])) {
      setModalState((prev) => ({ ...prev, error: 'phone_invalid' }))
      return false
    }
    setModalState((prev) => ({ ...prev, loading: true, error: '' }))
    const res = await backendAuth.requestOtp(clean)
    if (!res.ok) {
      setModalState((prev) => ({ ...prev, loading: false, error: 'otp_send_failed' }))
      return false
    }
    setModalState((prev) => ({ ...prev, step: 'otp', phone: clean, loading: false }))
    return true
  }

  const verifyOtp = async (enteredOtp) => {
    setModalState((prev) => ({ ...prev, loading: true, error: '' }))
    const res = await backendAuth.verifyOtp(modalState.phone, String(enteredOtp || '').trim())
    if (!res.ok) {
      setModalState((prev) => ({ ...prev, loading: false, error: 'otp_invalid' }))
      return false
    }
    if (res.session) {
      adopt(res.session, res.token)
      return true
    }
    // Verified, but the number is not on a record yet.
    setModalState((prev) => ({
      ...prev,
      step: 'profile',
      loading: false,
      pendingUser: { phone: modalState.phone, role: 'client' },
    }))
    return true
  }

  const completeProfile = async (profileData) => {
    setModalState((prev) => ({ ...prev, loading: true, error: '' }))
    // Registration, not Google: this account is being created from a verified
    // phone number, and /auth/google is for identities Google has vouched for.
    const res = await backendAuth.register({
      name: profileData.name?.trim(),
      email: profileData.email || `${modalState.phone}@skilltrace.local`,
      password: crypto.randomUUID(),
      phone: modalState.phone,
      role: 'client',
      course: profileData.course || null,
      district: profileData.district || null,
      category: profileData.category || null,
    })
    if (!res.ok) {
      setModalState((prev) => ({ ...prev, loading: false, error: 'profile_failed' }))
      return false
    }
    adopt(res.session, res.token)
    return true
  }

  /* ---- exit -------------------------------------------------------- */

  const endSession = (to) => {
    backendAuth.clearToken()
    setSession(null)
    navigate(to, { replace: true })
  }

  const logout = () => endSession('/client')

  const logoutMinistry = () => {
    ministryAuth.clearSession()
    setOfficer(null)
    navigate('/ministry/login', { replace: true })
  }

  return (
    <AuthContext.Provider
      value={{
        // Three views onto one session — never three sessions.
        user: isClient ? session : null,
        officer,
        employer: isEmployer ? session : null,
        session,
        restoring,
        isAuthenticated: isClient,
        isMinistry,
        isEmployer,
        role,
        // Master status is read from the server's own answer, not inferred
        // from an email string in the browser.
        isMasterAdmin: Boolean(session?.is_master || session?.permissions?.is_master_admin),
        listUsers: backendAuth.listUsers,
        assignRole: backendAuth.assignRole,
        whitelistUser: backendAuth.whitelistUser,
        deleteUser: backendAuth.deleteUser,
        listAuditLogs: backendAuth.listAuditLogs,
        modalState,
        openLogin,
        closeLogin,
        setStep,
        requestOtp,
        verifyOtp,
        completeProfile,
        loginGoogle,
        completeGoogle,
        loginPassword,
        loginMinistry,
        logoutMinistry,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
