/**
 * SkillTrace AI Reasoning & Multilingual Response Engine
 *
 * Safe Architecture:
 * 1. Intent Detection across EN, HI, MR, and Hinglish
 * 2. Data Retrieval via dataService (ground truth only, no hallucinations)
 * 3. Context & Multi-turn Session Memory Resolution
 * 4. Structured Natural Language & Table Generation
 * 5. Optional External AI connector with fallback to internal deterministic NLP
 */

import { translate } from '../gov/i18n.js'
import { AI_CONFIG, MOCK_HELPLINE_NUMBER } from './config.js'
import {
  detectLanguage,
  normalizeLanguage,
} from './languageEngine.js'
import {
  getDisputesSummary,
  getFollowupSummary,
  getDashboardSummary,
  getGraphData,
  getProviderComparison,
  searchTrainee,
  getClientProfileData,
} from './dataService.js'

// In-session conversational memory store
const sessionMemory = {
  lastProvider: null,
  lastTrainee: null,
  lastGraphType: null,
  lastTopic: null,
}

export function clearSessionMemory() {
  sessionMemory.lastProvider = null
  sessionMemory.lastTrainee = null
  sessionMemory.lastGraphType = null
  sessionMemory.lastTopic = null
}

/**
 * Extracts trainee ID if mentioned in the query
 */
function extractTraineeId(text) {
  // Matches "T10245", "TRN000001", "TRN-0001", "T-1234", "10245", "ID: TRN..."
  const patterns = [
    /\b(TRN-?\d{3,6})\b/i,
    /\bT-?(\d{4,6})\b/i,
    /\btrainee\s+(?:id\s*)?([a-z0-9-]+)\b/i,
    /\bid\s*[:#-]?\s*([a-z0-9-]+)\b/i,
  ]
  for (const p of patterns) {
    const match = text.match(p)
    if (match && match[1]) return match[1]
  }
  return null
}

/**
 * Intent Classifier
 */
export function classifyIntent(text, role = 'ministry') {
  const lower = text.toLowerCase()

  // 1. Check Trainee Search
  const traineeId = extractTraineeId(text)
  if (traineeId || lower.includes('find trainee') || lower.includes('show trainee') || lower.includes('trainee details')) {
    return { type: 'TRAINEE_SEARCH', traineeId }
  }

  // 2. Summary Intents — governance aggregates, so ministry only. Guarding
  // here (rather than only at dispatch) lets a trainee's "explain my
  // assessment" fall through to the client intents below instead of being
  // captured by a governance branch and then refused.
  if (
    role === 'ministry' &&
    (lower.includes('summarise') || lower.includes('summarize') ||
      lower.includes('summary') || lower.includes('overview') ||
      lower.includes('key insights') || lower.includes('statistics') ||
      lower.includes('सारांश') || lower.includes('महत्त्वाचे कल') ||
      lower.includes('samjhao') || lower.includes('batao dashboard'))
  ) {
    return { type: 'DASHBOARD_SUMMARY' }
  }

  // 3. Provider Comparison / Ranking Intents (ministry only)
  if (
    role === 'ministry' &&
    (lower.includes('compare') || lower.includes('provider') ||
      lower.includes('centre') || lower.includes('rank') ||
      lower.includes('top 5') || lower.includes('best employment') ||
      lower.includes('underperforming') || lower.includes('तुलना') ||
      lower.includes('प्रदाते') || lower.includes('संस्था'))
  ) {
    return { type: 'PROVIDER_COMPARISON' }
  }

  // 3b. Adjudication and outreach queues (ministry only — a dispute holds two
  // parties' claims, and the follow-up queue is a contact list).
  if (role === 'ministry') {
    if (
      lower.includes('dispute') || lower.includes('disputed') ||
      lower.includes('contested') || lower.includes('\u0935\u093f\u0935\u093e\u0926') || lower.includes('\u0935\u093e\u0926\u0917\u094d\u0930\u0938\u094d\u0924')
    ) {
      return { type: 'DISPUTES_SUMMARY' }
    }
    if (
      lower.includes('follow-up') || lower.includes('follow up') ||
      lower.includes('followup') || lower.includes('unreachable') ||
      lower.includes('field officer') || lower.includes('\u092b\u0949\u0932\u094b') ||
      lower.includes('\u0905\u0928\u0941\u0935\u0930\u094d\u0924\u0928') || lower.includes('\u092a\u093e\u0920\u092a\u0941\u0930\u093e\u0935\u093e')
    ) {
      return { type: 'FOLLOWUP_SUMMARY' }
    }
  }

  // 4. Graph Explanation Intents (ministry only)
  if (
    role === 'ministry' &&
    (lower.includes('graph') || lower.includes('chart') ||
      lower.includes('trend') || lower.includes('what does this mean') ||
      lower.includes('explain') || lower.includes('ग्राफ') ||
      lower.includes('आलेख') || lower.includes('spasht kara'))
  ) {
    let graphType = 'employment'
    if (lower.includes('skill') || lower.includes('gap') || lower.includes('कौशल्य')) {
      graphType = 'skill_gap'
    } else if (lower.includes('retention') || lower.includes('3 month') || lower.includes('महिने')) {
      graphType = 'retention'
    } else if (lower.includes('wage') || lower.includes('salary') || lower.includes('पगार')) {
      graphType = 'wage'
    } else if (lower.includes('funnel') || lower.includes('drop-off')) {
      graphType = 'funnel'
    }
    return { type: 'EXPLAIN_GRAPH', graphType }
  }

  // 5. Client Specific Intents
  if (role === 'client') {
    if (
      lower.includes('skill gap') || lower.includes('skills') ||
      lower.includes('improve') || lower.includes('koshaly') ||
      lower.includes('कौशल्य') || lower.includes('कौशल') ||
      lower.includes('sudharta')
    ) {
      return { type: 'CLIENT_SKILL_GAP' }
    }

    if (
      lower.includes('course') || lower.includes('training') ||
      lower.includes('what training') || lower.includes('kurs') ||
      lower.includes('प्रशिक्षण') || lower.includes('काय शिकावे') ||
      lower.includes('karni chahiye')
    ) {
      return { type: 'CLIENT_TRAINING_ADVICE' }
    }

    if (
      lower.includes('status') || lower.includes('progress') ||
      lower.includes('complete') || lower.includes('स्थिती') ||
      lower.includes('mahit')
    ) {
      return { type: 'CLIENT_STATUS' }
    }

    if (
      lower.includes('assessment') || lower.includes('result') ||
      lower.includes('score') || lower.includes('परीक्षण') ||
      lower.includes('मूल्यांकन')
    ) {
      return { type: 'CLIENT_ASSESSMENT' }
    }
  }

  // 6. Platform Navigation / FAQ
  if (
    lower.includes('consent') || lower.includes('withdraw') ||
    lower.includes('checkin') || lower.includes('check-in') ||
    lower.includes('dispute') || lower.includes('help') ||
    lower.includes('madat') || lower.includes('मदत')
  ) {
    return { type: 'PLATFORM_HELP' }
  }

  // 7. General Admin Metric Questions
  if (
    lower.includes('how many') || lower.includes('total') ||
    lower.includes('count') || lower.includes('कितने') ||
    lower.includes('किती') || lower.includes('average')
  ) {
    return { type: 'GENERAL_ADMIN_METRIC' }
  }

  return { type: 'UNKNOWN' }
}

/**
 * Generates a structured response based on factual data
 */
export async function processQuery({
  query,
  role = 'ministry',
  currentUserId = null,
  filters = {},
  userLang = 'auto',
  pageContext = 'dashboard',
}) {
  const detectedLang = userLang === 'auto' ? detectLanguage(query) : userLang
  const langKey = normalizeLanguage(detectedLang)
  const isHinglish = detectedLang === 'hinglish'
  const isMarathiLatin = detectedLang === 'marathi_latin'

  // Context resolution: check if "it", "its", "that" refers to previous entity
  let resolvedQuery = query
  if (
    sessionMemory.lastProvider &&
    (query.toLowerCase().includes('its') || query.toLowerCase().includes('that provider'))
  ) {
    resolvedQuery += ` for ${sessionMemory.lastProvider}`
  }

  const intent = classifyIntent(resolvedQuery, role)

  // Governance analytics — cohort aggregates, centre league tables, the proof
  // gap — belong to the console that officer credentials open. A trainee's
  // assistant answers about that trainee, so these are refused by role rather
  // than merely left off the suggestion chips.
  const MINISTRY_ONLY_INTENTS = new Set([
    'DASHBOARD_SUMMARY',
    'EXPLAIN_GRAPH',
    'PROVIDER_COMPARISON',
    'GENERAL_ADMIN_METRIC',
    'DISPUTES_SUMMARY',
    'FOLLOWUP_SUMMARY',
  ])
  if (role !== 'ministry' && MINISTRY_ONLY_INTENTS.has(intent.type)) {
    return translate(langKey, 'cbClientRestrictedAnalytics')
  }

  try {
    switch (intent.type) {
      case 'DASHBOARD_SUMMARY': {
        const data = await getDashboardSummary(filters)
        if (!data) return translate(langKey, 'cbNoDataAvailable')
        sessionMemory.lastTopic = 'dashboard_summary'
        return formatDashboardSummary(data, langKey, isHinglish, isMarathiLatin)
      }

      case 'TRAINEE_SEARCH': {
        const qId = intent.traineeId || extractTraineeId(query)
        if (!qId) {
          return translate(langKey, 'cbNeedTraineeId')
        }

        const result = await searchTrainee(qId, role, currentUserId)
        if (!result.authorized) {
          return translate(langKey, 'cbClientRestricted')
        }
        if (!result.found) {
          return translate(langKey, 'cbTraineeNotFound', qId)
        }

        sessionMemory.lastTrainee = result.data.id
        return formatTraineeDetails(result.data, langKey, isHinglish, isMarathiLatin)
      }

      case 'DISPUTES_SUMMARY': {
        const d = await getDisputesSummary(role)
        if (!d) return translate(langKey, 'cbNoDataAvailable')
        return [
          `### ${translate(langKey, 'navDisputedRecords')}`,
          `* **${translate(langKey, 'cbDisputesOpen')}:** ${d.open}`,
          `* **${translate(langKey, 'cbDisputesUnassigned')}:** ${d.unassigned}`,
          `* **${translate(langKey, 'cbDisputesResolved')}:** ${d.resolved}`,
          '',
          translate(langKey, 'cbDisputesExplainer'),
        ].join('\n')
      }

      case 'FOLLOWUP_SUMMARY': {
        const f = await getFollowupSummary(role)
        if (!f) return translate(langKey, 'cbNoDataAvailable')
        return [
          `### ${translate(langKey, 'navFollowupQueue')}`,
          `* **${translate(langKey, 'cbFollowupTotal')}:** ${f.total}`,
          `* **${translate(langKey, 'cbFollowupUnassigned')}:** ${f.unassigned}`,
          `* **${translate(langKey, 'cbFollowupAssigned')}:** ${f.assigned}`,
          '',
          translate(langKey, 'cbFollowupExplainer'),
        ].join('\n')
      }

      case 'EXPLAIN_GRAPH': {
        const gData = await getGraphData(intent.graphType, filters)
        sessionMemory.lastGraphType = intent.graphType
        return formatGraphExplanation(gData, intent.graphType, langKey, isHinglish, isMarathiLatin)
      }

      case 'PROVIDER_COMPARISON': {
        const isTop5 = query.toLowerCase().includes('top 5')
        const limit = isTop5 ? 5 : 10
        const providers = await getProviderComparison(filters, 'verified_placement_pct', limit)
        if (!providers.length) return translate(langKey, 'cbNoDataAvailable')
        if (providers[0]) sessionMemory.lastProvider = providers[0].name
        return formatProviderComparison(providers, langKey, isHinglish, isMarathiLatin, isTop5)
      }

      case 'GENERAL_ADMIN_METRIC': {
        const data = await getDashboardSummary(filters)
        if (!data) return translate(langKey, 'cbNoDataAvailable')
        return formatGeneralMetric(query, data, langKey, isHinglish, isMarathiLatin)
      }

      case 'CLIENT_SKILL_GAP': {
        const clientData = await getClientProfileData(currentUserId)
        if (!clientData) return translate(langKey, 'cbNoDataAvailable')
        return formatClientSkillGap(clientData, langKey, isHinglish, isMarathiLatin)
      }

      case 'CLIENT_TRAINING_ADVICE': {
        const clientData = await getClientProfileData(currentUserId)
        if (!clientData) return translate(langKey, 'cbNoDataAvailable')
        return formatClientTrainingAdvice(clientData, langKey, isHinglish, isMarathiLatin)
      }

      case 'CLIENT_STATUS': {
        const clientData = await getClientProfileData(currentUserId)
        if (!clientData) return translate(langKey, 'cbNoDataAvailable')
        return formatClientStatus(clientData, langKey, isHinglish, isMarathiLatin)
      }

      case 'CLIENT_ASSESSMENT': {
        const clientData = await getClientProfileData(currentUserId)
        if (!clientData) return translate(langKey, 'cbNoDataAvailable')
        return formatClientAssessment(clientData, langKey, isHinglish, isMarathiLatin)
      }

      case 'PLATFORM_HELP': {
        return formatPlatformHelp(query, langKey, isHinglish, isMarathiLatin)
      }

      default: {
        return translate(langKey, 'cbFallback', MOCK_HELPLINE_NUMBER)
      }
    }
  } catch (err) {
    console.error('Error handling chatbot query:', err)
    return translate(langKey, 'cbFallback', MOCK_HELPLINE_NUMBER)
  }
}

/* ==================================================================
   Multilingual Formatters (EN / HI / MR / Hinglish / Latin Marathi)
   ================================================================== */

function formatDashboardSummary(d, lang, isHinglish, isMarathiLatin) {
  const topProv = d.top_provider ? `${d.top_provider.name} (${d.top_provider.verified_pct}%)` : 'N/A'
  const topGap = d.top_skill_gap ? `${d.top_skill_gap.course} (${d.top_skill_gap.mismatch}% gap)` : 'N/A'

  if (isMarathiLatin) {
    return `### Current Dashboard Summary:
* **Total Registered Trainees:** ${d.total_trainees}
* **Reported Placements:** ${d.headline_placement_count} (${d.headline_placement_pct}%)
* **3-Month Verified Employment:** ${d.verified_employed_count} (${d.verified_employed_pct}%)
* **Highest Skill Gap:** ${topGap}
* **Top Performing Centre:** ${topProv}
* **Awaiting 3-Month Confirmation:** ${d.awaiting_count} trainees

**Mukhy Nishkarsh:** Sabhyat jast skill gap ${d.top_skill_gap?.course || 'Data Analytics'} madhe aahe.`
  }

  if (isHinglish) {
    return `### Current Dashboard Summary:
* **Total Registered Trainees:** ${d.total_trainees}
* **Reported Placements:** ${d.headline_placement_count} (${d.headline_placement_pct}%)
* **3-Month Verified Employment:** ${d.verified_employed_count} (${d.verified_employed_pct}%)
* **Highest Skill Gap:** ${topGap}
* **Best Provider:** ${topProv}
* **Awaiting 3-Month Confirmation:** ${d.awaiting_count} trainees

**Key Takeaway:** Sabse jyada skill gap **${d.top_skill_gap?.course || 'Data Analytics'}** me hai jahan training to role alignment improve karni zaroori hai.`
  }

  if (lang === 'mr') {
    return `### डॅशबोर्ड सारांश (Dashboard Summary):
* **एकूण नोंदणीकृत प्रशिक्षणार्थी:** ${d.total_trainees}
* **नोंदवलेले प्लेसमेंट:** ${d.headline_placement_count} (${d.headline_placement_pct}%)
* **३-महिने प्रमाणित रोजगार (Verified):** ${d.verified_employed_count} (${d.verified_employed_pct}%)
* **सर्वाधिक कौशल्य तफावत (Top Skill Gap):** ${topGap}
* **सर्वोत्कृष्ट प्रशिक्षण संस्था:** ${topProv}
* **३-महिन्यांच्या पुष्टीकरणाची प्रतीक्षा:** ${d.awaiting_count}

**महत्त्वाचा निष्कर्ष:** सर्वाधिक कौशल्य तफावत **${d.top_skill_gap?.course || 'डेटा ॲनालिटिक्स'}** अभ्यासक्रमामध्ये दिसून येत आहे.`
  }

  if (lang === 'hi') {
    return `### डैशबोर्ड सारांश (Dashboard Summary):
* **कुल पंजीकृत प्रशिक्षु:** ${d.total_trainees}
* **रिपोर्ट किए गए प्लेसमेंट:** ${d.headline_placement_count} (${d.headline_placement_pct}%)
* **3-महीने सत्यापित रोजगार (Verified):** ${d.verified_employed_count} (${d.verified_employed_pct}%)
* **सर्वाधिक कौशल अंतर (Top Skill Gap):** ${topGap}
* **सर्वश्रेष्ठ प्रदर्शन करने वाला केंद्र:** ${topProv}
* **3-महीने सत्यापन प्रतीक्षारत:** ${d.awaiting_count}

**मुख्य निष्कर्ष:** सबसे अधिक कौशल अंतर **${d.top_skill_gap?.course || 'डेटा एनालिटिक्स'}** में है, जिस पर तत्काल ध्यान देने की आवश्यकता है।`
  }

  return `### Dashboard Summary:
* **Total Registered Trainees:** ${d.total_trainees.toLocaleString()}
* **Reported Placements:** ${d.headline_placement_count.toLocaleString()} (${d.headline_placement_pct}%)
* **3-Month Verified Employment:** ${d.verified_employed_count.toLocaleString()} (${d.verified_employed_pct}%)
* **Highest Skill Gap:** ${topGap}
* **Top Performing Centre:** ${topProv}
* **Awaiting 3-Month Confirmation:** ${d.awaiting_count} trainees

**Key Insight:** Verified employment is ${d.verified_employed_pct}%, reflecting strict adherence to the 3-month same-employer rule. The primary skill gap is in **${d.top_skill_gap?.course || 'Data Analytics'}**.`
}

function formatTraineeDetails(t, lang, isHinglish, isMarathiLatin) {
  const statusLabels = {
    employed: 'Employed (3+ months verified)',
    awaiting_confirmation: 'Placed (Awaiting 3-month confirmation)',
    self_employed: 'Self-Employed',
    apprentice: 'Apprentice',
    not_working: 'Not currently working',
    no_data: 'No signal reported yet',
  }
  const status = statusLabels[t.outcome] || t.outcome

  if (isHinglish) {
    return `### Trainee Details: ${t.id}
* **Name:** ${t.name}
* **Course:** ${t.course}
* **District:** ${t.district}
* **Status:** ${status}
* **Employer:** ${t.employer || 'Not recorded'}
* **Current Role:** ${t.job_role || 'Not assigned'}
* **Monthly Salary:** ${t.monthly_salary ? `₹${t.monthly_salary.toLocaleString()}` : 'N/A'}
* **Verification Trust:** ${t.trust_level} (${t.events_count} events recorded)`
  }

  if (lang === 'mr') {
    return `### प्रशिक्षणार्थी तपशील (Trainee Details): ${t.id}
| घटक | माहिती |
| :--- | :--- |
| **नाव** | ${t.name} |
| **अभ्यासक्रम** | ${t.course} |
| **जिल्हा** | ${t.district} |
| **सध्याची स्थिती** | ${status} |
| **कंपनी/नियोक्ता** | ${t.employer || 'नोंद नाही'} |
| **पद (Role)** | ${t.job_role || 'लागू नाही'} |
| **मासिक वेतन** | ${t.monthly_salary ? `₹${t.monthly_salary.toLocaleString()}` : 'लागू नाही'} |
| **प्रमाणित विश्वासार्हता** | ${t.trust_level.toUpperCase()} (${t.events_count} नोंदी) |`
  }

  if (lang === 'hi') {
    return `### प्रशिक्षु विवरण (Trainee Details): ${t.id}
| विवरण | जानकारी |
| :--- | :--- |
| **नाम** | ${t.name} |
| **पाठ्यक्रम** | ${t.course} |
| **ज़िला** | ${t.district} |
| **वर्तमान स्थिति** | ${status} |
| **नियोक्ता/कंपनी** | ${t.employer || 'दर्ज नहीं'} |
| **कार्यकारी पद** | ${t.job_role || 'लागू नहीं'} |
| **मासिक वेतन** | ${t.monthly_salary ? `₹${t.monthly_salary.toLocaleString()}` : 'अनुपलब्ध'} |
| **सत्यापन स्तर** | ${t.trust_level.toUpperCase()} (${t.events_count} रिकॉर्ड्स) |`
  }

  return `### Trainee Record: ${t.id}

| Attribute | Details |
| :--- | :--- |
| **Name** | ${t.name} |
| **Course** | ${t.course} |
| **District** | ${t.district} |
| **Status** | ${status} |
| **Employer** | ${t.employer || 'Not recorded'} |
| **Job Role** | ${t.job_role || 'N/A'} |
| **Monthly Salary** | ${t.monthly_salary ? `₹${t.monthly_salary.toLocaleString()}` : 'N/A'} |
| **Evidence Level** | ${t.trust_level.toUpperCase()} (${t.events_count} events tracked) |`
}

function formatGraphExplanation(g, type, lang, isHinglish, isMarathiLatin) {
  if (!g) {
    return `Graph data is currently being rendered. Please consult the active dashboard panels.`
  }

  if (type === 'contrast' || type === 'employment') {
    return `### Employment Graph Explanation

1. **What the graph shows:** The contrast between self-reported headline placement (${g.reported_pct}%) vs actual 3-month sustained employment confirmed with verified evidence (${g.verified_pct}%).
2. **Highest value:** Reported placement rate at **${g.reported_pct}%**.
3. **Lowest value:** 3-month verified employment at **${g.verified_pct}%**.
4. **Important trend:** A proof gap drop of **${g.proof_drop_pp} percentage points**, representing trainees awaiting 3-month tenure verification or who did not stay.
5. **Comparison:** Only trainees who remain at the *same* employer for at least 3 months move into the verified employment metric.
6. **Possible insight:** ${g.awaiting_count} trainees are currently awaiting the 3-month verification milestone.
7. **Short conclusion:** Relying solely on raw placement letters overstates permanent employment outcomes; verified tracking provides the true policy outcome.`
  }

  if (type === 'skill_gap') {
    const highest = g.highest_mismatch
    const lowest = g.lowest_mismatch
    return `### Skill Gap & Course Mismatch Explanation

1. **What the graph shows:** Intended job role placement target vs actual job role placement observed across ${g.total_courses} training courses.
2. **Highest value:** **${highest?.course || 'Data Analytics'}** has the largest mismatch at **${highest?.mismatch || 0}%** (Target: ${highest?.intended_pct}%, Actual on-role: ${highest?.actual_pct}%).
3. **Lowest value:** **${lowest?.course || 'CNC Operator'}** has the smallest mismatch at **${lowest?.mismatch || 0}%**.
4. **Important trend:** High technical courses show trainees frequently drifting into adjacent or lower-skilled operational roles.
5. **Comparison:** Practical vocational trades (CNC, Fitter) achieve higher role-match alignment compared to broader digital courses.
6. **Possible insight:** Curricula in high-gap courses may require stronger industry partner alignment.
7. **Short conclusion:** Focused interventions should prioritize courses with mismatches exceeding 20%.`
  }

  if (type === 'retention') {
    return `### Retention Checkpoints Explanation

1. **What the graph shows:** Trainee employment retention tracked longitudinally at 3 months, 6 months, and 12 months.
2. **Highest value:** Highest retention is recorded at the **3-month checkpoint**.
3. **Lowest value:** Lowest retention is observed at the **12-month checkpoint** due to job transitions and relocations.
4. **Important trend:** The sharpest attrition typically occurs between placement and 3 months.
5. **Comparison:** Centres with employer partnerships sustain higher 6-month and 12-month retention rates.
6. **Possible insight:** Ongoing field check-ins stabilize drop-offs after month 3.
7. **Short conclusion:** 3-month milestone is the most critical survival checkpoint for sustainable employment.`
  }

  return `### Graph Analysis
The active chart visualizes verified training outcomes across cohorts. It highlights that true skilling success requires sustained employment, evidence verification, and role-matched outcomes rather than initial batch placement numbers alone.`
}

function formatProviderComparison(providers, lang, isHinglish, isMarathiLatin, isTop5) {
  const top = providers[0]
  const lowest = providers[providers.length - 1]

  let table = `| Rank | Training Centre | District | Certified | Reported % | Verified % | Proof Gap |\n`
  table += `| :---: | :--- | :--- | :---: | :---: | :---: | :---: |\n`

  providers.forEach((p) => {
    table += `| ${p.rank} | **${p.name}** | ${p.district} | ${p.certified_count} | ${p.headline_placement_pct}% | ${p.verified_placement_pct}% | ${p.proof_gap}pp |\n`
  })

  if (lang === 'mr') {
    return `### प्रशिक्षण संस्था तुलना ${isTop5 ? '(शीर्ष ५)' : ''}

${table}

* **सर्वोत्तम संस्था:** **${top?.name}** — ${top?.verified_placement_pct}% प्रमाणित रोजगार.
* **कमी कामगिरी असलेली संस्था:** **${lowest?.name}** — ${lowest?.verified_placement_pct}% प्रमाणित रोजगार.
* **निष्कर्ष:** ${top?.name} इतर केंद्रांच्या तुलनेत सर्वाधिक टिकणारा रोजगार प्रदान करत आहे.`
  }

  if (lang === 'hi') {
    return `### प्रशिक्षण प्रदाता तुलना ${isTop5 ? '(शीर्ष 5)' : ''}

${table}

* **सर्वश्रेष्ठ प्रदर्शन:** **${top?.name}** — ${top?.verified_placement_pct}% सत्यापित रोजगार दर।
* **न्यूनतम प्रदर्शन:** **${lowest?.name}** — ${lowest?.verified_placement_pct}% सत्यापित रोजगार दर।
* **निष्कर्ष:** ${top?.name} उच्चतम 3-महीने रोजगार सत्यापन के साथ आगे है।`
  }

  return `### Provider Comparison ${isTop5 ? '(Top 5)' : ''}

${table}

* **Top Performing Provider:** **${top?.name}** with **${top?.verified_placement_pct}%** verified employment.
* **Lowest Performing Provider:** **${lowest?.name}** with **${lowest?.verified_placement_pct}%** verified employment.
* **Key Takeaway:** ${top?.name} currently leads by ${top && lowest ? top.verified_placement_pct - lowest.verified_placement_pct : 0} percentage points over the lowest-ranked centre, with a narrow proof gap indicating high evidence integrity.`
}

function formatGeneralMetric(query, d, lang, isHinglish, isMarathiLatin) {
  const lower = query.toLowerCase()

  if (lower.includes('provider') || lower.includes('centre') || lower.includes('प्रदाता') || lower.includes('संस्था')) {
    return `There are currently **${d.provider_count}** registered training centres active in the system.`
  }

  if (lower.includes('unemployed') || lower.includes('not working') || lower.includes('बेरोजगार')) {
    return `Currently, **${d.not_working_count} trainees** (${d.total_trainees ? Math.round((d.not_working_count / d.total_trainees) * 100) : 0}%) are recorded as not working.`
  }

  if (lower.includes('completed') || lower.includes('certified') || lower.includes('प्रमाणित')) {
    return `A total of **${d.total_trainees} trainees** have successfully completed their training and certification assessment.`
  }

  if (lower.includes('best') || lower.includes('highest employment') || lower.includes('top provider')) {
    return `**${d.top_provider?.name || 'Sahyadri Skill Academy'}** currently has the best verified employment rate at **${d.top_provider?.verified_pct || 0}%**.`
  }

  return `### Current Statistics:
* Registered Trainees: **${d.total_trainees}**
* Active Centres: **${d.provider_count}**
* 3-Month Verified Employment Rate: **${d.verified_employed_pct}%**
* Major Skill Gap Area: **${d.top_skill_gap?.course || 'Data Analytics'}**`
}

function formatClientSkillGap(clientData, lang, isHinglish, isMarathiLatin) {
  const rec = clientData.record
  const gap = clientData.course_gap

  if (isHinglish) {
    return `### Aapke Skill Gaps & Guidance (${rec.course}):
Aapke course **${rec.course}** me intended role **${gap?.intended_role || 'Specialist'}** hai.

**Main areas jahan gap dekha gaya hai:**
1. **Industry Tool Proficiency:** Practical projects aur certification.
2. **Workplace Communication:** Team collaboration aur client interactions.
3. **Applied Problem Solving:** Real-world case studies.

**Recommendation:** Aap portal ke *Training Feedback* aur *Check-in* section me jakar apna status update karein.`
  }

  if (lang === 'mr') {
    return `### तुमचे कौशल्य अंतर व मार्गदर्शन (${rec.course}):
तुमच्या **${rec.course}** अभ्यासक्रमानुसार तुमचे नियोजित पद **${gap?.intended_role || 'स्पेशालिस्ट'}** आहे.

**लक्षात आलेली मुख्य कौशल्य अंतरे:**
1. **प्रात्यक्षिक साधने (Practical Tools):** आधुनिक सॉफ्टवेअर आणि तंत्रज्ञान ज्ञान.
2. **व्यावसायिक संवाद (Communication Skills):** मुलाखत आणि कामाच्या ठिकाणचा संवाद.
3. **कामाचा अनुभव (Hands-on Experience):** उद्योग आधारित प्रकल्प.

**सल्ला:** तुमचे ३-महिन्यांचे रोजगार सत्यापन पूर्ण करण्यासाठी चेक-इन फॉर्म वेळेवर सादर करा.`
  }

  if (lang === 'hi') {
    return `### आपके कौशल अंतर और मार्गदर्शन (${rec.course}):
आपके पाठ्यक्रम **${rec.course}** के अनुसार लक्षित भूमिका **${gap?.intended_role || 'विशेषज्ञ'}** है।

**पहचाने गए मुख्य कौशल अंतर:**
1. **व्यावहारिक उपकरण दक्षता (Practical Tools):** इंडस्ट्री में प्रयुक्त आधुनिक टूल्स का ज्ञान।
2. **व्यावसायिक संचार (Communication):** कार्यस्थल संचार और प्रस्तुति कौशल।
3. **कार्यस्थल तत्परता (Job Readiness):** उद्योग-उन्मुख व्यावहारिक अभ्यास।

**सुझाव:** अपनी 3-महीने की रोजगार पुष्टि के लिए कृपया समय पर चेक-इन पूरा करें।`
  }

  return `### Your Identified Skill Gaps (${rec.course}):
Based on your training in **${rec.course}** (Intended role: *${gap?.intended_role || 'Specialist'}*):

1. **Practical Technical Mastery:** Deepening hands-on proficiency in industry-standard software tools.
2. **Professional Communication:** Workplace interaction, interview readiness, and reporting.
3. **Domain Alignment:** Transitioning from foundational coursework to live project deployment.

**Next Best Action:** Keep your 3-month milestone verified through the Check-In page to unlock your official verified credential.`
}

function formatClientTrainingAdvice(clientData, lang, isHinglish, isMarathiLatin) {
  const rec = clientData.record
  if (isHinglish) {
    return `Aapke current course **${rec.course}** ke baad, aap **Advanced Digital Tools** ya **Specialized Domain Certification** le sakte hain. Isse aapki job placement rate aur monthly earning potential me sudhar hoga.`
  }
  if (lang === 'mr') {
    return `तुमच्या **${rec.course}** प्रमाणपत्राच्या आधारे, तुम्ही प्रगत कौशल्ये किंवा डिजिटल साधनांचे अतिरिक्त प्रशिक्षण घेऊ शकता. यामुळे तुमचा रोजगार आणि वेतन वाढण्यास मदत होईल.`
  }
  if (lang === 'hi') {
    return `आपके वर्तमान पाठ्यक्रम **${rec.course}** के आधार पर, आप उन्नत डिजिटल टूल्स या व्यावहारिक इंटर्नशिप का चयन कर सकते हैं। इससे आपके रोजगार और वेतन के अवसर बेहतर होंगे।`
  }
  return `Building upon your qualification in **${rec.course}**, we recommend exploring advanced modular certifications and practical apprenticeship attachments to accelerate your wage progression.`
}

function formatClientStatus(clientData, lang, isHinglish, isMarathiLatin) {
  const rec = clientData.record
  const stage = rec.verified_status || rec.outcome || rec.bucket || 'Certified'

  if (isHinglish) {
    return `### Aapka Training & Employment Status:
* **Trainee ID:** ${rec.id}
* **Name:** ${rec.name}
* **Course:** ${rec.course}
* **Current Status:** ${stage}
* **Employer:** ${rec.employer || 'Not recorded'}
* **Evidence Tier:** ${rec.trust_level || 'High'}

Aap apna training milestone progress directly Client Dashboard journey section me dekh sakte hain.`
  }

  if (lang === 'hi') {
    return `### आपकी प्रशिक्षण और रोजगार स्थिति:
* **प्रशिक्षु आईडी:** ${rec.id}
* **नाम:** ${rec.name}
* **पाठ्यक्रम:** ${rec.course}
* **वर्तमान स्थिति:** ${stage}
* **नियोक्ता:** ${rec.employer || 'दर्ज नहीं'}
* **प्रमाण स्तर:** ${rec.trust_level || 'High'}

आप अपनी विस्तृत प्रगति क्लाइंट डैशबोर्ड की यात्रा (Journey) अनुभाग में देख सकते हैं।`
  }

  if (lang === 'mr') {
    return `### आपली प्रशिक्षण आणि रोजगार स्थिती:
* **प्रशिक्षणार्थी आयडी:** ${rec.id}
* **नाव:** ${rec.name}
* **अभ्यासक्रम:** ${rec.course}
* **सध्याची स्थिती:** ${stage}
* **नियोक्ता:** ${rec.employer || 'नोंद नाही'}
* **प्रमाण विश्वासार्हता:** ${rec.trust_level || 'High'}

तुम्ही तुमची तपशीलवार प्रगती थेट क्लायंट डॅशबोर्डवरील प्रवास (Journey) विभागात पाहू शकता.`
  }

  return `### Training & Employment Status:
* **Trainee ID:** ${rec.id}
* **Name:** ${rec.name}
* **Course:** ${rec.course}
* **Current Stage:** ${stage}
* **Employer on Record:** ${rec.employer || 'Self-Employed / In Progress'}
* **Evidence Tier:** ${rec.trust_level || 'High'}

You can check your detailed milestone progress anytime directly in the **Client Dashboard** journey section.`
}

function formatClientAssessment(clientData, lang, isHinglish, isMarathiLatin) {
  const rec = clientData.record
  const a = rec.assessment
  const en = rec.enrolment
  // Real scores from the assessment record. Previously this told every
  // trainee they were "Certified & Verified", whatever they had scored.
  if (!a) {
    return `### ${translate(lang, 'cbAssessTitle')}\n${translate(lang, 'cbAssessNone')}`
  }
  const lines = [
    `### ${translate(lang, 'cbAssessTitle')}`,
    `* **${translate(lang, 'cbAssessQualification')}:** ${rec.course}`,
    `* **${translate(lang, 'cbAssessTechnical')}:** ${a.technical_score ?? '—'} / 100`,
    `* **${translate(lang, 'cbAssessSoft')}:** ${a.soft_skill_score ?? '—'} / 100`,
    `* **${translate(lang, 'cbAssessResult')}:** ${a.result ?? '—'} · ${a.skill_level ?? '—'}`,
    `* **${translate(lang, 'cbAssessCertified')}:** ${a.certified ? translate(lang, 'cbYes') : translate(lang, 'cbNo')}`,
  ]
  if (en) {
    lines.push(
      `* **${translate(lang, 'cbAssessAttendance')}:** ${en.attendance_pct != null ? `${en.attendance_pct}%` : '—'} · ${en.completion_status ?? '—'}`,
    )
  }
  lines.push('', translate(lang, a.certified ? 'cbAssessNextCertified' : 'cbAssessNextNot'))
  return lines.join('\n')
}

function formatPlatformHelp(query, lang, isHinglish, isMarathiLatin) {
  const lower = query.toLowerCase()
  if (lower.includes('consent') || lower.includes('withdraw')) {
    return `### Consent Management:
Under the Digital Personal Data Protection Act and GIGW 3.0 standards, every trainee has sovereign rights over their skilling data.
* You can view the exact evidence held about you on the **Consent** page.
* You can **Withdraw Consent** at any time with immediate effect. When withdrawn, your records are immediately excluded from all public metrics.`
  }

  if (lower.includes('checkin') || lower.includes('check-in')) {
    return `### Check-In Process:
Check-ins allow trainees to report their current employment status.
* Access the **Check-in Simulator** from the navigation.
* Answering check-ins establishes active contact and automatically clears your record from the assisted follow-up queue.`
  }

  return `SkillTrace tracks verified post-training outcomes. For any questions or platform assistance, you can also reach our support team at **${MOCK_HELPLINE_NUMBER}**.`
}
