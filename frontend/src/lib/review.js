/**
 * The post-training Quick Review.
 *
 * One definition, read by three places: the trainee's questionnaire, the mock
 * data generator, and the government's aggregate insights. Keeping it here is
 * what lets the government screen label a response without knowing anything
 * about how the trainee screen rendered it.
 *
 * Deliberately five questions, single-choice, no mandatory free text. A trainee
 * who has just finished a course owes us nothing; the review has to be worth
 * less than a minute of their time or it will not be filled in honestly.
 */
export const REVIEW_QUESTIONS = [
  {
    id: 'overall_quality',
    prompt: 'How would you rate the overall quality of the training?',
    promptHi: 'प्रशिक्षण की समग्र गुणवत्ता को आप कैसा आँकेंगे?',
    shortLabel: 'Overall quality',
    options: [
      { value: 'excellent', label: 'Excellent', labelHi: 'उत्कृष्ट', score: 4 },
      { value: 'good', label: 'Good', labelHi: 'अच्छा', score: 3 },
      { value: 'average', label: 'Average', labelHi: 'औसत', score: 2 },
      { value: 'poor', label: 'Poor', labelHi: 'खराब', score: 1 },
    ],
  },
  {
    id: 'job_usefulness',
    prompt: 'How useful was the training for the job you wanted?',
    promptHi: 'जिस काम के लिए आप प्रशिक्षण चाहते थे, उसमें यह कितना उपयोगी रहा?',
    shortLabel: 'Job usefulness',
    options: [
      { value: 'very_useful', label: 'Very useful', labelHi: 'बहुत उपयोगी', score: 4 },
      { value: 'useful', label: 'Useful', labelHi: 'उपयोगी', score: 3 },
      { value: 'somewhat', label: 'Somewhat useful', labelHi: 'कुछ हद तक उपयोगी', score: 2 },
      { value: 'not_useful', label: 'Not useful', labelHi: 'उपयोगी नहीं', score: 1 },
    ],
  },
  {
    id: 'trainer_rating',
    prompt: 'How would you rate your trainer?',
    promptHi: 'अपने प्रशिक्षक को आप कैसा आँकेंगे?',
    shortLabel: 'Trainer',
    options: [
      { value: 'excellent', label: 'Excellent', labelHi: 'उत्कृष्ट', score: 4 },
      { value: 'good', label: 'Good', labelHi: 'अच्छा', score: 3 },
      { value: 'average', label: 'Average', labelHi: 'औसत', score: 2 },
      { value: 'poor', label: 'Poor', labelHi: 'खराब', score: 1 },
    ],
  },
  {
    id: 'confidence',
    prompt: 'How confident do you feel using the skills you learned?',
    promptHi: 'सीखे गए कौशल के उपयोग में आप कितना आश्वस्त महसूस करते हैं?',
    shortLabel: 'Skill confidence',
    options: [
      { value: 'very_confident', label: 'Very confident', labelHi: 'पूर्णतः आश्वस्त', score: 4 },
      { value: 'confident', label: 'Confident', labelHi: 'आश्वस्त', score: 3 },
      { value: 'somewhat_confident', label: 'Somewhat confident', labelHi: 'कुछ हद तक आश्वस्त', score: 2 },
      { value: 'not_yet', label: 'Not yet confident', labelHi: 'अभी आश्वस्त नहीं', score: 1 },
    ],
  },
  {
    id: 'recommend',
    prompt: 'Would you recommend this training to another learner?',
    promptHi: 'क्या आप यह प्रशिक्षण किसी अन्य शिक्षार्थी को सुझाएँगे?',
    shortLabel: 'Would recommend',
    options: [
      { value: 'definitely', label: 'Definitely', labelHi: 'निश्चित रूप से', score: 4 },
      { value: 'probably', label: 'Probably', labelHi: 'शायद हाँ', score: 3 },
      { value: 'not_sure', label: 'Not sure', labelHi: 'निश्चित नहीं', score: 2 },
      { value: 'probably_not', label: 'Probably not', labelHi: 'शायद नहीं', score: 1 },
    ],
  },
]

export const QUESTION_BY_ID = Object.fromEntries(REVIEW_QUESTIONS.map((q) => [q.id, q]))

/** Score for one answer, 1–4, or null when the question was skipped. */
export function scoreOf(questionId, value) {
  const q = QUESTION_BY_ID[questionId]
  if (!q) return null
  return q.options.find((o) => o.value === value)?.score ?? null
}

/** Mean score across a set of answers to one question, on the same 1–4 scale. */
export function meanScore(answersForQuestion, questionId) {
  const scores = answersForQuestion.map((v) => scoreOf(questionId, v)).filter((n) => n !== null)
  if (!scores.length) return null
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
}

/** A 1–4 mean expressed out of 5, which is how people read a rating. */
export const asFive = (mean) => (mean === null ? null : Math.round(((mean - 1) / 3) * 4 * 10) / 10 + 1)
