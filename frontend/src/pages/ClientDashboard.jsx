import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { EvidenceBadge } from '../components/Evidence.jsx'
import { inr } from '../lib/format.js'

export default function ClientDashboard() {
  const { user } = useAuth()
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [checkinSuccess, setCheckinSuccess] = useState(false)

  const trainee = user || {
    id: 'TRN-0001',
    name: 'Aarti Patil',
    phone: '+91 91256 71886',
    course: 'General Duty Assistant',
    district: 'Nashik',
    category: 'General',
    employer: 'Sanjeevani Hospital',
    job_role: 'Healthcare Assistant',
    monthly_salary: 14000,
    verified_status: 'employed',
    verified_milestone: '3+ months at same employer',
    certification_date: '15 Jan 2025',
    placement_date: '28 Jan 2025',
  }

  const handleDownloadWallet = () => {
    setDownloadSuccess(true)
    setTimeout(() => setDownloadSuccess(false), 3000)
  }

  const handleQuickCheckin = () => {
    setCheckinSuccess(true)
    setTimeout(() => setCheckinSuccess(false), 3000)
  }

  return (
    <div className="client-dashboard-wrap stack">
      {/* 1. Trainee Sovereign Identity & Profile Hero */}
      <div className="client-hero">
        <div className="client-hero__main">
          <div className="client-hero__avatar" aria-hidden="true">
            {trainee.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="client-hero__details">
            <div className="client-hero__badge-row">
              <span className="client-hero__id num">{trainee.id}</span>
              <span className="tier tier--high">● Verified Record</span>
              <span className="mode mode--live"><span className="mode__dot" /> Citizen Wallet</span>
            </div>
            <h2>{trainee.name}</h2>
            <div className="client-hero__sub">
              <span>{trainee.course}</span> &middot; <span>{trainee.district}, Maharashtra</span> &middot;{' '}
              <span>Category: {trainee.category || 'General'}</span>
            </div>
          </div>
        </div>

        <div className="client-hero__status-card">
          <div className="client-hero__status-label">CURRENT VERIFIED STATUS</div>
          <div className="client-hero__status-val">Employed (3+ Months)</div>
          <div className="client-hero__status-emp">
            <strong>{trainee.employer}</strong> &mdash; {trainee.job_role || 'Healthcare Assistant'}
          </div>
          <div className="client-hero__status-meta">
            Monthly Earnings: <strong className="num">{inr(trainee.monthly_salary || 14000)}</strong> / mo
          </div>
        </div>
      </div>

      {/* 2. Three-Month Rule Milestone Timeline */}
      <div className="panel">
        <div className="panel__head">
          <div className="panel__title">Longitudinal Milestone Progress (The 3-Month Rule)</div>
          <div className="panel__right">
            <span className="small muted">MSDE Accountability Standard</span>
          </div>
        </div>
        <div className="panel__body">
          <div className="callout-rule" style={{ marginBottom: 16 }}>
            <div>
              <strong>Why 3 Months Matter:</strong> Under Government of India skilling guidelines, a bare placement
              letter is never counted as an outcome. Your employment record was verified only after{' '}
              <strong>3 consecutive months</strong> of verified bank income and employer confirmation at{' '}
              <strong>{trainee.employer}</strong>.
            </div>
          </div>

          <div className="client-milestones">
            <div className="milestone milestone--done">
              <div className="milestone__dot">&#10003;</div>
              <div className="milestone__content">
                <div className="milestone__title">Enrolment &amp; Training</div>
                <div className="milestone__desc">Nashik Industrial Training Wing</div>
                <div className="milestone__date">Oct 2024 &ndash; Jan 2025</div>
              </div>
            </div>

            <div className="milestone milestone--done">
              <div className="milestone__dot">&#10003;</div>
              <div className="milestone__content">
                <div className="milestone__title">Course Certified</div>
                <div className="milestone__desc">NSQF Level 3 Assessment Passed</div>
                <div className="milestone__date">15 Jan 2025</div>
              </div>
            </div>

            <div className="milestone milestone--done">
              <div className="milestone__dot">&#10003;</div>
              <div className="milestone__content">
                <div className="milestone__title">Placed at Employer</div>
                <div className="milestone__desc">{trainee.employer}</div>
                <div className="milestone__date">28 Jan 2025</div>
              </div>
            </div>

            <div className="milestone milestone--active">
              <div className="milestone__dot">&#9733;</div>
              <div className="milestone__content">
                <div className="milestone__title">3-Month Milestone &middot; Verified</div>
                <div className="milestone__desc">Confirmed by bank recurring pattern &amp; employer</div>
                <div className="milestone__date" style={{ color: 'var(--tier-high)', fontWeight: 700 }}>
                  28 Apr 2025 (Achieved)
                </div>
              </div>
            </div>

            <div className="milestone milestone--upcoming">
              <div className="milestone__dot">5</div>
              <div className="milestone__content">
                <div className="milestone__title">12-Month Retention</div>
                <div className="milestone__desc">Economic stability tracking</div>
                <div className="milestone__date">Jan 2026</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Verified Work-History Wallet & Digital Credential */}
      <div className="grid grid--2">
        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">Verified Work-History Wallet (Digital Credential)</div>
            <div className="panel__right">
              <span className="tier tier--high">● Government Tamper-Proof</span>
            </div>
          </div>
          <div className="panel__body">
            <div className="wallet-card">
              <div className="wallet-card__header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src="/emblem.svg" alt="Emblem" style={{ height: 32, width: 'auto' }} />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#1a2a6c' }}>
                      Skill India Digital Hub &middot; MSDE
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                      Verified Post-Training Credential
                    </div>
                  </div>
                </div>
                <div className="wallet-card__qr">
                  {/* Stylized QR Code placeholder */}
                  <svg viewBox="0 0 40 40" width="40" height="40" aria-label="Credential QR Verification Code">
                    <rect width="40" height="40" fill="#fff" />
                    <rect x="4" y="4" width="12" height="12" fill="#000" />
                    <rect x="6" y="6" width="8" height="8" fill="#fff" />
                    <rect x="8" y="8" width="4" height="4" fill="#000" />
                    <rect x="24" y="4" width="12" height="12" fill="#000" />
                    <rect x="26" y="6" width="8" height="8" fill="#fff" />
                    <rect x="28" y="8" width="4" height="4" fill="#000" />
                    <rect x="4" y="24" width="12" height="12" fill="#000" />
                    <rect x="6" y="26" width="8" height="8" fill="#fff" />
                    <rect x="8" y="28" width="4" height="4" fill="#000" />
                    <rect x="20" y="20" width="6" height="6" fill="#000" />
                    <rect x="28" y="28" width="8" height="8" fill="#000" />
                  </svg>
                </div>
              </div>

              <div className="wallet-card__grid">
                <div>
                  <span className="wallet-card__label">Candidate Name</span>
                  <strong>{trainee.name}</strong>
                </div>
                <div>
                  <span className="wallet-card__label">Trainee ID</span>
                  <strong className="num">{trainee.id}</strong>
                </div>
                <div>
                  <span className="wallet-card__label">Verified Employer</span>
                  <strong>{trainee.employer}</strong>
                </div>
                <div>
                  <span className="wallet-card__label">Verified Role</span>
                  <strong>{trainee.job_role || 'Healthcare Assistant'}</strong>
                </div>
                <div>
                  <span className="wallet-card__label">Assessed Course</span>
                  <strong>{trainee.course}</strong>
                </div>
                <div>
                  <span className="wallet-card__label">Verification Tier</span>
                  <strong style={{ color: 'var(--tier-high)' }}>Tier A &mdash; Bank &amp; Employer Corroborated</strong>
                </div>
              </div>

              <div className="wallet-card__footer">
                <span>Cryptographically verifiable via National Skills Qualifications Framework</span>
                <span className="num">ID: SIDH-2026-TRN0001</span>
              </div>
            </div>

            <div className="row" style={{ marginTop: 14, gap: 10 }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleDownloadWallet}
              >
                &#128190; Download Verified Credential PDF
              </button>
              <Link to="/consent" className="btn btn--ghost">
                Manage Data Permissions &rarr;
              </Link>
            </div>

            {downloadSuccess && (
              <div className="note" style={{ marginTop: 10, background: '#eef8f2', borderColor: '#146c43', color: '#146c43' }}>
                &#10003; Verifiable digital credential successfully prepared and verified against MSDE registry!
              </div>
            )}
          </div>
        </div>

        {/* 4. Trainee Incentives & Career Pathways */}
        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">Unlocked Opportunities &amp; Self-Benefits</div>
            <div className="panel__right">
              <span className="small muted">4 Pathways Active</span>
            </div>
          </div>
          <div className="panel__body">
            <p className="small muted" style={{ marginBottom: 14 }}>
              Because your 3-month employment is independently verified, you have unlocked priority access to
              national skilling pathways:
            </p>

            <div className="client-benefits">
              <div className="benefit-item">
                <div className="benefit-item__icon">&#128640;</div>
                <div className="benefit-item__text">
                  <strong>SIDH Job Exchange Priority</strong>
                  <p>Verified alumni profiles are surfaced in the top tier for enterprise recruitment drives.</p>
                </div>
                <span className="tier tier--high tier--sm">Active</span>
              </div>

              <div className="benefit-item">
                <div className="benefit-item__icon">&#127891;</div>
                <div className="benefit-item__text">
                  <strong>NSQF Fast-Track to Next Level</strong>
                  <p>Eligible to enrol in Level 4 Healthcare Supervisor course without re-submitting KYC or documents.</p>
                </div>
                <span className="tier tier--high tier--sm">Eligible</span>
              </div>

              <div className="benefit-item">
                <div className="benefit-item__icon">&#128737;</div>
                <div className="benefit-item__text">
                  <strong>e-Shram Social Security Linkage</strong>
                  <p>Streamlined accidental insurance coverage &amp; pension entitlements via Ministry of Labour integration.</p>
                </div>
                <span className="tier tier--high tier--sm">Linked</span>
              </div>

              <div className="benefit-item">
                <div className="benefit-item__icon">&#127974;</div>
                <div className="benefit-item__text">
                  <strong>MUDRA Alternate Credit Readiness</strong>
                  <p>Your 3-month verified income history serves as non-collateral cash-flow evidence for enterprise microloans.</p>
                </div>
                <span className="tier tier--medium tier--sm">Score 780</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Quarterly Check-in & Communications Log */}
      <div className="panel">
        <div className="panel__head">
          <div className="panel__title">My Check-in Log &middot; Automated SMS &amp; WhatsApp Reports</div>
          <div className="panel__right">
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={handleQuickCheckin}
            >
              &#9993; Submit Quarterly Status Update
            </button>
          </div>
        </div>
        <div className="panel__body">
          {checkinSuccess && (
            <div className="note" style={{ marginBottom: 14, background: '#eef8f2', borderColor: '#146c43', color: '#146c43' }}>
              &#10003; Status check-in recorded! Your record will remain active without escalation.
            </div>
          )}

          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Cycle</th>
                  <th>Channel</th>
                  <th>Declared Status</th>
                  <th>Employer / Detail</th>
                  <th>Evidence Tier</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>2026-Q1</strong></td>
                  <td>WhatsApp Business</td>
                  <td>Employed (Retained)</td>
                  <td>{trainee.employer} (Same salary)</td>
                  <td><EvidenceBadge trust="high" /></td>
                  <td className="muted num">28 Apr 2026</td>
                </tr>
                <tr>
                  <td><strong>2025-Q4</strong></td>
                  <td>WhatsApp Business</td>
                  <td>Employed (3-Month Check)</td>
                  <td>{trainee.employer} (₹14,000)</td>
                  <td><EvidenceBadge trust="high" /></td>
                  <td className="muted num">28 Jan 2026</td>
                </tr>
                <tr>
                  <td><strong>2025-Q3</strong></td>
                  <td>SMS Two-Tap</td>
                  <td>Initial Placement</td>
                  <td>{trainee.employer}</td>
                  <td><EvidenceBadge trust="medium" /></td>
                  <td className="muted num">28 Oct 2025</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
