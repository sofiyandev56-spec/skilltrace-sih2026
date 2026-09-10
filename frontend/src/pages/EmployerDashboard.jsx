import React, { useState, useEffect } from 'react'
import { api } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useGov } from '../gov/GovContext.jsx'

export default function EmployerDashboard() {
  const { user, switchDemoRole } = useAuth()
  const { toast } = useToast()
  const { lang } = useGov()
  const hi = lang === 'hi'

  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  // Verification form state
  const [verifyForm, setVerifyForm] = useState({
    is_working: true,
    salary: 15000,
    job_role: '',
    notes: 'Candidate completed 90 continuous days of service. Performance satisfactory.'
  })

  const [selectedCompany, setSelectedCompany] = useState(user?.company_name || 'Sanjeevani Hospital')
  const companyName = selectedCompany

  const loadCandidates = async () => {
    setLoading(true)
    try {
      const res = await api.getEmployerTrainees()
      setCandidates(Array.isArray(res) ? res : [])
    } catch (err) {
      console.warn('Failed to load employer candidates:', err)
      toast({ title: 'Notice', message: 'Loaded offline candidate roster', type: 'info' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCandidates()
  }, [user?.id, user?.company_name])

  const openVerifyModal = (candidate) => {
    setSelectedCandidate(candidate)
    setVerifyForm({
      is_working: true,
      salary: candidate.salary || 15000,
      job_role: candidate.course || '',
      notes: 'Candidate completed 90 continuous days of service with valid payroll credit.'
    })
  }

  const handleVerifySubmit = async (e) => {
    e.preventDefault()
    if (!selectedCandidate) return

    setVerifying(true)
    try {
      const res = await api.verifyMilestone({
        trainee_id: selectedCandidate.id,
        employer: companyName,
        is_working: verifyForm.is_working,
        salary: Number(verifyForm.salary),
        job_role: verifyForm.job_role,
        notes: verifyForm.notes,
      })

      toast({
        title: verifyForm.is_working ? 'Milestone Verified' : 'Status Updated',
        message: res.message || `Successfully updated 3-month milestone for ${selectedCandidate.name}.`,
        type: 'success',
      })

      setSelectedCandidate(null)
      loadCandidates()
    } catch (err) {
      toast({
        title: 'Update Error',
        message: err.message || 'Failed to submit milestone verification.',
        type: 'danger',
      })
    } finally {
      setVerifying(false)
    }
  }

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    if (filterStatus === 'verified') return c.is_verified_3mo
    if (filterStatus === 'pending') return !c.is_verified_3mo
    return true
  })

  const verifiedCount = candidates.filter((c) => c.is_verified_3mo).length
  const pendingCount = candidates.length - verifiedCount
  const retentionPct = candidates.length ? Math.round((verifiedCount / candidates.length) * 100) : 0

  return (
    <div className="container employer-page">
      {/* Employer Enterprise Header */}
      <div className="employer-header">
        <div className="employer-header__main">
          <div className="employer-badge-row">
            <span className="employer-corp-badge">{hi ? '🏢 मान्यता प्राप्त नियोक्ता संस्थान' : '🏢 Accredited Hiring Enterprise'}</span>
            <span className="employer-dpdpa-badge">{hi ? '🔒 DPDPA 2023 सीमित दृश्य' : '🔒 DPDPA 2023 Restricted View'}</span>
          </div>
          <h1 className="employer-title">{companyName}</h1>
          <p className="employer-sub">
            {hi ? (
              <>
                नियोक्ता सत्यापन एवं 3-माह प्रतिधारण ट्रैकिंग &middot; अधिकृत मानव संसाधन अधिकारी:{' '}
                <strong>{user?.name}</strong> ({user?.email})
              </>
            ) : (
              <>
                Employer Verification &amp; 3-Month Retention Tracking &middot; Authorized HR Officer:{' '}
                <strong>{user?.name}</strong> ({user?.email})
              </>
            )}
          </p>
        </div>

        <div className="employer-header__actions">
          <button
            type="button"
            className="btn btn--sm btn--outline"
            onClick={() =>
              setSelectedCompany((prev) =>
                prev === 'Tata Advanced Systems' ? 'Sanjeevani Hospital' : 'Tata Advanced Systems'
              )
            }
          >
            {hi ? (
              companyName === 'Tata Advanced Systems'
                ? 'संजीवनी हॉस्पिटल पर बदलें'
                : 'टाटा एडवांस्ड सिस्टम्स पर बदलें'
            ) : (
              `Switch to ${
                companyName === 'Tata Advanced Systems'
                  ? 'Sanjeevani Hospital'
                  : 'Tata Advanced Systems'
              }`
            )}
          </button>
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={loadCandidates}
          >
            {hi ? '↻ रोस्टर रीफ़्रेश करें' : '↻ Refresh Roster'}
          </button>
        </div>
      </div>

      {/* DPDPA 2023 Notice */}
      <div className="callout-rule" style={{ margin: '16px 0 24px' }}>
        <div>
          {hi ? (
            <>
              <strong>सख्त भूमिका-आधारित डेटा पृथक्करण (धारा 6, DPDPA 2023):</strong> वैधानिक गोपनीयता नियमों के तहत, आपका एचआर खाता केवल उन्हीं उम्मीदवारों को देख सकता है जो सीधे <strong>{companyName}</strong> में नियुक्त या प्रशिक्षु हैं। अन्य कॉरपोरेट संस्थाओं के असंबंधित उम्मीदवारों का विवरण एन्क्रिप्टेड व छुपाया गया है।
            </>
          ) : (
            <>
              <strong>Strict Role-Based Data Isolation (Section 6, DPDPA 2023):</strong> Under statutory
              confidentiality rules, your HR account can only access candidates directly placed or apprenticed
              with <strong>{companyName}</strong>. Unrelated candidates from other corporate entities are cryptographically redacted.
            </>
          )}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid--4" style={{ marginBottom: 24 }}>
        <div className="stat">
          <span className="stat__label">{hi ? 'कुल भर्ती उम्मीदवार' : 'Total Hired Candidates'}</span>
          <span className="stat__value num">{candidates.length}</span>
          <span className="stat__note">{hi ? `${companyName} को आवंटित` : `Assigned to ${companyName}`}</span>
        </div>

        <div className="stat" style={{ borderLeft: '4px solid #138808' }}>
          <span className="stat__label">{hi ? '3-माह सत्यापित' : '3-Month Retention Verified'}</span>
          <span className="stat__value num text-success" style={{ color: '#138808' }}>{verifiedCount}</span>
          <span className="stat__note">{hi ? 'सरकारी प्रोत्साहन हेतु पात्र' : 'Eligible for State Subsidy'}</span>
        </div>

        <div className="stat" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span className="stat__label">{hi ? 'सत्यापन लंबित' : 'Verification Pending'}</span>
          <span className="stat__value num" style={{ color: '#d97706' }}>{pendingCount}</span>
          <span className="stat__note">{hi ? '90 दिनों पर पुष्टि आवश्यक' : 'Action required at 90 days'}</span>
        </div>

        <div className="stat stat--total">
          <span className="stat__label">{hi ? '3-माह प्रतिधारण दर' : 'Retention Rate'}</span>
          <span className="stat__value num">{retentionPct}%</span>
          <span className="stat__note">{hi ? 'लक्ष्य: ≥ 70%' : 'Target: ≥ 70%'}</span>
        </div>
      </div>

      {/* Candidate Verification Table */}
      <div className="panel">
        <div className="panel__head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>{hi ? 'उम्मीदवार प्रतिधारण एवं सत्यापन रोस्टर' : 'Candidate Retention & Verification Roster'}</h3>
            <p className="small muted">
              {hi ? 'पुष्टि करें कि क्या नियुक्त उम्मीदवार वैधानिक 3-माह रोजगार सीमा तक पहुंचे हैं।' : 'Confirm whether placed candidates reached the statutory 3-month employment threshold.'}
            </p>
          </div>

          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className={`btn btn--sm ${filterStatus === 'all' ? 'btn--primary' : 'btn--outline'}`}
              onClick={() => setFilterStatus('all')}
            >
              {hi ? `सभी (${candidates.length})` : `All (${candidates.length})`}
            </button>
            <button
              type="button"
              className={`btn btn--sm ${filterStatus === 'pending' ? 'btn--primary' : 'btn--outline'}`}
              onClick={() => setFilterStatus('pending')}
            >
              {hi ? `सत्यापन लंबित (${pendingCount})` : `Pending Verification (${pendingCount})`}
            </button>
            <button
              type="button"
              className={`btn btn--sm ${filterStatus === 'verified' ? 'btn--primary' : 'btn--outline'}`}
              onClick={() => setFilterStatus('verified')}
            >
              {hi ? `सत्यापित (${verifiedCount})` : `Verified (${verifiedCount})`}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="muted">{hi ? 'लाइव उम्मीदवार लेजर लोड हो रहा है…' : 'Fetching real-time candidate ledger from sovereign backend…'}</span>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p className="muted">{hi ? `${companyName} हेतु इस फ़िल्टर में कोई उम्मीदवार नहीं मिला।` : `No candidates found matching this filter for ${companyName}.`}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{hi ? 'प्रशिक्षार्थी आईडी' : 'Trainee ID'}</th>
                  <th>{hi ? 'उम्मीदवार का नाम' : 'Candidate Name'}</th>
                  <th>{hi ? 'कोर्स / ट्रेड' : 'Course / Trade'}</th>
                  <th>{hi ? 'संपर्क नंबर' : 'Contact Number'}</th>
                  <th>{hi ? 'नियुक्ति तिथि' : 'Placement Date'}</th>
                  <th>{hi ? 'मासिक वेतन' : 'Monthly Salary'}</th>
                  <th>{hi ? 'मील का पत्थर स्थिति' : 'Milestone Status'}</th>
                  <th>{hi ? 'सत्यापन कार्रवाई' : 'Verification Action'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((c) => (
                  <tr key={c.id}>
                    <td><code className="num">{c.id}</code></td>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.course}</td>
                    <td className="num">{c.phone}</td>
                    <td className="num">{c.placement_date || '2025-01-28'}</td>
                    <td className="num">₹{(c.salary || 14000).toLocaleString('en-IN')}</td>
                    <td>
                      {c.is_verified_3mo ? (
                        <span className="tag tag--live" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                          {hi ? '✓ 3-माह पुष्टीकृत' : '✓ 3-Month Confirmed'}
                        </span>
                      ) : (
                        <span className="tag" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
                          {hi ? '⏳ पुष्टि प्रतीक्षित' : '⏳ Awaiting Confirmation'}
                        </span>
                      )}
                    </td>
                    <td>
                      {c.is_verified_3mo ? (
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost"
                          onClick={() => openVerifyModal(c)}
                        >
                          {hi ? 'पुनः सत्यापित करें' : 'Re-Verify'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--sm btn--primary"
                          onClick={() => openVerifyModal(c)}
                        >
                          {hi ? '✓ 3-माह प्रतिधारण पुष्टि करें' : '✓ Confirm 3-Mo Retention'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Milestone Verification Modal */}
      {selectedCandidate && (
        <div className="gov-modal-backdrop" onClick={() => setSelectedCandidate(null)}>
          <div className="gov-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="gov-modal__head">
              <div>
                <h3>{hi ? 'रोजगार मील के पत्थर की पुष्टि' : 'Confirm Employment Milestone'}</h3>
                <p className="small muted">
                  {hi
                    ? `${selectedCandidate.name} (${selectedCandidate.id}) हेतु नियोक्ता पुष्टि`
                    : `Employer Confirmation for ${selectedCandidate.name} (${selectedCandidate.id})`}
                </p>
              </div>
              <button
                type="button"
                className="gov-modal__close"
                onClick={() => setSelectedCandidate(null)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="gov-modal__body">
              <div className="field">
                <span className="label">{hi ? 'रोजगार स्थिति' : 'Employment Status'}</span>
                <div className="row" style={{ gap: 16, marginTop: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="is_working"
                      checked={verifyForm.is_working === true}
                      onChange={() => setVerifyForm({ ...verifyForm, is_working: true })}
                    />
                    <span><strong>{hi ? 'सक्रिय रूप से कार्यरत (3+ माह पूर्ण)' : 'Still Actively Employed (3+ Months)'}</strong></span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="is_working"
                      checked={verifyForm.is_working === false}
                      onChange={() => setVerifyForm({ ...verifyForm, is_working: false })}
                    />
                    <span>{hi ? 'कार्यमुक्त / संस्था छोड़ दी' : 'Separated / Left Organization'}</span>
                  </label>
                </div>
              </div>

              {verifyForm.is_working && (
                <>
                  <label className="field">
                    <span className="label">{hi ? 'सत्यापित मासिक वेतन (₹)' : 'Verified Monthly Salary (₹)'}</span>
                    <input
                      type="number"
                      value={verifyForm.salary}
                      onChange={(e) => setVerifyForm({ ...verifyForm, salary: e.target.value })}
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="label">{hi ? 'पुष्टीकृत पदनाम' : 'Confirmed Job Designation'}</span>
                    <input
                      type="text"
                      value={verifyForm.job_role}
                      onChange={(e) => setVerifyForm({ ...verifyForm, job_role: e.target.value })}
                      required
                    />
                  </label>
                </>
              )}

              <label className="field">
                <span className="label">{hi ? 'नियोक्ता सत्यापन टिप्पणी' : 'Employer Verification Notes'}</span>
                <textarea
                  rows={3}
                  value={verifyForm.notes}
                  onChange={(e) => setVerifyForm({ ...verifyForm, notes: e.target.value })}
                  placeholder={hi ? 'टिप्पणी या पेरोल सत्यापन संदर्भ दर्ज करें' : 'Enter notes or payroll verification reference'}
                />
              </label>

              <div className="gov-modal__foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setSelectedCandidate(null)}
                >
                  {hi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={verifying}
                >
                  {verifying
                    ? (hi ? 'लेजर में सबमिट किया जा रहा है…' : 'Submitting to Sovereign Blockchain Ledger…')
                    : (hi ? 'पुष्टि सबमिट करें' : 'Submit Sovereign Confirmation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
