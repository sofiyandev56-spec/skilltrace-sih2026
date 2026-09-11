import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as backendAuth from './backendAuth.js'

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
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export function AuthProvider({ children }) {
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [restoring, setRestoring] = useState(true)

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

  const role = session?.role ?? null
  const isMinistry = role === 'government'
  const isClient = role === 'client'
  const isEmployer = role === 'employer'

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
   * Ministry sign-in. The server authenticates; this only refuses to seat a
   * session that did not come back as a government role, so a valid trainee
   * credential entered on the officer form cannot open the console.
   */
  const loginMinistry = async (identifier, password) => {
    const res = await backendAuth.login(identifier, password)
    if (!res.ok) return res
    if (res.session?.role !== 'government') {
      // Nothing was stored, so whoever was already signed in stays signed in.
      return { ok: false, reason: 'invalid' }
    }
    adopt(res.session, res.token, { navigateHome: false })
    return { ok: true, officer: res.session }
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

  const loadGoogle = () =>
    new Promise((resolve) => {
      if (window.google?.accounts?.oauth2) return resolve(window.google)
      let tries = 0
      const tick = setInterval(() => {
        tries += 1
        if (window.google?.accounts?.oauth2) {
          clearInterval(tick)
          resolve(window.google)
        } else if (tries > 40) {
          clearInterval(tick)
          resolve(null)
        }
      }, 100)
    })

  /**
   * Google sign-in. The role is decided by the backend from its own
   * whitelist — `preferredRole` is a hint the server may ignore, so signing
   * in with Google can never by itself produce an officer session.
   */
  const loginGoogle = async (preferredRole = 'client') => {
    setModalState((prev) => ({ ...prev, loading: true, error: '' }))

    if (!GOOGLE_CLIENT_ID) {
      setModalState((prev) => ({ ...prev, loading: false, error: 'google_unconfigured' }))
      return { ok: false, reason: 'unconfigured' }
    }

    const google = await loadGoogle()
    if (!google) {
      setModalState((prev) => ({ ...prev, loading: false, error: 'google_unavailable' }))
      return { ok: false, reason: 'unavailable' }
    }

    return new Promise((resolve) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: async (response) => {
          if (!response?.access_token) {
            setModalState((prev) => ({ ...prev, loading: false, error: 'google_cancelled' }))
            resolve({ ok: false, reason: 'cancelled' })
            return
          }
          try {
            const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` },
            })
            const profile = await profileRes.json()
            const out = await backendAuth.loginGoogle({
              email: profile.email,
              name: profile.name,
              preferredRole,
            })
            if (!out.ok) {
              setModalState((prev) => ({ ...prev, loading: false, error: 'google_rejected' }))
              resolve(out)
              return
            }
            adopt(out.session, out.token)
            resolve(out)
          } catch {
            setModalState((prev) => ({ ...prev, loading: false, error: 'google_unavailable' }))
            resolve({ ok: false, reason: 'unavailable' })
          }
        },
      })
      client.requestAccessToken()
    })
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
    const res = await backendAuth.loginGoogle({
      email: profileData.email || `${modalState.phone}@skilltrace.local`,
      name: profileData.name?.trim(),
      preferredRole: 'client',
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
  const logoutMinistry = () => endSession('/ministry/login')

  return (
    <AuthContext.Provider
      value={{
        // Three views onto one session — never three sessions.
        user: isClient ? session : null,
        officer: isMinistry ? session : null,
        employer: isEmployer ? session : null,
        session,
        restoring,
        isAuthenticated: isClient,
        isMinistry,
        isEmployer,
        role: isMinistry ? 'ministry' : role,
        googleConfigured: Boolean(GOOGLE_CLIENT_ID),
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
