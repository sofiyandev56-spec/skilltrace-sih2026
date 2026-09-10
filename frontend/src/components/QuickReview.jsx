import { useState } from 'react'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { useToast } from './Toast.jsx'
import { REVIEW_QUESTIONS } from '../lib/review.js'
import { longDate } from '../lib/format.js'
import { useGov } from '../gov/GovContext.jsx'

const TOTAL = REVIEW_QUESTIONS.length

/**
 * Post-training feedback, asked once.
 */
export default function QuickReview({ traineeId, courseName }) {
  const { lang } = useGov()
  const hi = lang === 'hi'
  const toast = useToast()
  const [step, setStep] = useState(0) // 0..TOTAL-1 = questions, TOTAL = comment & submit
  const [answers, setAnswers] = useState({})
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [justDone, setJustDone] = useState(false)

  const state = useApi(
    () => (traineeId ? api.getReview(traineeId) : Promise.resolve(null)),
    [traineeId],
  )

  if (state.loading && !state.data) {
    return <div className="skeleton" style={{ height: 150, borderRadius: 3 }} />
  }

  /* ---- already answered: acknowledge, don't nag ---- */
  if (state.data?.completed && !justDone) {
    return (
      <section className="review review--done" aria-labelledby="review-done-title">
        <span className="review__tick" aria-hidden="true">
          ✓
        </span>
        <div>
          <h3 id="review-done-title">{hi ? 'प्रशिक्षण समीक्षा पूरी हो चुकी है' : 'Training review completed'}</h3>
          <p className="muted small">
            {hi
              ? `धन्यवाद — आपकी प्रतिक्रिया से अगले बैच के प्रशिक्षण में सुधार होता है। सबमिट किया गया: ${longDate(state.data.review?.submitted_at)}`
              : `Thank you — your feedback helps improve training for the next batch. Submitted ${longDate(state.data.review?.submitted_at)}.`}
          </p>
        </div>
      </section>
    )
  }

  /* ---- just submitted ---- */
  if (justDone) {
    return (
      <section className="review review--thanks" aria-labelledby="review-thanks-title">
        <span className="review__tick" aria-hidden="true">
          ✓
        </span>
        <div>
          <h3 id="review-thanks-title">{hi ? 'धन्यवाद' : 'Thank you'}</h3>
          <p className="muted small">
            {hi
              ? 'आपकी समीक्षा दर्ज कर ली गई है। सरकारी अधिकारियों को दिखाने से पहले इसे अन्य प्रशिक्षार्थियों की प्रतिक्रियाओं के साथ संयोजित किया जाता है — आपके व्यक्तिगत उत्तर आपके नाम के साथ कभी प्रदर्शित नहीं किए जाते।'
              : 'Your review has been recorded. It is combined with other trainees’ responses before any government officer sees it — your individual answers are never shown against your name.'}
          </p>
        </div>
      </section>
    )
  }

  const onComment = step === TOTAL
  const question = onComment ? null : REVIEW_QUESTIONS[step]
  const answered = question ? Boolean(answers[question.id]) : true
  const progress = Math.round(((onComment ? TOTAL : step) / TOTAL) * 100)

  const submit = async () => {
    setSubmitting(true)
    await api.submitReview({ trainee_id: traineeId, answers, comment: comment.trim() || null })
    setSubmitting(false)
    setJustDone(true)
    toast.push(hi ? 'समीक्षा सबमिट की गई' : 'Review submitted', {
      detail: hi ? 'भविष्य के प्रशिक्षण में सुधार हेतु आपके सहयोग के लिए धन्यवाद।' : 'Thank you for helping improve future training.',
    })
  }

  return (
    <section className="review" aria-labelledby="review-title">
      <header className="review__head">
        <div>
          <h3 id="review-title">{hi ? 'त्वरित समीक्षा' : 'Quick review'}</h3>
          <p className="muted small">
            {hi
              ? `${courseName ? courseName : 'इस प्रशिक्षण'} में सुधार हेतु सहयोग दें — लगभग एक मिनट, पाँच प्रश्न।`
              : `Help us improve ${courseName ? courseName : 'this training'} — about one minute, five questions.`}
          </p>
        </div>
        <span className="review__count num" aria-live="polite">
          {onComment
            ? (hi ? 'अंतिम चरण' : 'Last step')
            : (hi ? `प्रश्न ${step + 1} / ${TOTAL}` : `Question ${step + 1} of ${TOTAL}`)}
        </span>
      </header>

      <div
        className="review__progress"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Review progress"
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="review__body">
        {question ? (
          <fieldset className="review__q">
            <legend className="review__prompt">{hi ? question.promptHi || question.prompt : question.prompt}</legend>
            <div className="review__options">
              {question.options.map((o) => (
                <label
                  key={o.value}
                  className={`reviewopt ${answers[question.id] === o.value ? 'is-picked' : ''}`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={o.value}
                    checked={answers[question.id] === o.value}
                    onChange={() => setAnswers((a) => ({ ...a, [question.id]: o.value }))}
                  />
                  <span className="reviewopt__mark" aria-hidden="true" />
                  <span className="reviewopt__label">{hi ? o.labelHi || o.label : o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="review__q">
            <label className="field">
              <span className="review__prompt" style={{ marginBottom: 8, display: 'block' }}>
                {hi ? 'क्या आप कुछ और बताना चाहेंगे? ' : 'Anything else you’d like to tell us? '}
                <span className="faint">{hi ? '(वैकल्पिक)' : '(optional)'}</span>
              </span>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={hi ? 'यदि नहीं लिखना चाहते तो छोड़ सकते हैं।' : 'Skip this if you’d rather not.'}
                maxLength={400}
              />
            </label>
            <p className="faint small" style={{ marginTop: 8 }}>
              {hi
                ? `आपने सभी ${TOTAL} प्रश्नों के उत्तर दे दिए हैं। सबमिट करने से पहले आप पीछे जाकर बदलाव कर सकते हैं।`
                : `You answered all ${TOTAL} questions. You can go back and change any of them before submitting.`}
            </p>
          </div>
        )}
      </div>

      <footer className="review__foot">
        <button
          type="button"
          className="btn"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
        >
          {hi ? '← पीछे' : '← Back'}
        </button>

        <span className="review__dots" aria-hidden="true">
          {REVIEW_QUESTIONS.map((q, i) => (
            <i
              key={q.id}
              className={
                answers[q.id] ? 'is-done' : i === step && !onComment ? 'is-current' : ''
              }
            />
          ))}
        </span>

        {onComment ? (
          <button type="button" className="btn btn--accent" onClick={submit} disabled={submitting}>
            {submitting ? (hi ? 'सबमिट हो रहा है…' : 'Submitting…') : (hi ? 'समीक्षा सबमिट करें' : 'Submit review')}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setStep((s) => s + 1)}
            disabled={!answered}
          >
            {step === TOTAL - 1 ? (hi ? 'आगे बढ़ें' : 'Continue') : (hi ? 'अगला →' : 'Next →')}
          </button>
        )}
      </footer>
    </section>
  )
}
