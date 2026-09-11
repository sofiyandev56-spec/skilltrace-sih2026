import React, { useState, useEffect, useRef } from 'react'
import { processQuery, clearSessionMemory } from './aiEngine.js'
import { SUPPORTED_LANGUAGES, SUGGESTIONS } from './config.js'
import { detectLanguage, normalizeLanguage } from './languageEngine.js'
import { useGov } from '../gov/GovContext.jsx'
import { translate } from '../gov/i18n.js'
import { MOCK_HELPLINE_NUMBER } from './config.js'

/**
 * Lightweight in-memory Markdown-to-JSX renderer
 * Parses headings (###), bold (**text**), bullet points (* ), numbered lists (1. ),
 * and Markdown tables (| Col 1 | Col 2 |) safely without heavy external dependencies.
 */
function renderMarkdown(content) {
  if (!content) return null

  // Check if content contains markdown table
  const lines = content.split('\n')
  const elements = []
  let tableBuffer = []
  let listBuffer = []
  let listType = null // 'ul' | 'ol'

  const flushList = () => {
    if (listBuffer.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`}>
            {listBuffer.map((item, idx) => (
              <li key={idx}>{parseInlineFormatting(item)}</li>
            ))}
          </ol>
        )
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`}>
            {listBuffer.map((item, idx) => (
              <li key={idx}>{parseInlineFormatting(item)}</li>
            ))}
          </ul>
        )
      }
      listBuffer = []
      listType = null
    }
  }

  const flushTable = () => {
    if (tableBuffer.length >= 2) {
      const headerLine = tableBuffer[0]
      const rowLines = tableBuffer.slice(2) // skip separator line |:---|:---|

      const parseCells = (line) =>
        line
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim())

      const headers = parseCells(headerLine)
      const rows = rowLines.map(parseCells)

      elements.push(
        <div key={`table-wrapper-${elements.length}`} style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i}>{parseInlineFormatting(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx}>{parseInlineFormatting(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      tableBuffer = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Table line detector
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList()
      tableBuffer.push(trimmed)
      continue
    } else if (tableBuffer.length > 0) {
      flushTable()
    }

    // Heading
    if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(
        <h3 key={`h3-${i}`}>{parseInlineFormatting(trimmed.replace('### ', ''))}</h3>
      )
      continue
    }

    // Unordered List
    if (trimmed.startsWith('* ') || trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listBuffer.push(trimmed.slice(2))
      continue
    }

    // Ordered List
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
    if (olMatch) {
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listBuffer.push(olMatch[2])
      continue
    }

    // Empty line or paragraph
    flushList()
    if (trimmed.length > 0) {
      elements.push(<p key={`p-${i}`}>{parseInlineFormatting(trimmed)}</p>)
    }
  }

  flushList()
  flushTable()

  return <div className="st-markdown">{elements}</div>
}

/**
 * Handles inline bolding **text** and `code`
 */
function parseInlineFormatting(str) {
  if (typeof str !== 'string') return str
  // Split on **bold**
  const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="mono" style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 3 }}>
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

export default function ChatbotPanel({
  onClose,
  role = 'ministry',
  currentUserId = null,
  filters = {},
  pageContext = 'dashboard',
}) {
  const { t } = useGov()

  const [messages, setMessages] = useState(() => [
    {
      id: 'init-1',
      sender: 'bot',
      textKey: role === 'ministry' ? 'cbGreetingMinistry' : 'cbGreetingClient',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [userLang, setUserLang] = useState('auto')

  /**
   * Which language to answer in. 'auto' reads it off the question itself, so
   * someone can type Hinglish into an English interface and be answered in
   * Hindi; an explicit pick always wins.
   */
  const answerLang = (text) =>
    userLang === 'auto' ? normalizeLanguage(detectLanguage(text)) : normalizeLanguage(userLang)
  const [isListening, setIsListening] = useState(false)
  const [micAvailable, setMicAvailable] = useState(true)

  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)

  // Scroll conversation to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  // Context-aware suggested questions
  const suggestions =
    role === 'ministry'
      ? SUGGESTIONS.ministry[pageContext] || SUGGESTIONS.ministry.dashboard
      : SUGGESTIONS.client[pageContext] || SUGGESTIONS.client.dashboard

  // Initialize Web Speech API for voice / microphone
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setMicAvailable(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = userLang === 'mr' ? 'mr-IN' : userLang === 'hi' ? 'hi-IN' : 'en-IN'

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        if (transcript) {
          setInput(transcript)
          handleSend(transcript)
        }
        setIsListening(false)
      }

      recognition.onerror = () => {
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    } catch {
      setMicAvailable(false)
    }
  }, [userLang])

  const toggleListening = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const handleSend = async (manualText) => {
    const textToSend = manualText || input
    if (!textToSend.trim() || isTyping) return

    const userMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      const botResponseText = await processQuery({
        query: textToSend.trim(),
        role,
        currentUserId,
        filters,
        userLang,
        pageContext,
      })

      const botMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: translate(answerLang(textToSend), 'cbFallback', MOCK_HELPLINE_NUMBER),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    clearSessionMemory()
    setMessages([
      {
        id: `reset-${Date.now()}`,
        sender: 'bot',
        text:
          role === 'ministry'
            ? 'Conversation cleared. How can I assist with SkillTrace analytics?'
            : 'Conversation cleared. How can I assist with your skilling journey?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  const botTitle =
    role === 'ministry'
      ? t('cbAdminTitle')
      : t('cbClientTitle')

  return (
    <div
      className="st-chatbot-panel"
      role="dialog"
      aria-label={botTitle}
      aria-modal="true"
    >
      {/* Header */}
      <div className="st-chatbot-header">
        <div className="st-chatbot-header__top">
          <div className="st-chatbot-header__title-group">
            <div className="st-chatbot-header__avatar" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <circle cx="12" cy="5" r="2" />
                <path d="M12 7v4" />
                <line x1="8" y1="16" x2="8" y2="16" />
                <line x1="16" y1="16" x2="16" y2="16" />
              </svg>
            </div>
            <div>
              <h2 className="st-chatbot-header__title">{botTitle}</h2>
              <span className="st-chatbot-header__sub">
                <span className="st-chatbot-header__status-dot" aria-hidden="true" />
                {t('cbOnline')} · SkillTrace Intelligence
              </span>
            </div>
          </div>
          <div className="st-chatbot-header__actions">
            <button
              type="button"
              className="st-chatbot-header__btn"
              onClick={handleClear}
              title={t('cbClear')}
              aria-label={t('cbClear')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
            <button
              type="button"
              className="st-chatbot-header__btn"
              onClick={onClose}
              title={t('cbCloseAssistant')}
              aria-label={t('cbCloseAssistant')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Language selector & Role badge */}
        <div className="st-chatbot-header__meta">
          <span className="st-chatbot-role-chip">
            {t(role === 'ministry' ? 'cbModeMinistry' : 'cbModeClient')}
          </span>
          <div className="st-chatbot-lang-select" role="radiogroup" aria-label={t('language')}>
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                className={`st-chatbot-lang-btn ${userLang === l.code ? 'is-active' : ''}`}
                onClick={() => setUserLang(l.code)}
                aria-checked={userLang === l.code}
                role="radio"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conversation Messages */}
      <div className="st-chatbot-body" role="log" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`st-msg st-msg--${m.sender}`}>
            <div className="st-msg__avatar" aria-hidden="true">
              {m.sender === 'user' ? 'U' : 'AI'}
            </div>
            <div>
              <div className="st-msg__bubble">{renderMarkdown(m.textKey ? t(m.textKey) : m.text)}</div>
              <div className="st-msg__time">{m.timestamp}</div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="st-msg st-msg--bot">
            <div className="st-msg__avatar" aria-hidden="true">AI</div>
            <div className="st-typing" aria-label={t('cbThinking')}>
              <span className="st-typing__dot" />
              <span className="st-typing__dot" />
              <span className="st-typing__dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="st-suggestions" role="toolbar" aria-label="Suggested Questions">
        {suggestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            className="st-suggestion-chip"
            onClick={() => handleSend(q)}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Footer */}
      <div className="st-chatbot-footer">
        {micAvailable && (
          <button
            type="button"
            className={`st-chatbot-btn-mic ${isListening ? 'is-listening' : ''}`}
            onClick={toggleListening}
            title={isListening ? t('cbListening') : t('cbVoiceInput')}
            aria-label={isListening ? t('cbListening') : t('cbVoiceInput')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        )}

        <input
          type="text"
          className="st-chatbot-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('cbTypePlaceholder')}
          aria-label="Ask SkillTrace Assistant"
        />

        <button
          type="button"
          className="st-chatbot-btn-send"
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
          aria-label="Send message"
        >
          <span>{t('cbSend')}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
