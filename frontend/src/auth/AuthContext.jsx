import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentData } from '../api/mock/store.js'
import * as ministryAuth from './ministryAuth.js'

const AuthContext = createContext(null)

const AUTH_STORAGE_KEY = 'skilltrace.session_user'

export const DEMO_GOV_USER = {
  id: 'OFF000001',
  name: 'Chandrashekhar Reddy',
  email: 'c.reddy@msde.gov.in',
  role: 'government',
  designation: 'Joint Secretary (Monitoring & Evaluation)',
  ministry: 'Ministry of Skill Development and Entrepreneurship',
  phone: '+91 99823 72846',
  verified: true,
  lastLogin: '2026-09-10 09:30 IST',
}

export const DEMO_CLIENT_USER = {
  id: 'TRN-0001',
  name: 'Aarti Patil',
  phone: '+91 91256 71886',
  email: 'aarti.patil@email.com',
  role: 'client',
  course: 'General Duty Assistant',
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

export function AuthProvider({ children }) {
  const navigate = useNavigate()

  // The trainee session. Persisted across browser restarts — a citizen
  // checking their own record should not have to sign in every visit.
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  // The ministry session is deliberately separate: different store, different
  // lifetime, different credentials. Holding one never implies the other.
  const [officer, setOfficer] = useState(() => ministryAuth.readSession())

  // Modal flow state
  const [modalState, setModalState] = useState({
    isOpen: false,
    step: 'select', // 'select' | 'phone' | 'otp' | 'profile' | 'gov'
    phone: '',
    generatedOtp: '123456',
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
    }
  }, [user])

  const openLogin = (step = 'select') => {
    setModalState({
      isOpen: true,
      step,
      phone: '',
      generatedOtp: '123456',
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

  // Request OTP for phone
  const requestOtp = (rawPhone) => {
    const clean = rawPhone.replace(/\D/g, '')
    if (clean.length !== 10) {
      setModalState((prev) => ({ ...prev, error: 'Please enter a valid 10-digit Indian mobile number.' }))
      return false
    }
    if (!['6', '7', '8', '9'].includes(clean[0])) {
      setModalState((prev) => ({ ...prev, error: 'Indian mobile numbers must start with 6, 7, 8, or 9.' }))
      return false
    }

    // Generate fixed/predictable 6-digit OTP for demo simplicity, default 123456
    const otp = '123456'
    setModalState((prev) => ({
      ...prev,
      loading: true,
      error: '',
    }))

    setTimeout(() => {
      setModalState((prev) => ({
        ...prev,
        step: 'otp',
        phone: clean,
        generatedOtp: otp,
        loading: false,
      }))
    }, 400)

    return true
  }

  // Verify OTP
  const verifyOtp = (enteredOtp) => {
    if (enteredOtp !== modalState.generatedOtp && enteredOtp !== '123456') {
      setModalState((prev) => ({ ...prev, error: 'Incorrect OTP. Please enter the 6-digit code (use 123456 for demo).' }))
      return false
    }

    setModalState((prev) => ({ ...prev, loading: true, error: '' }))

    setTimeout(() => {
      // Find matching trainee in dataset or check if new user
      const data = currentData()
      const formattedPhone = `+91 ${modalState.phone.slice(0, 5)} ${modalState.phone.slice(5)}`
      const matchedTrainee = (data?.trainees || []).find((t) => {
        const cleanTPhone = (t.phone || '').replace(/\D/g, '')
        return cleanTPhone.endsWith(modalState.phone) || cleanTPhone === modalState.phone
      })

      if (matchedTrainee) {
        // Returning client user found in database
        const clientUser = {
          ...matchedTrainee,
          role: 'client',
          phone: formattedPhone,
          verified: true,
          monthly_salary: matchedTrainee.salary || 14000,
          employer: matchedTrainee.employer || 'Sanjeevani Hospital',
          verified_status: matchedTrainee.outcome || 'employed',
          verified_milestone: '3+ months at same employer',
          trust_level: 'high',
          certification_date: '15 Jan 2025',
          placement_date: '28 Jan 2025',
        }
        setUser(clientUser)
        setModalState((prev) => ({ ...prev, isOpen: false, loading: false }))
        navigate('/client')
      } else {
        // First-time user: needs minimal profile setup
        setModalState((prev) => ({
          ...prev,
          step: 'profile',
          loading: false,
          pendingUser: {
            phone: formattedPhone,
            role: 'client',
            verified: true,
          },
        }))
      }
    }, 500)

    return true
  }

  // Complete profile for first-time user
  const completeProfile = (profileData) => {
    const newUser = {
      id: `TRN-${Math.floor(1000 + Math.random() * 9000)}`,
      name: profileData.name.trim(),
      course: profileData.course,
      district: profileData.district,
      category: profileData.category,
      phone: modalState.pendingUser?.phone || `+91 ${modalState.phone}`,
      role: 'client',
      verified: true,
      employer: profileData.employer || 'Self-Employed / Enrolled',
      monthly_salary: 12000,
      verified_status: 'awaiting_confirmation',
      verified_milestone: 'Enrolment Verified',
      trust_level: 'medium',
      certification_date: '2026-06-10',
    }

    setUser(newUser)
    setModalState((prev) => ({ ...prev, isOpen: false, loading: false }))
    navigate('/client')
  }

  // Continue with Google
  const loginGoogle = () => {
    setModalState((prev) => ({ ...prev, loading: true, error: '' }))
    setTimeout(() => {
      // Defaults to Aarti Patil (Client) unless already configured
      setUser(DEMO_CLIENT_USER)
      setModalState((prev) => ({ ...prev, isOpen: false, loading: false }))
      navigate('/client')
    }, 450)
  }

  // Government Officer Login
  /**
   * Ministry sign-in. Delegates the credential check to ministryAuth, which is
   * the only module that can see the officer list — this function never
   * decides on its own that someone is an officer.
   */
  const loginMinistry = (officerId, password) =>
    new Promise((resolve) => {
      const result = ministryAuth.authenticate(officerId, password)
      if (!result.ok) {
        resolve(result)
        return
      }
      ministryAuth.saveSession(result.officer)
      setOfficer(result.officer)
      resolve(result)
    })

  const logoutMinistry = () => {
    ministryAuth.clearSession()
    setOfficer(null)
    navigate('/ministry/login', { replace: true })
  }

  /** Ends the trainee session only. The ministry session has its own exit. */
  const logout = () => {
    setUser(null)
    navigate('/client', { replace: true })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        officer,
        isAuthenticated: !!user,
        isMinistry: !!officer,
        // Role is derived from which session actually exists, never chosen.
        role: officer ? 'ministry' : user ? 'client' : null,
        modalState,
        openLogin,
        closeLogin,
        setStep,
        requestOtp,
        verifyOtp,
        completeProfile,
        loginGoogle,
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
