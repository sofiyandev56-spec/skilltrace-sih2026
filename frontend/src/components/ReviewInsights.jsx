import { EvidenceBadge } from './Evidence.jsx'
import { int } from '../lib/format.js'
import { useGov } from '../gov/GovContext.jsx'

const QUESTION_LABEL_HI = {
  overall_quality: 'समग्र गुणवत्ता',
  job_usefulness: 'रोजगार उपयोगिता',
  trainer_rating: 'प्रशिक्षक प्रभाव',
  confidence: 'कौशल आत्मविश्वास',
  recommend: 'सुझाव दर',
}

/**
 * Aggregate post-training feedback for the oversight view.
 */
function Meter({ value }) {
  const pct = value === null ? 0 : ((value - 1) / 4) * 100
  const tone = value === null ? 'var(--border-strong)' : value >= 4 ? 'var(--tier-high)' : value >= 3 ? 'var(--tier-medium)' : 'var(--accent)'
  return (
    <span className="ratebar" aria-hidden="true">
      <span style={{ width: `${pct}%`, background: tone }} />
    </span>
  )
}

export default function ReviewInsights({ data, loading }) {
  const { lang } = useGov()
  const hi = lang === 'hi'

  if (loading && !data) return <div className="skeleton" style={{ height: 190 }} />
  if (!data || !data.responses) {
    return (
      <div className="empty">
        <h4>{hi ? 'इस अनुभाग में कोई समीक्षा नहीं है' : 'No feedback in this slice'}</h4>
        <p>{hi ? 'इन फ़िल्टरों से मेल खाने वाले किसी भी प्रशिक्षार्थी ने अभी तक समीक्षा पूरी नहीं की है।' : 'No trainee matching these filters has completed a training review yet.'}</p>
      </div>
    )
  }

  const worst = data.providers.length > 2 ? data.providers[data.providers.length - 1] : null

  return (
    <div>
      <div className="rategrid">
        {data.questions.map((q) => (
          <div className="rate" key={q.id} title={q.prompt}>
            <span className="rate__label">{hi ? (QUESTION_LABEL_HI[q.id] || q.label) : q.label}</span>
            <span className="rate__value num">
              {q.out_of_five ?? '—'}
              <small>/5</small>
            </span>
            <Meter value={q.out_of_five} />
          </div>
        ))}
        <div className="rate rate--accent">
          <span className="rate__label">{hi ? 'सिफारिश दर' : 'Recommendation rate'}</span>
          <span className="rate__value num">
            {data.recommend_rate ?? '—'}
            <small>%</small>
          </span>
          <span className="rate__foot">{hi ? 'निश्चित या संभावित बताया' : 'said definitely or probably'}</span>
        </div>
      </div>

      <div className="rate__meta">
        <EvidenceBadge trust="low" small />
        <span className="small muted">
          {hi ? (
            <>
              <b className="num">{int(data.responses)}</b> प्रतिक्रियाएं <b className="num">{int(data.eligible)}</b> प्रशिक्षार्थियों से ({data.response_rate}% प्रतिक्रिया दर)।
              व्यक्तिगत राय, परिणाम नहीं — इसे स्वतंत्र रूप से सत्यापित नहीं किया जा सकता और कभी भी किसी नामांकित प्रशिक्षार्थी से नहीं जोड़ा जाता।
            </>
          ) : (
            <>
              <b className="num">{int(data.responses)}</b> responses from{' '}
              <b className="num">{int(data.eligible)}</b> trainees ({data.response_rate}% response rate).
              Opinions, not outcomes — these cannot be independently verified and are never attributed to a
              named trainee.
            </>
          )}
        </span>
      </div>

      {data.providers.length > 1 && (
        <div className="ratecentres">
          <div>
            <span className="label">{hi ? 'सर्वोत्तम रेटेड केंद्र' : 'Best rated centre'}</span>
            <div className="ratecentres__row">
              <b>{data.providers[0].name}</b>
              <span className="num">{data.providers[0].out_of_five}/5</span>
            </div>
            <span className="faint small">
              {data.providers[0].district} · {data.providers[0].responses} {hi ? 'प्रतिक्रियाएं' : 'responses'}
            </span>
          </div>
          {worst && (
            <div>
              <span className="label" style={{ color: 'var(--accent-dark)' }}>
                {hi ? 'न्यूनतम रेटेड केंद्र' : 'Lowest rated centre'}
              </span>
              <div className="ratecentres__row">
                <b>{worst.name}</b>
                <span className="num">{worst.out_of_five}/5</span>
              </div>
              <span className="faint small">
                {worst.district} · {worst.responses} {hi ? 'प्रतिक्रियाएं' : 'responses'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
