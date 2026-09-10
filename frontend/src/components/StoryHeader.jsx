import { int, pct } from '../lib/format.js'

/**
 * The whole argument of the platform, in one screen-width band.
 *
 * A judge should be able to read left to right and arrive at the point without
 * being told it: a large reported number, a much smaller verified one, and the
 * gap between them named as the thing SkillTrace refuses to report as success.
 *
 * The two figures are deliberately not styled alike. The reported rate is set
 * in muted grey with a struck-through feel; the verified rate carries the
 * Verified tier colour. Same typographic weight, opposite confidence.
 */
export default function StoryHeader({ d, delta, onOpenEvidence }) {
  const reported = d.headline_placement_pct
  const verified = d.outcomes.employed.pct
  const gap = Math.round((reported - verified) * 10) / 10
  const unproven = d.headline_placement_count - d.outcomes.employed.count

  const retained = d.retention?.find((r) => r.months === 3)
  const roleMatched = d.funnel?.find((s) => s.stage === 'Role-matched')

  return (
    <section className="story" aria-labelledby="story-h">
      <h2 className="sr-only" id="story-h">
        Headline outcome summary
      </h2>

      <div className="story__main">
        <div className="story__side">
          <p className="story__label">Reported placement rate</p>
          <p className="story__fig story__fig--weak">{pct(reported)}</p>
          <p className="story__sub">
            {int(d.headline_placement_count)} of {int(d.total_trainees)} certified trainees have a
            placement on record
          </p>
        </div>

        <div className="story__arrow" aria-hidden="true">
          <span>after the 3-month rule</span>
          <svg viewBox="0 0 64 16" width="64" height="16" role="presentation">
            <line x1="0" y1="8" x2="52" y2="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M52 3 L62 8 L52 13 Z" fill="currentColor" />
          </svg>
        </div>

        <div className="story__side">
          <p className="story__label story__label--strong">Verified employment rate</p>
          <span className="story__figrow">
            <button
              type="button"
              className="story__fig story__fig--strong story__fig--btn"
              onClick={onOpenEvidence}
              aria-label={`Verified employment rate ${pct(verified)}. Open the evidence breakdown.`}
            >
              {pct(verified)}
            </button>
            {delta ? (
              <span className={`delta delta--${delta.direction}`} role="status">
                {delta.direction === 'down' ? '▼' : '▲'} {delta.text} vs last view
              </span>
            ) : null}
          </span>
          <p className="story__hint">Select to see the evidence behind this figure</p>
          <p className="story__sub">
            {int(d.outcomes.employed.count)} trainees still at the same employer 3+ months on
          </p>
        </div>
      </div>

      <p className="story__gap">
        <strong className="num">{pct(gap)}</strong> of this cohort — <strong className="num">{int(unproven)}</strong>{' '}
        trainees — was reported as placed but cannot be shown to have held the job for three months.
        SkillTrace never reports those as employment.
      </p>

      <dl className="story__rail">
        <div className="story__cell">
          <dt>Certified</dt>
          <dd className="num">{int(d.total_trainees)}</dd>
          <span className="story__note">Completed and assessed</span>
        </div>
        <div className="story__cell">
          <dt>Independently verified</dt>
          <dd className="num" style={{ color: 'var(--tier-high)' }}>
            {d.outcomes.employed.evidence?.high ?? 0}%
          </dd>
          <span className="story__note">Of employment, from bank or employer records</span>
        </div>
        <div className="story__cell">
          <dt>Still employed at 3 months</dt>
          <dd className="num">{retained?.pct != null ? pct(retained.pct) : '—'}</dd>
          <span className="story__note">
            {retained ? `${int(retained.retained)} of ${int(retained.eligible)} due a checkpoint` : 'Not yet due'}
          </span>
        </div>
        <div className="story__cell">
          <dt>Working in the trained role</dt>
          <dd className="num" style={{ color: roleMatched && roleMatched.pct < 20 ? 'var(--accent-dark)' : undefined }}>
            {roleMatched ? pct(roleMatched.pct) : '—'}
          </dd>
          <span className="story__note">
            {roleMatched ? `${int(roleMatched.count)} in the occupation trained for` : '—'}
          </span>
        </div>
      </dl>
    </section>
  )
}
