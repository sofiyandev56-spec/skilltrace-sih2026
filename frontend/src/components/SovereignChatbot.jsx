import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { useGov } from '../gov/GovContext.jsx'
import { api } from '../api/client.js'

export default function SovereignChatbot() {
  const { user, role } = useAuth()
  const { lang, setLang } = useGov()
  const hi = lang === 'hi'

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedAnalysisIdx, setExpandedAnalysisIdx] = useState(null)

  const messagesEndRef = useRef(null)
  const activeRole = role || 'client'

  // Initialize greeting message based on role and language
  useEffect(() => {
    const greeting = getInitialGreeting(activeRole, user, hi)
    setMessages([greeting])
  }, [activeRole, user?.id, hi])

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, isOpen])

  function getInitialGreeting(currentRole, currentUser, isHindi) {
    if (currentRole === 'government') {
      return {
        id: 'initial',
        sender: 'assistant',
        text: isHindi
          ? `🏛️ **नमस्ते अधिकारी महोदय!**\n\nमैं स्किलट्रेस राष्ट्रीय संप्रभु रजिस्ट्री का AI विश्लेषक हूँ। मैं महाराष्ट्र के सभी 36 जिलों के प्रतिधारण आंकड़े, 3-माह के मील के पत्थर, प्रदाता ऑडिट एवं सक्रिय विवादों का वास्तविक समय में स्वतः विश्लेषण कर सकता हूँ। आप क्या जानना चाहते हैं?`
          : `🏛️ **Welcome, Officer ${currentUser?.name ? currentUser.name : ''}!**\n\nI am your National Skill Registry Sovereign AI Analyst. I monitor statewide data across all 36 districts, provider retention rankings, dispute escalations, and DPDPA statutory rules. How may I assist your administrative oversight today?`,
        auto_analysis: {
          intent: 'governance_overview',
          scope: isHindi ? 'राष्ट्रीय प्रशासनिक दायरा (36 जिले)' : 'National Administrative Scope (36 Districts)',
          findings: [
            isHindi ? 'राज्यव्यापी 3-माह प्रतिधारण बेंचमार्क: 68.4%' : 'Statewide 3-month retention benchmark: 68.4%',
            isHindi ? 'सक्रिय निगरानी: 5,000+ प्रशिक्षार्थी एवं 12 मान्यता प्राप्त केंद्र' : 'Live tracking: 5,000+ candidates across 12 accredited centers',
            isHindi ? 'सक्रिय खुले विवाद: 3 (वेतन विसंगति समीक्षाधीन)' : 'Active open disputes: 3 (Wage mismatch under review)'
          ],
          recommended_actions: [
            isHindi ? 'जिलेवार प्रतिधारण तालिका की समीक्षा करें।' : 'Review district-wise provider retention table.',
            isHindi ? 'विवाद अनुभाग में लंबित वेतन साक्ष्य जांचें।' : 'Check pending wage slips in Disputed Records tab.'
          ],
          statutory_policy: 'MSDE Outcome Evaluation Framework 2024'
        }
      }
    } else if (currentRole === 'employer') {
      return {
        id: 'initial',
        sender: 'assistant',
        text: isHindi
          ? `🏢 **नमस्ते नियोक्ता प्रतिनिधि!** मैं आपका कॉर्पोरेट भर्ती एवं 3-माह प्रतिधारण सत्यापन AI सहायक हूँ। आप उम्मीदवारों के 90-दिवसीय सत्यापन के संबंध में प्रश्न पूछ सकते हैं।`
          : `🏢 **Welcome, Corporate Partner!** I assist with verifying candidate 3+ months retention milestones and compliance under MSDE guidelines. How may I help you today?`
      }
    } else {
      // Trainee Citizen
      const traineeName = currentUser?.name || 'Aarti Patil'
      return {
        id: 'initial',
        sender: 'assistant',
        text: isHindi
          ? `👤 **नमस्ते ${traineeName}!** मैं आपका डिजिटल कौशल पासपोर्ट AI सहायक हूँ। आप अपने 3-माह के मील के पत्थर, वेतन रिकॉर्ड, अथवा व्हाट्सएप सत्यापन के बारे में कोई भी प्रश्न पूछ सकते हैं।`
          : `👤 **Hello ${traineeName}!** I am your Digital Skill Passport AI Assistant. Ask me anything about your 3-month milestone, verified salary, WhatsApp surveys, or downloading your credentials.`
      }
    }
  }

  const handleSend = async (queryText = inputValue) => {
    const q = (queryText || '').trim()
    if (!q || loading) return

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q
    }

    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setLoading(true)

    try {
      const response = await api.askChatbot({
        query: q,
        role: activeRole,
        user_id: user?.id || (activeRole === 'client' ? 'TRN-0001' : undefined),
        language: lang
      })

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        auto_analysis: response.auto_analysis
      }

      setMessages((prev) => [...prev, botMsg])
      setExpandedAnalysisIdx(messages.length + 1)
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'assistant',
          text: hi
            ? '⚠️ क्षमा करें, संप्रभु AI इंजन से संपर्क करने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
            : '⚠️ Apologies, an error occurred while analyzing with the Sovereign AI Engine. Please try again.'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Quick suggestion chips tailored to role
  const quickChips = activeRole === 'government'
    ? [
        hi ? '⚙️ प्रणाली कैसे काम करती है?' : '⚙️ How does SkillTrace work for Gov?',
        hi ? '📤 डेटा कैसे दर्ज व ऑडिट होता है?' : '📤 How is outcome data ingested?',
        hi ? '📊 महाराष्ट्र जिलों का 3-माह प्रतिधारण विश्लेषण' : '📊 Analyze 3-month retention across districts',
        hi ? '⚖️ सक्रिय वेतन विवादों का सारांश दें' : '⚖️ Summarize open wage disputes',
        hi ? '🔍 कमजोर प्रशिक्षण केंद्रों का ऑडिट करें' : '🔍 Audit underperforming training centers',
        hi ? '📜 DPDPA 2023 डेटा सुरक्षा नियम समझाएं' : '📜 Explain DPDPA data protection rules'
      ]
    : activeRole === 'employer'
    ? [
        hi ? '⚙️ नियोक्ता पोर्टल कैसे काम करता है?' : '⚙️ How does the employer system work?',
        hi ? '🏢 3-माह माइलस्टोन सत्यापन कैसे करें?' : '🏢 How to verify 3-month retention milestone?',
        hi ? '💼 उम्मीदवार छोड़ने की सूचना कैसे दें?' : '💼 How to report candidate departures?',
        hi ? '📑 कॉर्पोरेट सीएसआर कौशल आवश्यकताएं' : '📑 Corporate CSR skilling requirements'
      ]
    : [
        hi ? '⚙️ यह प्रणाली कैसे काम करती है?' : '⚙️ How does it work?',
        hi ? '📤 डेटा कैसे भेजें?' : '📤 How to send the data?',
        hi ? '💼 मेरा 3-माह का मील का पत्थर क्या है?' : '💼 What is my 3-month milestone status?',
        hi ? '📱 व्हाट्सएप त्रैमासिक सर्वेक्षण कैसे काम करता है?' : '📱 How does the WhatsApp quarterly check-in work?',
        hi ? '📄 मैं अपना सत्यापित प्रमाणपत्र कैसे डाउनलोड करूँ?' : '📄 How do I download my verified PDF credential?',
        hi ? '🔒 मेरी सहमति व डेटा अधिकार क्या हैं?' : '🔒 What are my DPDPA consent rights?'
      ]

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 20px',
            borderRadius: '50px',
            background: 'linear-gradient(135deg, #0b6bcb 0%, #00152f 100%)',
            color: '#ffffff',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 8px 30px rgba(11, 107, 203, 0.45)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px',
            transition: 'all 0.25s ease',
            letterSpacing: '0.3px'
          }}
          aria-label="Open SkillTrace AI Assistant"
        >
          <span style={{
            fontSize: '20px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            🤖
          </span>
          <span>
            {hi
              ? activeRole === 'government' ? 'प्रशासन AI विश्लेषक' : 'कौशल मित्र AI सहायक'
              : activeRole === 'government' ? 'Sovereign AI Analyst' : 'SkillTrace AI Assistant'}
          </span>
          <span style={{
            background: '#22c55e',
            color: '#ffffff',
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '10px',
            textTransform: 'uppercase',
            fontWeight: 800
          }}>
            {activeRole === 'government' ? 'GOV' : 'CITIZEN'}
          </span>
        </button>
      )}

      {/* Floating Chat Modal / Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '340px',
            maxWidth: 'calc(100vw - 32px)',
            height: '430px',
            maxHeight: 'calc(100vh - 40px)',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 21, 47, 0.1)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          role="dialog"
          aria-label="SkillTrace Sovereign AI Chatbot"
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #00152f 0%, #0a2540 100%)',
            color: '#ffffff',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '3px solid #ff9933'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>
                🏛️
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.2 }}>
                  {hi ? 'स्किलट्रेस संप्रभु AI सहायक' : 'SkillTrace Sovereign AI Assistant'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  {activeRole === 'government'
                    ? (hi ? 'प्रशासनिक विश्लेषण इंजन सक्रिय' : 'National Oversight Engine Active')
                    : (hi ? 'नागरिक डिजिटल कौशल गाइड सक्रिय' : 'Citizen Digital Passport Guide Active')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Language Switcher */}
              <button
                type="button"
                onClick={() => setLang(hi ? 'en' : 'hi')}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
                title={hi ? 'Switch to English' : 'हिंदी में बदलें'}
              >
                {hi ? 'English' : 'हिंदी'}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1
                }}
                aria-label="Close Assistant"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Role Context Bar */}
          <div style={{
            background: activeRole === 'government' ? '#f0fdf4' : '#eff6ff',
            borderBottom: '1px solid #e2e8f0',
            padding: '6px 14px',
            fontSize: '11px',
            color: activeRole === 'government' ? '#166534' : '#1e3a8a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600
          }}>
            <span>
              {activeRole === 'government'
                ? (hi ? '🏛️ प्रशासन मोड: 36 जिले · संपूर्ण रजिस्ट्री अधिकार' : '🏛️ Gov Mode: 36 Districts · Full Registry Oversight')
                : (hi ? `👤 नागरिक मोड: ${user?.name || 'प्रशिक्षार्थी'} (${user?.id || 'TRN-0001'})` : `👤 Trainee Mode: ${user?.name || 'Aarti Patil'} (${user?.id || 'TRN-0001'})`)}
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              DPDPA 2023 Compliant
            </span>
          </div>

          {/* Chat Messages List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: '#f8fafc'
          }}>
            {messages.map((msg, index) => (
              <div
                key={msg.id || index}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{
                  padding: '12px 14px',
                  borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  background: msg.sender === 'user' ? '#0b6bcb' : '#ffffff',
                  color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                background: '#ffffff',
                padding: '10px 14px',
                borderRadius: '14px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
                fontSize: '12px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <span className="spinner" style={{ width: '12px', height: '12px', display: 'inline-block' }} />
                <span>{hi ? 'संप्रभु रजिस्ट्री डेटा का विश्लेषण जारी…' : 'Analyzing Sovereign Registry Data…'}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestion Chips */}
          <div style={{
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            padding: '8px 12px',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '16px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  color: '#334155',
                  cursor: 'pointer',
                  fontWeight: 500,
                  flexShrink: 0
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            style={{
              padding: '12px 14px',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                hi
                  ? activeRole === 'government' ? 'कोई भी सरकारी विश्लेषणात्मक प्रश्न पूछें…' : 'अपने कौशल, वेतन या WhatsApp चेक-इन बारे में पूछें…'
                  : activeRole === 'government' ? 'Ask any sovereign oversight or district query…' : 'Ask about your 3-mo milestone, WhatsApp, salary…'
              }
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                background: '#f8fafc'
              }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              style={{
                background: inputValue.trim() ? '#0b6bcb' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: inputValue.trim() ? 'pointer' : 'default',
                transition: 'background 0.15s ease'
              }}
            >
              {hi ? 'पूछें' : 'Ask'}
            </button>
          </form>
        </div>
      )}
    </>
  )
}
