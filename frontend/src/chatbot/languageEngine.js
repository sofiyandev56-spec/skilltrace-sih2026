/**
 * Detects which language a question was asked in.
 *
 * This is deliberately NOT a translation layer — the strings the chatbot
 * shows live in gov/i18n.js with every other string in the product. What
 * this adds is the one thing the shared dictionary cannot do: work out,
 * from the text itself, which language to answer in.
 *
 * Recognises:
 * - English (en)
 * - Hindi in Devanagari (hi)
 * - Marathi in Devanagari (mr)
 * - Hinglish (Latin script Hindi)
 * - Marathi written in Latin script
 *
 * Provides automatic language detection and responses in the matching language.
 */

// Devanagari Unicode block regex
const DEVANAGARI_REGEX = /[\u0900-\u097F]/

// Specific Marathi keywords in Devanagari
const MARATHI_DEVANAGARI_WORDS = [
  'आहे', 'नाही', 'कसे', 'कशी', 'काय', 'माझे', 'माझी', 'माझा',
  'कौशल्य', 'प्रशिक्षण', 'द्या', 'सांगा', 'सांग', 'प्रदाते', 'संस्था',
  'कुठे', 'कधी', 'किती', 'करावे', 'सुधारता', 'माहिती', 'विद्यार्थी'
]

// Specific Hindi keywords in Devanagari
const HINDI_DEVANAGARI_WORDS = [
  'है', 'नहीं', 'कैसे', 'क्या', 'मेरा', 'मेरी', 'मेरे', 'बताओ',
  'चाहिए', 'कौशल', 'नौकरी', 'प्रदाता', 'कहाँ', 'कब', 'कितने',
  'करना', 'सुधार', 'जानकारी', 'प्रशिक्षु', 'समझाओ'
]

// Common Hinglish tokens
const HINGLISH_WORDS = [
  'mujhe', 'batao', 'kya', 'kaise', 'karna', 'chahiye', 'kaunsa', 'kaunsi',
  'mera', 'meri', 'mere', 'hain', 'hai', 'karo', 'dekhna', 'sikhna', 'kurs',
  'sikhao', 'kare', 'hum', 'aapka', 'samjhao', 'dikhao'
]

// Common Marathi transliterated in Latin tokens
const MARATHI_LATIN_WORDS = [
  'majhi', 'majha', 'majhe', 'kashi', 'kasa', 'sang', 'sangaa', 'aahe',
  'nahi', 'kiti', 'kuthe', 'kaay', 'kay', 'madhe', 'karaycha', 'mahiti',
  'sudharta', 'shikaycha'
]

/**
 * Detect language of a user prompt.
 * Returns: 'en' | 'hi' | 'mr' | 'hinglish' | 'marathi_latin'
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en'
  const lower = text.toLowerCase().trim()

  if (DEVANAGARI_REGEX.test(text)) {
    let mrScore = 0
    let hiScore = 0
    MARATHI_DEVANAGARI_WORDS.forEach((w) => {
      if (text.includes(w)) mrScore += 2
    })
    HINDI_DEVANAGARI_WORDS.forEach((w) => {
      if (text.includes(w)) hiScore += 2
    })
    return mrScore > hiScore ? 'mr' : 'hi'
  }

  // Latin script detection
  const words = lower.split(/[\s,?.!]+/)
  let hinglishScore = 0
  let marathiLatinScore = 0

  words.forEach((w) => {
    if (HINGLISH_WORDS.includes(w)) hinglishScore += 2
    if (MARATHI_LATIN_WORDS.includes(w)) marathiLatinScore += 2
  })

  if (marathiLatinScore >= 2 && marathiLatinScore >= hinglishScore) {
    return 'marathi_latin'
  }
  if (hinglishScore >= 2) {
    return 'hinglish'
  }

  return 'en'
}

/**
 * Maps granular detected language to primary display language code: 'en' | 'hi' | 'mr'
 */
export function normalizeLanguage(lang) {
  if (lang === 'hi' || lang === 'hinglish') return 'hi'
  if (lang === 'mr' || lang === 'marathi_latin') return 'mr'
  return 'en'
}
