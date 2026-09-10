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
    promptKey: 'rvQ1',
    shortLabelKey: 'rvShortQuality',
    options: [
      { value: 'excellent', labelKey: 'optExcellent', score: 4 },
      { value: 'good', labelKey: 'optGood', score: 3 },
      { value: 'average', labelKey: 'optAverage', score: 2 },
      { value: 'poor', labelKey: 'optPoor', score: 1 },
    ],
  },
  {
    id: 'job_usefulness',
    promptKey: 'rvQ2',
    shortLabelKey: 'rvShortUseful',
    options: [
      { value: 'very_useful', labelKey: 'optVeryUseful', score: 4 },
      { value: 'useful', labelKey: 'optUseful', score: 3 },
      { value: 'somewhat', labelKey: 'optSomewhatUseful', score: 2 },
      { value: 'not_useful', labelKey: 'optNotUseful', score: 1 },
    ],
  },
  {
    id: 'trainer_rating',
    promptKey: 'rvQ3',
    shortLabelKey: 'rvShortTrainer',
    options: [
      { value: 'excellent', labelKey: 'optExcellent', score: 4 },
      { value: 'good', labelKey: 'optGood', score: 3 },
      { value: 'average', labelKey: 'optAverage', score: 2 },
      { value: 'poor', labelKey: 'optPoor', score: 1 },
    ],
  },
  {
    id: 'confidence',
    promptKey: 'rvQ4',
    shortLabelKey: 'rvShortConfidence',
    options: [
      { value: 'very_confident', labelKey: 'optVeryConfident', score: 4 },
      { value: 'confident', labelKey: 'optConfident', score: 3 },
      { value: 'somewhat_confident', labelKey: 'optSomewhatConfident', score: 2 },
      { value: 'not_yet', labelKey: 'optNotYetConfident', score: 1 },
    ],
  },
  {
    id: 'recommend',
    promptKey: 'rvQ5',
    shortLabelKey: 'rvShortRecommend',
    options: [
      { value: 'definitely', labelKey: 'optDefinitely', score: 4 },
      { value: 'probably', labelKey: 'optProbably', score: 3 },
      { value: 'not_sure', labelKey: 'optNotSure', score: 2 },
      { value: 'probably_not', labelKey: 'optProbablyNot', score: 1 },
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
