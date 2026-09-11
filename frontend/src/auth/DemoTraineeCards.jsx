import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { useGov } from '../gov/GovContext.jsx'

export default function DemoTraineeCards({ onSelect }) {
  const { loginDemoTrainee } = useAuth()
  const { lang } = useGov()
  const navigate = useNavigate()
  const [loadingId, setLoadingId] = useState(null)

  const handleDemoLogin = async (id) => {
    setLoadingId(id)
    try {
      await loginDemoTrainee(id)
      if (onSelect) onSelect()
      navigate('/client')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="demo-trainees-box" aria-label="Demo Trainee Accounts">
      <div className="demo-trainees-box__head">
        <div className="demo-trainees-box__title-row">
          <span className="demo-trainees-box__badge">DEMO ACCESS</span>
          <h4 className="demo-trainees-box__title">Demo Trainees</h4>
        </div>
        <p className="demo-trainees-box__disclaimer">
          Demo access — for prototype/hackathon demonstration only.
        </p>
      </div>

      <div className="demo-trainees-grid">
        {/* Demo Trainee 1 */}
        <div className="demo-card">
          <div className="demo-card__tag">Demo Trainee 1</div>
          <div className="demo-card__name">Aarti Patil</div>
          <div className="demo-card__status demo-card__status--employed">
            Certified • Employed
          </div>
          <div className="demo-card__desc">
            Healthcare Assistant · Sanjeevani Hospital
            <span className="demo-card__meta">Verified 3+ months · ₹16,500/mo</span>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--block demo-card__btn"
            onClick={() => handleDemoLogin('TRN-0001')}
            disabled={Boolean(loadingId)}
            aria-label="Continue as Aarti Patil"
          >
            {loadingId === 'TRN-0001' ? 'Loading…' : 'Continue as Aarti'}
          </button>
        </div>

        {/* Demo Trainee 2 */}
        <div className="demo-card">
          <div className="demo-card__tag demo-card__tag--alt">Demo Trainee 2</div>
          <div className="demo-card__name">Rahul Sharma</div>
          <div className="demo-card__status demo-card__status--followup">
            Certified • Employment Follow-up
          </div>
          <div className="demo-card__desc">
            Solar Technician · GreenVolt Solar Solutions
            <span className="demo-card__meta">Awaiting 3-month milestone check-in</span>
          </div>
          <button
            type="button"
            className="btn btn--accent btn--block demo-card__btn"
            onClick={() => handleDemoLogin('TRN-0004')}
            disabled={Boolean(loadingId)}
            aria-label="Continue as Rahul Sharma"
          >
            {loadingId === 'TRN-0004' ? 'Loading…' : 'Continue as Rahul'}
          </button>
        </div>
      </div>
    </div>
  )
}
