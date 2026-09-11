import React, { useState } from 'react'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { useToast } from './Toast.jsx'
import { REVIEW_QUESTIONS } from '../lib/review.js'
import { longDate } from '../lib/format.js'
import { useGov } from '../gov/GovContext.jsx'

const TOTAL = REVIEW_QUESTIONS.length

/**
 * Post-training feedback, asked once.
 *
 * A trainee who has just finished a course owes the programme nothing, so this
 * is five single-choice questions and an optional line of text — no demographic
 * questions we already hold, no mandatory comment, nothing that takes longer to
 * answer than it took to ask. Once submitted it is never asked again; the card
 * settles into a quiet completed state instead of nagging.
 *
 * Options are native radios, so arrow keys, screen readers and mobile pickers
 * all behave the way the trainee's device has taught them to.
 */
export default function QuickReview({ traineeId, courseName }) {
  const { t, lang } = useGov()
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
          <h3 id="review-done-title">{t('trainingReviewCompleted')}</h3>
          <p className="muted small">
            {t('thankYouFeedback', longDate(state.data.review?.submitted_at || new Date().toISOString()))}
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
          <h3 id="review-thanks-title">{t('thankYou')}</h3>
          <p className="muted small">
            {t('reviewRecorded')}
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
    try {
      setSubmitting(true)
      await api.submitReview({ trainee_id: traineeId, answers, comment: comment.trim() || null })
      setSubmitting(false)
      setJustDone(true)
      toast.push(t('reviewSubmitted'), { detail: t('reviewSubmittedDetail') })
    } catch (err) {
      console.error('Failed to submit review:', err)
      setSubmitting(false)
      toast.push(t('reviewSubmitError') || 'We could not submit your review. Please try again.', { tone: 'error' })
    }
  }

  const promptText = question
    ? t(question.promptKey)
    : null

  const optionLabel = (o) => t(o.labelKey)

  return (
    <section className="review" aria-labelledby="review-title">
      <header className="review__head">
        <div>
          <h3 id="review-title">{t('quickReview')}</h3>
          <p className="muted small">
            {t('quickReviewHelp', courseName ? courseName : t('thisTraining'))}
          </p>
        </div>
        <span className="review__count num" aria-live="polite">
          {onComment ? t('lastStep') : t('questionOf', step + 1, TOTAL)}
        </span>
      </header>

      <div
        className="review__progress"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('reviewProgress')}
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="review__body">
        {question ? (
          <fieldset className="review__q">
            <legend className="review__prompt">{promptText}</legend>
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
                  <span className="reviewopt__label">{optionLabel(o)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="review__q">
            <label className="field">
              <span className="review__prompt" style={{ marginBottom: 8, display: 'block' }}>
                {t('anythingElse')} <span className="faint">{t('optional')}</span>
              </span>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('skipIfRather')}
                maxLength={400}
              />
            </label>
            <p className="faint small" style={{ marginTop: 8 }}>
              {t('answeredAll', TOTAL)}
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
          {t('back')}
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
            {submitting ? t('submittingReview') : t('submitReview')}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setStep((s) => s + 1)}
            disabled={!answered}
          >
            {step === TOTAL - 1 ? t('continue') : t('next')}
          </button>
        )}
      </footer>
    </section>
  )
}
