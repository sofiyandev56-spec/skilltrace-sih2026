import React, { useState, useEffect } from 'react'
import { api } from '../api/client.js'
import { useGov } from '../gov/GovContext.jsx'

const VERIFICATION_STEPS = [
  { key: 'profile', labelEn: 'Checking User Profile...', labelHi: 'उपयोगकर्ता प्रोफ़ाइल जांची जा रही है…' },
  { key: 'bank_id', labelEn: 'Finding Bank ID...', labelHi: 'बैंक आईडी खोजी जा रही है…' },
  { key: 'record', labelEn: 'Matching Bank Record...', labelHi: 'बैंक रिकॉर्ड का मिलान किया जा रहा है…' },
  { key: 'owner', labelEn: 'Checking Owner...', labelHi: 'खाता धारक नाम की जांच…' },
  { key: 'mobile', labelEn: 'Checking Mobile...', labelHi: 'पंजीकृत मोबाइल नंबर का मिलान…' },
  { key: 'income', labelEn: 'Checking Income Pattern...', labelHi: 'मासिक आय पैटर्न का विश्लेषण…' },
  { key: 'evidence', labelEn: 'Generating Evidence Level...', labelHi: 'संप्रभु साक्ष्य स्तर तैयार किया जा रहा है…' },
  { key: 'done', labelEn: 'VERIFICATION COMPLETE', labelHi: 'सत्यापन पूर्ण' },
]

export default function BankVerificationCard({ defaultUserId = 'USER-10001', onVerified }) {
  const { lang } = useGov()
  const hi = lang === 'hi'

  const [usersList, setUsersList] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(defaultUserId)
  const [userData, setUserData] = useState(null)
  const [verificationResult, setVerificationResult] = useState(null)
  const [animating, setAnimating] = useState(false)
  const [activeStepIndex, setActiveStepIndex] = useState(-1)
  const [errorMsg, setErrorMsg] = useState('')

  // Load sandbox users on mount
  useEffect(() => {
    let isMounted = true
    api.getSandboxUsers()
      .then((users) => {
        if (!isMounted) return
        setUsersList(users || [])
      })
      .catch((e) => console.warn('Failed to load sandbox users:', e))
    return () => { isMounted = false }
  }, [])

  // When selected user changes, load user and existing verification
  useEffect(() => {
    if (!selectedUserId) return
    let isMounted = true
    setErrorMsg('')
    setVerificationResult(null)

    api.getSandboxUser(selectedUserId)
      .then((data) => {
        if (!isMounted) return
        setUserData(data)
        // Automatically fetch current or cached verification
        return api.getSandboxVerification(selectedUserId)
      })
      .then((ver) => {
        if (!isMounted || !ver) return
        setVerificationResult(ver)
        if (onVerified) onVerified(ver)
      })
      .catch((e) => {
        if (isMounted) console.warn('User load error:', e)
      })

    return () => { isMounted = false }
  }, [selectedUserId])

  // Run Animated Verification Sequence
  const handleRunVerification = async () => {
    if (animating || !selectedUserId) return
    setAnimating(true)
    setErrorMsg('')
    setActiveStepIndex(0)

    try {
      // Step through animation stages
      for (let i = 0; i < VERIFICATION_STEPS.length - 1; i++) {
        setActiveStepIndex(i)
        await new Promise((r) => setTimeout(r, 220))
      }

      // Execute backend API verification
      const result = await api.verifySandboxUser(selectedUserId)
      setActiveStepIndex(VERIFICATION_STEPS.length - 1)
      await new Promise((r) => setTimeout(r, 250))

      setVerificationResult(result)
      if (onVerified) onVerified(result)
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed.')
    } finally {
      setAnimating(false)
    }
  }

  const status = verificationResult?.verification_status || userData?.verification_status || 'UNVERIFIED'

  const getStatusBadge = (st) => {
    if (st === 'VERIFIED') {
      return (
        <span style={{
          background: '#dcfce7', color: '#15803d', border: '1.5px solid #86efac',
          padding: '4px 12px', borderRadius: '16px', fontWeight: 800, fontSize: '12px',
          display: 'inline-flex', alignItems: 'center', gap: '6px'
        }}>
          <span>🟢</span>
          <span>{hi ? 'सत्यापित (VERIFIED)' : 'VERIFIED'}</span>
        </span>
      )
    } else if (st === 'PARTIALLY VERIFIED') {
      return (
        <span style={{
          background: '#fef3c7', color: '#b45309', border: '1.5px solid #fcd34d',
          padding: '4px 12px', borderRadius: '16px', fontWeight: 800, fontSize: '12px',
          display: 'inline-flex', alignItems: 'center', gap: '6px'
        }}>
          <span>🟡</span>
          <span>{hi ? 'आंशिक सत्यापित (PARTIALLY VERIFIED)' : 'PARTIALLY VERIFIED'}</span>
        </span>
      )
    } else if (st === 'VERIFICATION FAILED') {
      return (
        <span style={{
          background: '#fee2e2', color: '#b91c1c', border: '1.5px solid #fca5a5',
          padding: '4px 12px', borderRadius: '16px', fontWeight: 800, fontSize: '12px',
          display: 'inline-flex', alignItems: 'center', gap: '6px'
        }}>
          <span>🔴</span>
          <span>{hi ? 'सत्यापन विफल (FAILED)' : 'VERIFICATION FAILED'}</span>
        </span>
      )
    }
    return (
      <span style={{
        background: '#f1f5f9', color: '#475569', border: '1.5px solid #cbd5e1',
        padding: '4px 12px', borderRadius: '16px', fontWeight: 800, fontSize: '12px',
        display: 'inline-flex', alignItems: 'center', gap: '6px'
      }}>
        <span>⚪</span>
        <span>{hi ? 'असत्यापित (UNVERIFIED)' : 'UNVERIFIED'}</span>
      </span>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
      border: '2px solid #cbd5e1',
      borderRadius: '12px',
      padding: '22px',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08)',
      marginBottom: '24px'
    }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '8px', background: '#0b6bcb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '20px', boxShadow: '0 2px 8px rgba(11,107,203,0.3)'
          }}>🏛️</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                {hi ? 'सैंडबॉक्स बैंक सत्यापन प्रणाली' : 'Sandbox Bank Verification System'}
              </h2>
              <span style={{
                background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd',
                padding: '2px 8px', borderRadius: '10px', fontSize: '10.5px', fontWeight: 700
              }}>
                SYNTHETIC SANDBOX DATA
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              {hi
                ? 'सिंथेटिक बैंक खाता एवं 3-माह वेतन जमा पैटर्न से उम्मीदवार परिणाम का स्वचालित मिलान।'
                : 'Automatic verification of employment outcome via synthetic bank records & 3-month credit patterns.'}
            </p>
          </div>
        </div>

        {/* User Switcher Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
            {hi ? 'परीक्षण उम्मीदवार चुनें:' : 'Test Candidate:'}
          </span>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={animating}
            style={{
              padding: '6px 10px',
              fontSize: '12.5px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              cursor: 'pointer'
            }}
          >
            {usersList.length > 0 ? (
              usersList.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.user_id} · {u.name} ({u.bank_id || 'No Bank'})
                </option>
              ))
            ) : (
              <option value="USER-10001">USER-10001 · Rahul Sharma (BANK-50001)</option>
            )}
          </select>
        </div>
      </div>

      {/* Grid: User Profile Fields & Bank Mappings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>
            User ID
          </span>
          <strong className="mono" style={{ fontSize: '15px', color: '#0b6bcb' }}>
            {userData?.user_id || selectedUserId}
          </strong>
          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
            Username: {userData?.username || '—'}
          </span>
        </div>

        <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>
            Bank ID
          </span>
          <strong className="mono" style={{ fontSize: '15px', color: '#0f172a' }}>
            {verificationResult?.bank_id || userData?.bank_id || 'NONE'}
          </strong>
          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
            Ref: {verificationResult?.account_ref || userData?.bank_record?.account_ref || '—'}
          </span>
        </div>

        <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>
            Bank Owner
          </span>
          <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
            {verificationResult?.bank_owner || userData?.bank_record?.account_holder || '—'}
          </strong>
          <span style={{ fontSize: '11px', color: verificationResult?.bank_owner_match === false ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
            {verificationResult?.bank_owner_match === true ? '✓ Owner Match' : verificationResult?.bank_owner_match === false ? '✗ Owner Mismatch' : 'Pending Check'}
          </span>
        </div>

        <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>
            Registered Mobile
          </span>
          <strong style={{ fontSize: '13.5px', color: '#0f172a', display: 'block' }}>
            {verificationResult?.registered_mobile || userData?.bank_record?.registered_mobile || userData?.mobile || '—'}
          </strong>
          <span style={{ fontSize: '11px', color: verificationResult?.mobile_match === false ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
            {verificationResult?.mobile_match === true ? '✓ Mobile Match' : verificationResult?.mobile_match === false ? '✗ Mobile Mismatch' : 'Pending Check'}
          </span>
        </div>

        <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>
            Income Pattern
          </span>
          <strong style={{ fontSize: '13.5px', color: '#047857', display: 'block' }}>
            {verificationResult?.income_pattern || userData?.bank_record?.income_signal || 'Evaluating…'}
          </strong>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Signal: <strong>{verificationResult?.income_signal || userData?.bank_record?.income_signal || 'NONE'}</strong>
          </span>
        </div>

        <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}>
          <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '5px' }}>
            Verification Status
          </span>
          <div>
            {getStatusBadge(status)}
          </div>
          {verificationResult?.verification_id && (
            <span className="mono" style={{ display: 'block', fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>
              {verificationResult.verification_id}
            </span>
          )}
        </div>
      </div>

      {/* Live Verification Multi-Stage Animation */}
      {animating && (
        <div style={{
          background: '#0f172a',
          color: '#f8fafc',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '16px',
          boxShadow: '0 4px 16px rgba(15,23,42,0.25)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', marginBottom: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            ⚡ {hi ? 'स्वचालित बैंक सत्यापन प्रक्रिया जारी है…' : 'Running Automated Verification Sequence…'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
            {VERIFICATION_STEPS.map((step, idx) => {
              const isPast = idx < activeStepIndex
              const isCurrent = idx === activeStepIndex
              return (
                <div
                  key={step.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: isPast ? '#4ade80' : isCurrent ? '#38bdf8' : '#64748b',
                    fontWeight: isCurrent ? 700 : 500,
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ fontSize: '13px' }}>
                    {isPast ? '✓' : isCurrent ? '⏳' : '○'}
                  </span>
                  <span>{hi ? step.labelHi : step.labelEn}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error or Reason Alert if Failed or Partially Verified */}
      {errorMsg && (
        <div style={{ background: '#fef2f2', border: '1px solid #f87171', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12.5px', color: '#b91c1c' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {verificationResult?.details?.reason && status !== 'VERIFIED' && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12.5px', color: '#92400e' }}>
          <strong>🛡️ {hi ? 'सत्यापन विवरण:' : 'Verification Diagnostics:'}</strong> {verificationResult.details.reason}
        </div>
      )}

      {/* Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '10px' }}>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          {verificationResult?.timestamp ? (
            <span>
              {hi ? 'अंतिम जांच:' : 'Last verified:'} <strong>{verificationResult.timestamp}</strong>
            </span>
          ) : (
            <span>{hi ? 'प्रोफ़ाइल खोलने पर स्वतः सत्यापित होता है।' : 'Automated matching triggers on profile load.'}</span>
          )}
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={handleRunVerification}
          disabled={animating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#0b6bcb',
            borderColor: '#0284c7',
            padding: '8px 18px',
            fontWeight: 700
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <span>{animating ? (hi ? 'सत्यापन जारी…' : 'Verifying…') : (hi ? 'बैंक सत्यापन चलाएँ' : 'Run Verification')}</span>
        </button>
      </div>
    </div>
  )
}
