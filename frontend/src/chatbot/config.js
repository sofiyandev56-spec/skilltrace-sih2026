/**
 * SkillTrace AI Chatbot Configuration
 *
 * Configurable via Vite environment variables or falls back to standard defaults.
 * Uses a safe architecture with zero hard-coded API credentials.
 */

const getEnv = (key, fallback) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
      return import.meta.env[key]
    }
    if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
      return process.env[key]
    }
  } catch {
    /* ignore */
  }
  return fallback
}

export const MOCK_HELPLINE_NUMBER = getEnv('VITE_MOCK_HELPLINE_NUMBER', '1800-XXX-XXXX')

export const AI_CONFIG = {
  provider: getEnv('VITE_AI_PROVIDER', 'internal'), // 'internal' | 'gemini' | 'openai'
  apiUrl: getEnv('VITE_AI_API_URL', ''),
  apiKey: getEnv('VITE_AI_API_KEY', ''),
  model: getEnv('VITE_AI_MODEL', 'gemini-1.5-flash'),
  helpline: MOCK_HELPLINE_NUMBER,
}

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: 'Auto' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
]

export const SUGGESTIONS = {
  ministry: {
    dashboard: [
      'Summarise this dashboard',
      'How many providers are there?',
      'Which provider has the best employment rate?',
      'Show me the top 5 providers',
      'Explain the employment graph',
      'Find trainee TRN000001',
      'What are the major skill gaps?',
    ],
    providers: [
      'Compare all providers',
      'Which provider has the highest employment rate?',
      'Which provider has the lowest employment rate?',
      'Rank all providers by employment rate',
      'Compare providers based on employment and completion rate',
    ],
    skillGap: [
      'Explain the skill gap chart',
      'Which category has the highest skill gap?',
      'Which courses have the highest mismatch?',
      'Summarise skill gap by district',
    ],
    disputes: [
      'How many active disputes are there?',
      'Explain why records are disputed',
      'How are disputes resolved?',
    ],
    followup: [
      'How many trainees are in the follow-up queue?',
      'Why are trainees in the follow-up queue?',
      'How does field officer assignment work?',
    ],
  },
  client: {
    dashboard: [
      'What are my skill gaps?',
      'What training should I take?',
      'Where can I see my training status?',
      'Explain my assessment',
      'How can I improve my employment chances?',
      'How do I complete my training?',
    ],
    consent: [
      'What is consent management?',
      'How do I withdraw consent?',
      'What happens if I withdraw my consent?',
    ],
    checkin: [
      'How does check-in work?',
      'Why is the 3-month milestone important?',
      'How do I confirm my employment?',
    ],
  },
}
