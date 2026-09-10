/**
 * SkillTrace Chatbot Language & Translation Engine
 *
 * Supports:
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

/**
 * Multi-language string bundle for system messages and UI
 */
export const I18N_STRINGS = {
  en: {
    adminTitle: 'AI Admin Analytics Assistant',
    clientTitle: 'AI Skill & Support Assistant',
    online: 'Online',
    typePlaceholder: 'Ask a question in English, हिन्दी, or मराठी...',
    send: 'Send',
    clear: 'Clear Chat',
    listening: 'Listening... Speak now',
    micError: 'Microphone access unavailable or denied',
    suggestedHeader: 'Suggested Questions',
    fallback: "I'm sorry, I couldn't find enough information to answer that accurately. Please contact our support team at {0}.",
    clientRestricted: 'Access Restricted: As a trainee, you can only access your own skilling profile and platform guides. You are not authorized to view other trainees\' records.',
    traineeNotFound: "Sorry, I couldn't find a trainee with ID {0}. Please check the ID and try again.",
    noDataAvailable: 'Data is temporarily unavailable for this request.',
    thinking: 'Analyzing SkillTrace data...',
  },
  hi: {
    adminTitle: 'एआई एडमिन एनालिटिक्स सहायक',
    clientTitle: 'एआई कौशल और सहायता सहायक',
    online: 'सक्रिय (Online)',
    typePlaceholder: 'अंग्रेजी, हिन्दी या मराठी में सवाल पूछें...',
    send: 'भेजें',
    clear: 'चैट साफ करें',
    listening: 'सुन रहा हूँ... कृपया बोलिए',
    micError: 'माइक्रोफ़ोन अनुपलब्ध है या अनुमति नहीं मिली',
    suggestedHeader: 'सुझाए गए प्रश्न',
    fallback: 'क्षमा करें, मुझे इस सवाल का सटीक उत्तर देने के लिए पर्याप्त जानकारी नहीं मिली। कृपया हमारी सहायता टीम से {0} पर संपर्क करें।',
    clientRestricted: 'पहुंच प्रतिबंधित: एक शिक्षार्थी के रूप में, आप केवल अपनी जानकारी और सामान्य मार्गदर्शन देख सकते हैं। अन्य शिक्षार्थियों के रिकॉर्ड देखने की अनुमति नहीं है।',
    traineeNotFound: 'क्षमा करें, मुझे आईडी {0} वाला कोई प्रशिक्षु नहीं मिला। कृपया आईडी जांचें और पुनः प्रयास करें।',
    noDataAvailable: 'इस अनुरोध के लिए डेटा वर्तमान में उपलब्ध नहीं है।',
    thinking: 'स्किलट्रेस डेटा का विश्लेषण हो रहा है...',
  },
  mr: {
    adminTitle: 'एआय ॲडमिन ॲनालिटिक्स सहाय्यक',
    clientTitle: 'एआय कौशल्य आणि सहाय्यक',
    online: 'सक्रिय (Online)',
    typePlaceholder: 'इंग्रजी, मराठी किंवा हिंदीमध्ये प्रश्न विचारा...',
    send: 'पाठवा',
    clear: 'चॅट साफ करा',
    listening: 'ऐकत आहे... बोला',
    micError: 'मायक्रोफोन उपलब्ध नाही किंवा परवानगी नाकारली',
    suggestedHeader: 'सुचवलेले प्रश्न',
    fallback: 'क्षमस्व, मला याचे अचूक उत्तर देण्यासाठी पुरेशी माहिती मिळाली नाही. कृपया आमच्या सहाय्यता केंद्राशी {0} वर संपर्क साधा.',
    clientRestricted: 'प्रवेश मर्यादित: प्रशिक्षणार्थी म्हणून तुम्ही फक्त तुमची स्वतःची माहिती आणि मार्गदर्शक सूचना पाहू शकता. इतर प्रशिक्षणार्थींची माहिती पाहण्याची परवानगी नाही.',
    traineeNotFound: 'क्षमस्व, मला आयडी {0} असलेला कोणताही प्रशिक्षणार्थी आढळला नाही. कृपया आयडी तपासा आणि पुन्हा प्रयत्न करा.',
    noDataAvailable: 'या विनंतीसाठी डेटा सध्या उपलब्ध नाही.',
    thinking: 'कौशल्य डेटाचे विश्लेषण करत आहे...',
  },
}

export function getTranslation(lang, key, ...args) {
  const norm = normalizeLanguage(lang)
  const dict = I18N_STRINGS[norm] || I18N_STRINGS.en
  let text = dict[key] || I18N_STRINGS.en[key] || key
  if (args.length > 0 && typeof text === 'string') {
    args.forEach((val, i) => {
      text = text.replace(new RegExp(`\\{${i}\\}`, 'g'), val)
    })
  }
  return text
}
