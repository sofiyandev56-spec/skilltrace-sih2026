import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApi } from '../lib/useApi.js'
import { int, longDate } from '../lib/format.js'
import { EvidenceBadge, EvidenceMeter } from '../components/Evidence.jsx'
import EvidenceFooter from '../components/EvidenceFooter.jsx'
import { COMPARISON } from '../lib/chartTheme.js'
import { useGov } from '../gov/GovContext.jsx'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * The one thing worth saying about this centre, chosen from its own numbers.
 *
 * A centre with high placement but low role-match is not failing — it is
 * placing people into work the course did not train them for, which is a
 * curriculum-to-employer alignment problem, not a fraud problem. The copy
 * has to say that without sounding like an accusation.
 */
function insightFor(p, t) {
  if (!p || !p.certified_count) return null

  if (p.employment_pct >= 45 && p.role_matched_pct < p.employment_pct * 0.45) {
    return {
      tone: 'saffron',
      title: t('strongButLow'),
      body: `${p.employment_pct}% of certified trainees hold confirmed employment, but only ${p.role_matched_pct}% work in the role they trained for. Review course-to-employer alignment before expanding intake.`,
      action: t('createFollowup'),
    }
  }
  if (p.stale_pct >= 25) {
    return {
      tone: 'saffron',
      title: t('tooManyQuiet'),
      body: `${p.stale_pct}% of this centre's trainees have no reliable signal in the current tracking period. Outcomes here are being measured on a shrinking base.`,
      action: t('sendToFollowup'),
    }
  }
  if (p.verified_pct < 25 && p.employment_pct >= 30) {
    return {
      tone: 'saffron',
      title: t('restsSelfReport'),
      body: `Only ${p.verified_pct}% of this centre's employment outcomes are independently verified. The centre is not the sole source of its own score, so this figure should not be read as performance.`,
      action: t('requestEmployerConfirm'),
    }
  }
  return {
    tone: 'green',
    title: t('wellEvidenced'),
    body: `${p.verified_pct}% of employment outcomes at this centre are backed by evidence the centre did not produce itself.`,
    action: t('downloadReport'),
  }
}

function Metric({ label, value, unit, sub, evidence }) {
  return (
    <div className="stat stat--plain">
      <span className="stat__label">{label}</span>
      <span className="stat__value">
        {value}
        {unit ? <small>{unit}</small> : null}
      </span>
      <span className="stat__foot">
        {sub ? <span className="stat__sub">{sub}</span> : null}
        {evidence ? <EvidenceMeter evidence={evidence} /> : null}
      </span>
    </div>
  )
}

export default function ProviderDetail() {
  const { t } = useGov()
  const { id } = useParams()
  const { data, loading } = useApi(() => api.getProvider(id), [id])

  if (loading) return <p className="empty">{t('loadingCentre')}</p>
  if (!data)
    return (
      <div className="stack">
        <p className="empty">{t('noCentreFound', id)}</p>
        <Link className="btn" to="/">
          {t('backToDashboard')}
        </Link>
      </div>
    )

  const insight = insightFor(data, t)
  const chartData = data.by_course.map((c) => ({
    course: c.course.length > 22 ? `${c.course.slice(0, 20)}…` : c.course,
    fullCourse: c.course,
    Employment: c.employment_pct,
    'Role-matched': c.role_match_pct,
  }))

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">{data.name}</h2>
            <p className="panel__desc">
              {data.district} · {data.courses.length} {t('course')?.toLowerCase() || 'course'}
              {data.courses.length === 1 ? '' : 's'} · {t('assessedTo', longDate(data.as_of))}
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className="pill pill--resolved">{data.status}</span>
            <span className="confidence" title="How much of this centre's reported success is backed by evidence it did not produce itself">
              {t('evidenceConfidence')} <strong className="num">{data.confidence_score}</strong>
              <small> / 100</small>
            </span>
          </div>
        </div>

        <ul className="courselist">
          {data.courses.map((c) => (
            <li className="chip" key={c}>
              {c}
            </li>
          ))}
        </ul>

        <div className="grid grid--6" style={{ padding: '0 18px 18px' }}>
          <Metric label={t('certified')} value={int(data.certified_count)} sub={t('completedAndAssessed')} />
          <Metric
            label={t('reportedPlacement')}
            value={data.headline_placement_pct}
            unit="%"
            sub={t('anyoneWithPlacement')}
          />
          <Metric
            label={t('verifiedEmployment')}
            value={data.employment_pct}
            unit="%"
            sub={t('threeMonthsOneEmployer')}
            evidence={data.evidence}
          />
          <Metric
            label={t('indepVerified')}
            value={data.verified_pct}
            unit="%"
            sub={t('bankOrEmployer')}
          />
          <Metric
            label={t('roleMatched')}
            value={data.role_matched_pct}
            unit="%"
            sub={t('inOccupationTrained')}
          />
          <Metric label={t('stale')} value={data.stale_pct} unit="%" sub={t('noRecentSignal')} />
        </div>
      </section>

      {insight ? (
        <section className={`insight insight--${insight.tone}`}>
          <h3 className="insight__title">{insight.title}</h3>
          <p className="insight__body">{insight.body}</p>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <Link className="btn btn--primary" to="/follow-up">
              {insight.action}
            </Link>
            <Link className="btn" to="/audit">
              {t('seeSourceEvents')}
            </Link>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">{t('employmentRoleRelevance')}</h2>
            <p className="panel__desc">
              {t('employmentRoleDesc')}
            </p>
          </div>
        </div>

        <div style={{ width: '100%', height: Math.max(240, chartData.length * 52) }}>
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="#dfe4e9" />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="course"
                width={150}
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <Tooltip
                formatter={(v, n) => [`${v}%`, n]}
                labelFormatter={(l, payload) => payload?.[0]?.payload?.fullCourse || l}
              />
              <Legend />
              <Bar dataKey="Employment" fill={COMPARISON.actual} radius={[0, 2, 2, 0]} />
              <Bar dataKey="Role-matched" fill={COMPARISON.target} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <details className="datatable">
          <summary>{t('viewChartAsTable') || 'View this chart as a table'}</summary>
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">{t('colCourse')}</th>
                  <th scope="col">{t('colIntendedRole')}</th>
                  <th scope="col">{t('certified')}</th>
                  <th scope="col">{t('colEmployment')}</th>
                  <th scope="col">{t('roleMatched')}</th>
                  <th scope="col">{t('colEvidence')}</th>
                </tr>
              </thead>
              <tbody>
                {data.by_course.map((c) => (
                  <tr key={c.course}>
                    <td>{c.course}</td>
                    <td className="muted">{c.intended_role || '—'}</td>
                    <td className="num">{int(c.certified)}</td>
                    <td className="num">{c.employment_pct}%</td>
                    <td className="num">{c.role_match_pct}%</td>
                    <td style={{ minWidth: 120 }}>
                      <EvidenceMeter evidence={c.evidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <EvidenceFooter evidence={data.evidence} />
      </section>

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <Link className="btn" to="/">
          {t('backToAllCentres')}
        </Link>
        <Link className="btn" to="/audit">
          {t('seeSourceEvents')}
        </Link>
      </div>
    </div>
  )
}
