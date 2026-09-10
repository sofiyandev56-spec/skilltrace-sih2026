import React, { useEffect, useRef } from 'react'
import { useAuth } from './AuthContext.jsx'
import { useGov } from '../gov/GovContext.jsx'

export default function AuthModal() {
  const { lang } = useGov()
  const hi = lang === 'hi'
  const {
    modalState,
    closeLogin,
    setActiveTab,
    loginGoogle,
    loginGoogleCredential,
    GOOGLE_CLIENT_ID,
  } = useAuth()

  const activeTab = modalState.activeTab || 'government'

  if (!modalState.isOpen) return null

  return (
    <div className="gov-modal-backdrop" onClick={closeLogin} role="dialog" aria-modal="true">
      <div className="auth-modal auth-modal--tabs" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Government Header */}
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
              <span className="auth-modal__country">
                {hi ? 'भारत सरकार · कौशल विकास एवं उद्यमिता मंत्रालय' : 'GOVERNMENT OF INDIA · MSDE'}
              </span>
            </div>
            <div className="auth-modal__title">
              {hi ? 'स्किलट्रेस एकीकृत डिजिटल प्रवेशद्वार' : 'SkillTrace Unified Digital Gateway'}
            </div>
          </div>
          <button
            type="button"
            className="gov-modal__close"
            onClick={closeLogin}
            aria-label={hi ? 'प्रमाणीकरण विंडो बंद करें' : 'Close authentication window'}
          >
            &times;
          </button>
        </div>

        {/* Multi-Portal Role Tabs */}
        <div className="auth-tabs-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'government'}
            className={`auth-tab ${activeTab === 'government' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('government')}
          >
            <span className="auth-tab__icon">🏛️</span>
            <span className="auth-tab__text">
              <strong>{hi ? 'प्रशासन पोर्टल' : 'Government Portal'}</strong>
              <small>{hi ? 'एमएसडीई एवं जिला अधिकारी' : 'MSDE & District Officers'}</small>
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'client'}
            className={`auth-tab ${activeTab === 'client' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('client')}
          >
            <span className="auth-tab__icon">👤</span>
            <span className="auth-tab__text">
              <strong>{hi ? 'प्रशिक्षार्थी पोर्टल' : 'User / Trainee Portal'}</strong>
              <small>{hi ? 'डिजिटल कौशल पासपोर्ट' : 'Digital Skill Passport'}</small>
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'employer'}
            className={`auth-tab ${activeTab === 'employer' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('employer')}
          >
            <span className="auth-tab__icon">🏢</span>
            <span className="auth-tab__text">
              <strong>{hi ? 'नियोक्ता पोर्टल' : 'Employer Portal'}</strong>
              <small>{hi ? '3-माह माइलस्टोन सत्यापन' : '3-Mo Milestone Verification'}</small>
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="auth-modal__body">
          {modalState.error && (
            <div className="auth-error-banner" role="alert">
              <span aria-hidden="true">&#9888;</span>
              <span>{modalState.error}</span>
            </div>
          )}

          {/* Role DPDPA Safeguard Notification */}
          <div className="auth-restriction-note">
            <span className="auth-restriction-note__badge">
              {activeTab === 'government' && (hi ? 'पूर्ण राष्ट्रीय दायरा' : 'Full National Scope')}
              {activeTab === 'client' && (hi ? 'DPDPA 2023 केवल स्वयं का रिकॉर्ड' : 'DPDPA 2023 Self-Record Only')}
              {activeTab === 'employer' && (hi ? 'कंपनी-विशिष्ट अभ्यर्थी दायरा' : 'Company-Specific Candidate Scope')}
            </span>
            <p>
              {activeTab === 'government' &&
                (hi
                  ? 'डेटा प्रतिबंध: सभी 36 जिलों, प्रशिक्षण प्रदाताओं, अनुवर्ती कतारों एवं विवाद निस्तारण के राज्यव्यापी आंकड़ों का मूल्यांकन।'
                  : 'Data Restriction: Evaluates statewide metrics across all 36 districts, training providers, follow-up queues & dispute escalations.')}
              {activeTab === 'client' &&
                (hi
                  ? 'डेटा प्रतिबंध: कड़ाई से केवल आपकी व्यक्तिगत पहचान तक सीमित। अन्य नागरिकों के रिकॉर्ड पूरी तरह सुरक्षित एवं अदृश्य।'
                  : 'Data Restriction: Strictly bound to your verified trainee identity. Other citizen records remain redacted.')}
              {activeTab === 'employer' &&
                (hi
                  ? 'डेटा प्रतिबंध: केवल आपकी पंजीकृत कॉर्पोरेट इकाई में कार्यरत अथवा प्रशिक्षु अभ्यर्थियों तक सीमित।'
                  : 'Data Restriction: Restricted solely to candidates employed or apprenticed with your registered corporate entity.')}
            </p>
          </div>

          {/* Google Only Authentication Card */}
          <div className="auth-google-box">
            <div className="auth-google-box__header">
              <div className="auth-google-box__badge">
                <span className="auth-google-box__badge-dot"></span>
                {activeTab === 'government'
                  ? hi ? 'प्रशासनिक लॉगिन' : 'Government SSO'
                  : activeTab === 'employer'
                  ? hi ? 'कॉर्पोरेट सत्यापन लॉगिन' : 'Employer SSO'
                  : hi ? 'प्रशिक्षार्थी लॉगिन' : 'Trainee SSO'}
              </div>
              <h3 className="auth-google-box__title">
                {hi ? 'Google खाते से साइन इन करें' : 'Sign In with Google'}
              </h3>
              <p className="auth-google-box__subtitle">
                {hi
                  ? `अपने अधिकृत Google खाते का उपयोग कर ${
                      activeTab === 'government'
                        ? 'प्रशासन पोर्टल'
                        : activeTab === 'employer'
                        ? 'नियोक्ता पोर्टल'
                        : 'प्रशिक्षार्थी पोर्टल'
                    } में सुरक्षित प्रवेश करें।`
                  : `Authenticate securely using your Google account to access the ${
                      activeTab === 'government'
                        ? 'Government Portal'
                        : activeTab === 'employer'
                        ? 'Employer Portal'
                        : 'Trainee Portal'
                    }.`}
              </p>
            </div>

            <div className="auth-google-box__actions" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              {/* Single Official Google SSO Button */}
              <button
                type="button"
                className="auth-btn auth-btn--google auth-btn--google-primary"
                onClick={() => loginGoogle(activeTab)}
                disabled={modalState.loading}
                style={{
                  width: '100%',
                  maxWidth: 360,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  cursor: modalState.loading ? 'not-allowed' : 'pointer'
                }}
              >
                <svg className="auth-btn__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
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
                <span>
                  {modalState.loading
                    ? hi
                      ? 'Google से प्रमाणीकरण जारी…'
                      : 'Connecting to Google…'
                    : hi
                    ? 'Google के साथ जारी रखें'
                    : 'Continue with Google'}
                </span>
              </button>
            </div>

            <div className="auth-google-box__footer">
              <div className="auth-google-box__security-badge">
                <span className="auth-google-box__lock">🔒</span>
                <span>
                  {hi
                    ? 'डीपीडीपीए 2023 अनुपालित · पासवर्ड-मुक्त सुरक्षित एकल साइन-ऑन (SSO)'
                    : 'DPDPA 2023 Compliant · Passwordless Secure Single Sign-On (SSO)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
