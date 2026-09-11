import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentData } from '../api/mock/store.js'
import { api } from '../api/client.js'
import {
  sbGetAdminUsers,
  sbUpsertAdminUser,
  sbDeleteAdminUser,
  sbGetUserByEmail,
} from '../lib/supabase.js'

const AuthContext = createContext(null)

const AUTH_STORAGE_KEY = 'skilltrace.session_user'
const JWT_STORAGE_KEY = 'skilltrace.jwt'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export const MASTER_GOV_EMAIL = 'shlok.borad11@gmail.com'
export const USERS_ROSTER_KEY = 'skilltrace.users_roster'

export const getLocalRoster = () => {
  try {
    const raw = localStorage.getItem(USERS_ROSTER_KEY)
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list) && list.length > 0) return list
    }
  } catch (e) {}

  const initial = [
    {
      id: 'MSDE-MASTER-01',
      name: 'Shlok Borad',
      email: MASTER_GOV_EMAIL,
      role: 'government',
      designation: 'Government Officer & GOV Administrator',
      ministry: 'Ministry of Skill Development and Entrepreneurship',
      company_name: null,
      verified: true,
      is_master: true,
      last_login: 'Active GOV Authority'
    }
  ]
  try {
    localStorage.setItem(USERS_ROSTER_KEY, JSON.stringify(initial))
  } catch (e) {}
  return initial
}

export const saveLocalRoster = (roster) => {
  try {
    localStorage.setItem(USERS_ROSTER_KEY, JSON.stringify(roster))
  } catch (e) {}
}

export const DEMO_GOV_USER = {
  id: 'GOV-MSDE-042',
  name: 'Dr. S. K. Sharma, IES',
  email: 'officer@msde.gov.in',
  role: 'government',
  designation: 'Director (Monitoring & Evaluation)',
  ministry: 'Ministry of Skill Development and Entrepreneurship',
  phone: '+91 98100 12345',
  verified: true,
  lastLogin: '2026-09-10 09:30 IST',
}

export const DEMO_CLIENT_USER = {
  id: 'TRN-0001',
  name: 'Aarti Patil',
  phone: '',
  email: 'aarti.patil@email.com',
  role: 'client',
  course: 'Healthcare Assistant',
  district: 'Nashik',
  category: 'General',
  gender: 'Female',
  age_group: '25-34',
  employer: 'Sanjeevani Hospital',
  job_role: 'Healthcare Assistant',
  monthly_salary: 14000,
  verified_status: 'employed',
  verified_milestone: '3+ months at same employer',
  trust_level: 'high',
  certification_date: '15 Jan 2025',
  placement_date: '28 Jan 2025',
  verified: true,
}

export const DEMO_EMPLOYER_USER = {
  id: 'EMP-SANJ-01',
  name: 'Dr. Rajiv Mehta',
  email: 'hr@sanjeevani.org',
  phone: '+91 98220 54321',
  role: 'employer',
  designation: 'Head of Human Resources',
  company_name: 'Sanjeevani Hospital',
  verified: true,
  lastLogin: '2026-09-10 11:00 IST',
}

export const DEMO_TATA_EMPLOYER_USER = {
  id: 'EMP-TATA-02',
  name: 'Vikramaditya Rao',
  email: 'employer@tata.com',
  phone: '+91 98330 98765',
  role: 'employer',
  designation: 'VP Talent Acquisition',
  company_name: 'Tata Advanced Systems Ltd',
  verified: true,
  lastLogin: '2026-09-10 11:45 IST',
}

export function AuthProvider({ children }) {
  const navigate = useNavigate()

  // Initialize with stored user (purges old fake email sessions)
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Purge old mock / fake demo user sessions
        const isFake =
          parsed?.email === 'officer@msde.gov.in' ||
          parsed?.email === 'officer.google@nic.in' ||
          parsed?.email === 'hr.google@sanjeevani.org' ||
          parsed?.email === 'aarti.patil.google@gmail.com' ||
          parsed?.email === 'hr@sanjeevani.org' ||
          parsed?.email === 'employer@tata.com' ||
          parsed?.email === 'aarti.patil@email.com'
        if (isFake) {
          localStorage.removeItem(AUTH_STORAGE_KEY)
          return null
        }
        if (parsed?.email?.toLowerCase() === MASTER_GOV_EMAIL) {
          parsed.is_master = true
          parsed.verified = true
          parsed.role = 'government'
        }
        return parsed
      }
      return null
    } catch {
      return null
    }
  })

  // Modal flow state
  const [modalState, setModalState] = useState({
    isOpen: false,
    activeTab: 'government', // 'government' | 'client' | 'employer'
    step: 'login', // 'login' | 'otp' | 'profile'
    phone: '',
    pendingUser: null,
    error: '',
    loading: false,
  })

  // Persist session
  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      localStorage.removeItem(JWT_STORAGE_KEY)
    }
  }, [user])

  // Automatically sync active user with latest roster authorization
  useEffect(() => {
    const syncFromRoster = () => {
      if (!user?.email) return
      const clean = user.email.toLowerCase()
      if (clean === MASTER_GOV_EMAIL) return
      const roster = getLocalRoster()
      const found = roster.find((u) => u.email?.toLowerCase() === clean)
      if (found && (Boolean(found.verified) !== Boolean(user.verified) || found.role !== user.role || (found.name && found.name !== user.name))) {
        setUser((prev) => ({
          ...prev,
          name: found.name || prev.name,
          verified: Boolean(found.verified),
          role: found.role || prev.role,
          company_name: found.company_name !== undefined ? found.company_name : prev.company_name,
          designation: found.designation || prev.designation
        }))
      }
    }

    syncFromRoster()
    window.addEventListener('storage', syncFromRoster)
    const interval = setInterval(syncFromRoster, 1000)
    return () => {
      window.removeEventListener('storage', syncFromRoster)
      clearInterval(interval)
    }
  }, [user?.email, user?.verified, user?.role])

  const openLogin = (tab = 'government') => {
    setModalState({
      isOpen: true,
      activeTab: tab === 'select' ? 'government' : tab,
      step: 'login',
      phone: '',
      pendingUser: null,
      error: '',
      loading: false,
    })
  }

  const closeLogin = () => {
    setModalState((prev) => ({ ...prev, isOpen: false, error: '', loading: false }))
  }

  const setActiveTab = (tab) => {
    setModalState((prev) => ({ ...prev, activeTab: tab, error: '', loading: false }))
  }

  const setStep = (step, extras = {}) => {
    setModalState((prev) => ({ ...prev, step, error: '', loading: false, ...extras }))
  }

  const GOOGLE_CLIENT_ID =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '998932758436-8a4l4j9klve2n874gff2cpe621t16grd.apps.googleusercontent.com'

  const decodeGoogleJwt = (token) => {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch {
      return null
    }
  }

  // Handle successful Google authentication using genuine Google account profile
  const handleGoogleSuccess = async ({ email, name, picture, credential, sub, role }) => {
    const cleanEmail = (email || '').trim().toLowerCase()
    const isMaster = cleanEmail === MASTER_GOV_EMAIL
    const roleToUse = isMaster ? 'government' : (role || modalState.activeTab || 'client')
    setModalState((prev) => ({ ...prev, loading: true, error: '' }))

    // First attempt live backend login
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          email: cleanEmail,
          name,
          role: roleToUse,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.access_token) {
          localStorage.setItem(JWT_STORAGE_KEY, data.access_token)
        }
        // Check if master admin has previously approved this user in the roster
        const roster = getLocalRoster()
        const foundIdx = roster.findIndex((u) => u.email?.toLowerCase() === cleanEmail)
        const previouslyVerified = foundIdx >= 0 ? Boolean(roster[foundIdx].verified) : false
        const finalRole = isMaster ? 'government' : (foundIdx >= 0 && roster[foundIdx].role ? roster[foundIdx].role : (data.user?.role || roleToUse))

        const userObj = {
          ...data.user,
          name: name || data.user?.name || (foundIdx >= 0 ? roster[foundIdx].name : cleanEmail.split('@')[0]),
          picture: picture || data.user?.picture || null,
          role: finalRole,
          verified: finalVerified,
          is_master: isMaster,
          trainee_id: (finalRole === 'client' ? (data.user?.id?.startsWith('TRN') ? data.user.id : `TRN-${cleanEmail.replace(/\D/g, '').slice(-4) || '2026'}`) : undefined),
        }
        setUser(userObj)
        setModalState((prev) => ({ ...prev, isOpen: false, loading: false, error: '' }))

        // Update local roster cache
        const entry = {
          id: userObj.id,
          name: userObj.name,
          email: cleanEmail,
          role: userObj.role,
          verified: userObj.verified,
          company_name: userObj.company_name,
          designation: userObj.designation,
          is_master: isMaster,
          last_login: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
        }
        if (foundIdx >= 0) roster[foundIdx] = { ...roster[foundIdx], ...entry }
        else roster.push(entry)
        saveLocalRoster(roster)

        // Route navigation based on verification:
        if (!userObj.verified && !isMaster) {
          // Unverified users stay on current page and see Access Gate
          return true
        }
        if (isMaster) navigate('/')
        else if (userObj.role === 'employer') navigate('/employer')
        else if (userObj.role === 'client') navigate('/client')
        else navigate('/')
        return true
      }
    } catch (e) {
      console.warn('Backend /auth/google error, establishing sovereign Google session:', e)
    }

    // Direct Google authenticated session with sovereign role enforcement
    const roster = getLocalRoster()
    const found = roster.find((u) => u.email?.toLowerCase() === cleanEmail)
    const isVerified = isMaster ? true : (found ? Boolean(found.verified) : false)
    const assignedRole = isMaster ? 'government' : (found?.role || roleToUse || 'client')
    const company = assignedRole === 'employer' ? (found?.company_name || 'Tata Advanced Systems Ltd') : null
    const designation = isMaster
      ? 'Government Officer & GOV Administrator'
      : isVerified
      ? (assignedRole === 'employer'
          ? `Corporate Representative (${company || 'Enterprise'})`
          : assignedRole === 'client'
          ? 'Verified Trainee (Digital Skill Passport)'
          : 'Accredited Government Officer (MSDE)')
      : 'Pending GOV Verification'

    const userObj = {
      id: found?.id || (assignedRole === 'client' ? `TRN-${cleanEmail.replace(/\D/g, '').slice(-4) || '2026'}` : `GGL-${(sub || '').slice(-6) || Math.floor(1000 + Math.random() * 9000)}`),
      name: name || found?.name || cleanEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      email: cleanEmail,
      picture: picture || null,
      role: assignedRole,
      verified: isVerified,
      is_master: isMaster,
      trainee_id: assignedRole === 'client' ? (found?.id || `TRN-${cleanEmail.replace(/\D/g, '').slice(-4) || '2026'}`) : undefined,
      designation: designation,
      company_name: company,
      ministry: isMaster ? 'Ministry of Skill Development & Entrepreneurship' : null,
      lastLogin: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
    }

    // Save to local roster so master admin sees them immediately
    const foundIdx = roster.findIndex((u) => u.email?.toLowerCase() === cleanEmail)
    const entry = {
      id: userObj.id,
      name: userObj.name,
      email: cleanEmail,
      role: userObj.role,
      verified: userObj.verified,
      company_name: userObj.company_name,
      designation: userObj.designation,
      is_master: isMaster,
      last_login: userObj.lastLogin
    }
    if (foundIdx >= 0) roster[foundIdx] = { ...roster[foundIdx], ...entry }
    else roster.push(entry)
    saveLocalRoster(roster)

    // Persist to Supabase so roster is cross-device (non-blocking)
    sbUpsertAdminUser(entry).catch(() => {})

    setUser(userObj)
    setModalState((prev) => ({ ...prev, isOpen: false, loading: false, error: '' }))

    if (!isVerified && !isMaster) {
      // Unverified user: blocked by access gate
      return true
    }
    if (isMaster) navigate('/')
    else if (assignedRole === 'employer') navigate('/employer')
    else if (assignedRole === 'client') navigate('/client')
    else navigate('/')
    return true
  }

  // Google OAuth Login via Google Identity Services
  const loginGoogle = async (preferredRole = 'government') => {
    const roleToUse = preferredRole || modalState.activeTab || 'government'
    setModalState((prev) => ({ ...prev, loading: true, error: '' }))

    // 1. Try Google Identity Services OAuth2 Token Client (opens Google account picker popup)
    if (window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          prompt: 'select_account',
          callback: async (tokenResponse) => {
            if (tokenResponse?.error) {
              setModalState((prev) => ({
                ...prev,
                loading: false,
                error: `Google sign-in was cancelled: ${tokenResponse.error_description || tokenResponse.error}`,
              }))
              return
            }
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              })
              if (!res.ok) throw new Error('Failed to retrieve user profile from Google.')
              const profile = await res.json()
              if (!profile.email) throw new Error('No email associated with this Google account.')
              await handleGoogleSuccess({
                email: profile.email,
                name: profile.name,
                picture: profile.picture,
                sub: profile.sub,
                role: roleToUse,
              })
            } catch (err) {
              setModalState((prev) => ({
                ...prev,
                loading: false,
                error: err.message || 'Error retrieving Google profile.',
              }))
            }
          },
          error_callback: (err) => {
            setModalState((prev) => ({
              ...prev,
              loading: false,
              error: err?.message || 'Google Sign-In popup closed or blocked by browser.',
            }))
          },
        })
        tokenClient.requestAccessToken({ prompt: 'select_account' })
        return
      } catch (err) {
        console.warn('OAuth2 token client init error, trying GIS ID prompt:', err)
      }
    }

    // 2. Try Google Identity Services One Tap / ID Prompt
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (response.credential) {
              const claims = decodeGoogleJwt(response.credential)
              if (claims?.email) {
                await handleGoogleSuccess({
                  email: claims.email,
                  name: claims.name,
                  picture: claims.picture,
                  sub: claims.sub,
                  credential: response.credential,
                  role: roleToUse,
                })
                return
              }
            }
            setModalState((prev) => ({
              ...prev,
              loading: false,
              error: 'Invalid Google credential received.',
            }))
          },
        })
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setModalState((prev) => ({
              ...prev,
              loading: false,
              error: 'Google Sign-In prompt unavailable. Please ensure popups are enabled for accounts.google.com.',
            }))
          }
        })
        return
      } catch (err) {
        console.warn('GIS ID prompt error:', err)
      }
    }

    // If window.google is blocked or offline
    setModalState((prev) => ({
      ...prev,
      loading: false,
      error: 'Google Identity Services could not load. Please check your internet connection or disable ad-blockers for google.com.',
    }))
  }

  // Handle GIS credential from the rendered button in AuthModal
  const loginGoogleCredential = async (credential, preferredRole) => {
    const roleToUse = preferredRole || modalState.activeTab || 'government'
    const claims = decodeGoogleJwt(credential)
    if (claims?.email) {
      return await handleGoogleSuccess({
        email: claims.email,
        name: claims.name,
        picture: claims.picture,
        sub: claims.sub,
        credential,
        role: roleToUse,
      })
    }
  }

  // Switch active role preserving the user's Google authenticated identity
  const switchDemoRole = async (targetRole) => {
    if (user) {
      const updatedUser = {
        ...user,
        role: targetRole,
        designation:
          targetRole === 'government'
            ? 'Government Officer (MSDE)'
            : targetRole === 'employer'
            ? 'Employer HR Representative'
            : 'Trainee / Learner',
      }
      setUser(updatedUser)
      if (targetRole === 'government') navigate('/')
      else if (targetRole === 'employer') navigate('/employer')
      else navigate('/client')
      return
    }
    openLogin(targetRole)
  }

  // Request OTP for phone
  const requestOtp = async (rawPhone) => {
    const clean = rawPhone.replace(/\D/g, '')
    if (clean.length < 5) {
      setModalState((prev) => ({ ...prev, error: 'Please enter a valid mobile number.' }))
      return false
    }
    setModalState((prev) => ({
      ...prev,
      loading: true,
      error: '',
    }))

    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean, trainee_name: 'Trainee', email: '', trainee_id: '' }),
      })
      if (!res.ok) {
        throw new Error('Failed to send OTP')
      }
      const data = await res.json()
      setModalState((prev) => ({
        ...prev,
        step: 'otp',
        phone: clean,
        loading: false,
      }))
      return true
    } catch (e) {
      console.warn('Live OTP failed:', e)
      setModalState((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to send OTP via WhatsApp. Please ensure backend is running.',
      }))
      return false
    }
  }

  // Verify OTP
  const verifyOtp = async (enteredOtp) => {
    setModalState((prev) => ({ ...prev, loading: true, error: '' }))

    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: modalState.phone, otp: enteredOtp }),
      })
      const data = await res.json()
      
      if (!res.ok || (data && data.success === false)) {
        throw new Error(data.message || 'Incorrect OTP.')
      }

      setUser({
        ...DEMO_CLIENT_USER,
        id: 'TRN-' + modalState.phone.slice(-4),
        phone: modalState.phone
      })
      setModalState((prev) => ({ ...prev, isOpen: false, loading: false }))
      navigate('/client')
      return true
    } catch (e) {
      console.warn('Verify OTP failed:', e)
      setModalState((prev) => ({
        ...prev,
        loading: false,
        error: e.message || 'Verification failed.',
      }))
      return false
    }
  }

  // Check live verification status for the currently authenticated user
  const checkVerificationStatus = async () => {
    if (!user?.email) return
    const cleanEmail = user.email.toLowerCase()
    if (cleanEmail === MASTER_GOV_EMAIL) return user

    // 1. Check Supabase first (cross-device truth)
    try {
      const sbUser = await sbGetUserByEmail(cleanEmail)
      if (sbUser) {
        const updated = {
          ...user,
          verified: Boolean(sbUser.verified),
          role: sbUser.role || user.role,
          company_name: sbUser.company_name || user.company_name,
          designation: sbUser.designation || user.designation,
        }
        setUser(updated)
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated))
        return updated
      }
    } catch (e) {
      console.warn('Supabase checkVerificationStatus notice:', e)
    }

    // 2. Fallback: backend auth/me
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(JWT_STORAGE_KEY) || ''}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        const updated = {
          ...user,
          verified: Boolean(data.verified),
          role: data.role,
          company_name: data.company_name,
          designation: data.designation,
        }
        setUser(updated)
        return updated
      }
    } catch (e) {
      console.warn('Live status check error:', e)
    }

    // 3. Fallback: local roster cache
    const roster = getLocalRoster()
    const found = roster.find((u) => u.email?.toLowerCase() === cleanEmail)
    if (found) {
      const updated = {
        ...user,
        verified: Boolean(found.verified),
        role: found.role,
        company_name: found.company_name,
        designation: found.designation,
      }
      setUser(updated)
      return updated
    }
    return user
  }

  // Master Portal API: Fetch all users in roster
  // Primary: Supabase → merge into localStorage cache
  const getUsersRoster = async () => {
    const localRoster = getLocalRoster()
    try {
      // 1. Try Supabase (cloud truth)
      const sbUsers = await sbGetAdminUsers()
      if (Array.isArray(sbUsers) && sbUsers.length > 0) {
        const merged = [...localRoster]
        for (const su of sbUsers) {
          const suEmail = (su.email || '').trim().toLowerCase()
          const idx = merged.findIndex(
            (u) =>
              (su.id && u.id === su.id) ||
              (suEmail && (u.email || '').trim().toLowerCase() === suEmail)
          )
          if (idx >= 0) {
            merged[idx] = {
              ...su,
              ...merged[idx],
              verified: Boolean(merged[idx].verified) || Boolean(su.verified),
              name: merged[idx].name || su.name,
              role: merged[idx].role || su.role,
            }
          } else {
            merged.push(su)
          }
        }
        saveLocalRoster(merged)
        return merged
      }
    } catch (e) {
      console.warn('Supabase getUsersRoster notice:', e)
    }
    // 2. Fallback: backend
    try {
      const res = await api.getAdminUsers()
      if (Array.isArray(res) && res.length > 0) {
        const merged = [...localRoster]
        for (const bu of res) {
          const buEmail = (bu.email || '').trim().toLowerCase()
          const idx = merged.findIndex(
            (u) =>
              (bu.id && u.id === bu.id) ||
              (buEmail && (u.email || '').trim().toLowerCase() === buEmail)
          )
          if (idx >= 0) {
            merged[idx] = { ...bu, ...merged[idx], verified: Boolean(merged[idx].verified) || Boolean(bu.verified) }
          } else {
            merged.push(bu)
          }
        }
        saveLocalRoster(merged)
        return merged
      }
    } catch (e) {
      console.warn('Backend getAdminUsers notice, serving local roster:', e)
    }
    return localRoster
  }

  // Master Portal API: Assign or update role and verification
  const assignUserRole = async (arg1, arg2, arg3, arg4, arg5) => {
    let userId, email, role, verified, companyName, designation
    if (typeof arg1 === 'object' && arg1 !== null) {
      userId = arg1.userId || arg1.user_id || arg1.id
      email = arg1.email
      role = arg1.role
      verified = arg1.verified !== undefined ? arg1.verified : true
      companyName = arg1.companyName || arg1.company_name
      designation = arg1.designation
    } else {
      userId = arg1
      role = arg2
      verified = arg3 !== undefined ? arg3 : true
      companyName = arg4
      designation = arg5
    }

    const cleanEmail = (email || (String(userId || '').includes('@') ? String(userId) : '')).trim().toLowerCase()
    const roster = getLocalRoster()
    const targetUser = roster.find(
      (u) =>
        (cleanEmail && (u.email || '').trim().toLowerCase() === cleanEmail) ||
        (userId && u.id === userId) ||
        (userId && String(userId).includes('@') && (u.email || '').trim().toLowerCase() === String(userId).trim().toLowerCase())
    )

    const targetEmail = cleanEmail || (targetUser?.email || '').trim().toLowerCase()
    const targetId = (userId && !String(userId).includes('@')) ? userId : (targetUser?.id || `GGL-${Math.floor(1000 + Math.random() * 9000)}`)
    const finalRole = (role && role !== 'unassigned') ? role : (targetUser?.role || 'client')
    const finalVerified = Boolean(verified)
    const finalName = targetUser?.name || (targetEmail ? targetEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Authorized User')

    // 1. Update local roster immediately & synchronously
    let foundInRoster = false
    const updated = roster.map((u) => {
      const uEmail = (u.email || '').trim().toLowerCase()
      const match =
        (targetId && u.id === targetId) ||
        (targetEmail && uEmail === targetEmail)
      if (match) {
        foundInRoster = true
        return {
          ...u,
          id: targetId,
          name: u.name || finalName,
          email: targetEmail || u.email,
          role: finalRole,
          verified: finalVerified,
          company_name: companyName !== undefined ? companyName : u.company_name,
          designation:
            designation ||
            (finalRole === 'employer'
              ? `Corporate Representative (${companyName || u.company_name || 'Enterprise'})`
              : finalRole === 'client'
              ? 'Verified Trainee (Digital Skill Passport)'
              : 'Accredited Government Officer (MSDE)'),
        }
      }
      return u
    })

    if (!foundInRoster && targetEmail) {
      updated.push({
        id: targetId,
        name: finalName,
        email: targetEmail,
        role: finalRole,
        verified: finalVerified,
        company_name: companyName,
        designation: finalRole === 'employer' ? 'Corporate Representative' : finalRole === 'client' ? 'Verified Trainee (Digital Skill Passport)' : 'Accredited Government Officer (MSDE)',
        last_login: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
      })
    }

    saveLocalRoster(updated)

    // Broadcast storage event across active components and tabs
    try {
      window.dispatchEvent(new Event('storage'))
    } catch (e) {}

    // 2. If currently signed-in user was updated, update active state & storage
    if (user) {
      const activeCleanEmail = (user.email || '').trim().toLowerCase()
      if (user.id === targetId || (targetEmail && activeCleanEmail === targetEmail)) {
        const updatedUser = {
          ...user,
          name: user.name || finalName,
          role: finalRole,
          verified: finalVerified,
          company_name: companyName !== undefined ? companyName : user.company_name,
          designation:
            designation ||
            (finalRole === 'employer'
              ? `Corporate Representative (${companyName || user.company_name || 'Enterprise'})`
              : finalRole === 'client'
              ? 'Verified Trainee (Digital Skill Passport)'
              : 'Accredited Government Officer (MSDE)'),
        }
        setUser(updatedUser)
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser))
      }
    }

    // 3. Sync to Supabase (primary cloud store) — non-blocking
    sbUpsertAdminUser({
      id: targetId,
      name: finalName,
      email: targetEmail,
      role: finalRole,
      verified: finalVerified,
      company_name: companyName,
      designation:
        designation ||
        (finalRole === 'employer'
          ? `Corporate Representative (${companyName || 'Enterprise'})`
          : finalRole === 'client'
          ? 'Verified Trainee (Digital Skill Passport)'
          : 'Accredited Government Officer (MSDE)'),
      last_login: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
    }).catch(() => {})

    // 4. Also sync to backend asynchronously (secondary)
    api.assignUserRole({
      user_id: targetId,
      email: targetEmail,
      role: finalRole,
      verified: finalVerified,
      company_name: companyName,
      designation,
    }).catch((e) => {
      console.warn('Backend assignUserRole async notice:', e)
    })

    return updated
  }

  // Master Portal API: Pre-authorize / Whitelist an email
  const whitelistUser = async ({ email, role = 'employer', name, company_name, verified = true }) => {
    const cleanEmail = (email || '').trim().toLowerCase()
    const newEntry = {
      id: `GGL-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name || cleanEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      email: cleanEmail,
      role,
      verified,
      company_name: company_name || (role === 'employer' ? 'Sanjeevani Hospital' : null),
      designation: `Pre-authorized ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      last_login: 'Pre-authorized',
    }

    // 1. Upsert into Supabase (primary)
    sbUpsertAdminUser(newEntry).catch(() => {})

    // 2. Sync to backend (secondary)
    api.whitelistUser({ email: cleanEmail, role, name, company_name, verified }).catch((e) => {
      console.warn('Backend whitelistUser error:', e)
    })

    // 3. Update local cache immediately
    const roster = getLocalRoster()
    const existingIdx = roster.findIndex((u) => u.email?.toLowerCase() === cleanEmail)
    if (existingIdx >= 0) {
      roster[existingIdx] = { ...roster[existingIdx], ...newEntry }
    } else {
      roster.unshift(newEntry)
    }
    saveLocalRoster(roster)
    return roster
  }

  // Master Portal API: Delete or revoke a user
  const deleteUser = async (userId) => {
    // 1. Delete from Supabase (primary)
    sbDeleteAdminUser(userId).catch(() => {})

    // 2. Delete from backend (secondary)
    api.deleteAdminUser(userId).catch((e) => {
      console.warn('Backend deleteAdminUser error:', e)
    })

    // 3. Update local cache
    const roster = getLocalRoster()
    const filtered = roster.filter((u) => u.id !== userId)
    saveLocalRoster(filtered)
    return filtered
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(JWT_STORAGE_KEY)
    navigate('/')
  }

  const isMasterAdmin = Boolean(user?.email && user.email.toLowerCase() === MASTER_GOV_EMAIL)

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        role: user?.role || null,
        isMasterAdmin,
        MASTER_GOV_EMAIL,
        modalState,
        openLogin,
        closeLogin,
        setActiveTab,
        setStep,
        loginGoogle,
        loginGoogleCredential,
        GOOGLE_CLIENT_ID,
        switchDemoRole,
        checkVerificationStatus,
        getUsersRoster,
        assignUserRole,
        whitelistUser,
        deleteUser,
        requestOtp,
        verifyOtp,
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
