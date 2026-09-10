import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { COURSES, DISTRICTS, CATEGORIES } from '../api/mock/dataset.js'

export default function AuthModal() {
  const navigate = useNavigate()
  const {
    modalState,
    closeLogin,
    setStep,
    requestOtp,
    verifyOtp,
    completeProfile,
    loginGoogle,
  } = useAuth()

  const [phoneInput, setPhoneInput] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [countdown, setCountdown] = useState(30)
  const [govEmail, setGovEmail] = useState('officer@msde.gov.in')
  const [govPasskey, setGovPasskey] = useState('MSDE@2026')

  // Profile fields for first-time onboarding
  const [profileData, setProfileData] = useState({
    name: '',
    course: COURSES[0]?.name || 'Electrician (Level 3)',
    district: DISTRICTS[0] || 'Pune',
    category: 'General',
  })

  const otpInputsRef = useRef([])

  // Reset inputs when step changes
  useEffect(() => {
    if (modalState.step === 'otp') {
      setOtpDigits(['', '', '', '', '', ''])
      setCountdown(30)
      setTimeout(() => {
        otpInputsRef.current[0]?.focus()
      }, 100)
    }
  }, [modalState.step])

  // Countdown timer for OTP resend
  useEffect(() => {
    if (modalState.step !== 'otp' || countdown <= 0) return
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [modalState.step, countdown])

  if (!modalState.isOpen) return null

  // Handle single digit OTP input
  const handleOtpChange = (index, value) => {
    const clean = value.replace(/\D/g, '')
    const newDigits = [...otpDigits]

    if (clean.length > 1) {
      // Paste handling
      const pasted = clean.slice(0, 6).split('')
      pasted.forEach((char, i) => {
        if (i < 6) newDigits[i] = char
      })
      setOtpDigits(newDigits)
      const nextIdx = Math.min(pasted.length, 5)
      otpInputsRef.current[nextIdx]?.focus()
      return
    }

    newDigits[index] = clean
    setOtpDigits(newDigits)

    if (clean && index < 5) {
      otpInputsRef.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus()
    }
  }

  const handleOtpSubmit = (e) => {
    e.preventDefault()
    const fullOtp = otpDigits.join('')
    if (fullOtp.length !== 6) return
    verifyOtp(fullOtp)
  }

  const fillDemoOtp = () => {
    setOtpDigits(['1', '2', '3', '4', '5', '6'])
    otpInputsRef.current[5]?.focus()
  }

  return (
    <div className="gov-modal-backdrop" onClick={closeLogin} role="dialog" aria-modal="true">
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Government Header with Ashoka Chakra */}
        <div className="auth-modal__header">
          <div className="auth-modal__branding">
            <div className="auth-modal__org">
              <img
                src="/state-emblem.png"
                alt="Ashoka Chakra"
                className="auth-modal__chakra"
                width="20"
                height="20"
              />
              <span className="auth-modal__country">GOVERNMENT OF INDIA</span>
            </div>
            <div className="auth-modal__title">SkillTrace Digital Gateway</div>
          </div>
          <button
            type="button"
            className="gov-modal__close"
            onClick={closeLogin}
            aria-label="Close authentication window"
          >
            &times;
          </button>
        </div>

        {/* Modal Body with Flow Steps */}
        <div className="auth-modal__body">
          {modalState.error && (
            <div className="auth-error-banner" role="alert">
              <span aria-hidden="true">&#9888;</span>
              <span>{modalState.error}</span>
            </div>
          )}

          {/* ================= STEP 1: SELECT AUTH METHOD ================= */}
          {modalState.step === 'select' && (
            <div className="auth-flow">
              <div className="auth-flow__head">
                <h3>Sign in to SkillTrace</h3>
                <p>Access your verified skilling outcomes, work history wallet, and government portal.</p>
              </div>

              <div className="auth-options">
                {/* Option A: Google */}
                <button
                  type="button"
                  className="auth-btn auth-btn--google"
                  onClick={loginGoogle}
                  disabled={modalState.loading}
                >
                  <svg className="auth-btn__icon" viewBox="0 0 24 24" width="18" height="18">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="auth-divider">
                  <span>OR</span>
                </div>

                {/* Option B: Phone Number */}
                <button
                  type="button"
                  className="auth-btn auth-btn--phone"
                  onClick={() => setStep('phone')}
                >
                  <span className="auth-btn__flag">&#127470;&#127475;</span>
                  <span>Continue with Phone Number (+91)</span>
                </button>
              </div>

              <div className="auth-footer-link">
                <span>Are you a Ministry or District official?</span>
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    closeLogin()
                    navigate('/ministry/login')
                  }}
                >
                  Ministry sign-in &rarr;
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: PHONE INPUT ================= */}
          {modalState.step === 'phone' && (
            <div className="auth-flow">
              <div className="auth-flow__head">
                <button
                  type="button"
                  className="auth-back-btn"
                  onClick={() => setStep('select')}
                >
                  &larr; Back
                </button>
                <h3>Enter your mobile number</h3>
                <p>We'll send a 6-digit One Time Password (OTP) to authenticate your account.</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  requestOtp(phoneInput)
                }}
                className="auth-form"
              >
                <div className="field">
                  <span className="label">Mobile Number</span>
                  <div className="auth-phone-input-wrap">
                    <span className="auth-phone-prefix">
                      <span className="auth-phone-flag" aria-hidden="true">&#127470;&#127475;</span>
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter 10-digit mobile number"
                      className="auth-phone-input"
                      autoFocus
                      required
                    />
                  </div>
                  <span className="small muted">
                    Sample seeded trainee number: <code className="num" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setPhoneInput('9125671886')}>9125671886</code>
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn btn--primary btn--block btn--lg"
                  disabled={modalState.loading || phoneInput.length < 10}
                >
                  {modalState.loading ? 'Sending OTP…' : 'Send OTP'}
                </button>
              </form>
            </div>
          )}

          {/* ================= STEP 3: OTP VERIFICATION ================= */}
          {modalState.step === 'otp' && (
            <div className="auth-flow">
              <div className="auth-flow__head">
                <button
                  type="button"
                  className="auth-back-btn"
                  onClick={() => setStep('phone')}
                >
                  &larr; Change phone number
                </button>
                <h3>Verify your mobile number</h3>
                <p>
                  We've sent a 6-digit OTP to <strong>+91 {modalState.phone}</strong>
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="auth-form">
                <div className="auth-otp-row" aria-label="Enter 6-digit OTP">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpInputsRef.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="auth-otp-box"
                      autoComplete="one-time-code"
                      required
                    />
                  ))}
                </div>

                <div className="auth-otp-tools">
                  <span className="auth-otp-hint" onClick={fillDemoOtp} style={{ cursor: 'pointer' }}>
                    💡 Demo OTP: <strong className="num">123456</strong> (Click to auto-fill)
                  </span>

                  <div className="auth-resend-wrap">
                    {countdown > 0 ? (
                      <span className="small muted">Resend OTP in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        className="auth-link-btn"
                        onClick={() => {
                          setCountdown(30)
                          requestOtp(modalState.phone)
                        }}
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn--primary btn--block btn--lg"
                  disabled={modalState.loading || otpDigits.some((d) => !d)}
                >
                  {modalState.loading ? 'Verifying OTP…' : 'Verify & Proceed'}
                </button>
              </form>
            </div>
          )}

          {/* ================= STEP 4: FIRST-TIME PROFILE ONBOARDING ================= */}
          {modalState.step === 'profile' && (
            <div className="auth-flow">
              <div className="auth-flow__head">
                <h3>Welcome! Complete your Profile</h3>
                <p>Please enter your information to connect your verified skilling outcomes record.</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  completeProfile(profileData)
                }}
                className="auth-form"
              >
                <label className="field">
                  <span className="label">Full Name</span>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    placeholder="e.g. Ramesh Deshmukh"
                    required
                    autoFocus
                  />
                </label>

                <div className="grid grid--2">
                  <label className="field">
                    <span className="label">Course / Trade</span>
                    <select
                      value={profileData.course}
                      onChange={(e) => setProfileData({ ...profileData, course: e.target.value })}
                    >
                      {COURSES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span className="label">District</span>
                    <select
                      value={profileData.district}
                      onChange={(e) => setProfileData({ ...profileData, district: e.target.value })}
                    >
                      {DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="field">
                  <span className="label">Social Category</span>
                  <select
                    value={profileData.category}
                    onChange={(e) => setProfileData({ ...profileData, category: e.target.value })}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  className="btn btn--primary btn--block btn--lg"
                  disabled={!profileData.name.trim()}
                >
                  Save Profile &amp; Open Client Dashboard
                </button>
              </form>
            </div>
          )}

          {/* ================= STEP 5: GOVERNMENT OFFICIAL ACCESS ================= */}
        </div>
      </div>
    </div>
  )
}
