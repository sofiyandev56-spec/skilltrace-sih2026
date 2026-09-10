import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { BRAND, COMPARISON } from '../../lib/chartTheme.js'
import { useGov } from '../../gov/GovContext.jsx'

/**
 * What the course was meant to place people into, against where they actually
 * ended up. The gap between the two bars is the skill mismatch.
 */
export default function SkillGapChart({ courses = [] }) {
  const { t } = useGov()
  if (!courses.length) return <div className="empty">{t('noCoursesInSlice')}</div>

  const data = courses.map((c) => ({
    ...c,
    short: c.course.replace(/\s*\(.*\)$/, ''),
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 4 }} barGap={2}>
        <CartesianGrid stroke={BRAND.grid} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tickLine={false}
          axisLine={{ stroke: BRAND.border }}
        />
        <YAxis type="category" dataKey="short" width={148} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(v, name) => [`${v}%`, name]}
          labelFormatter={(l, p) =>
            p?.[0] ? `${p[0].payload.course} → ${p[0].payload.intended_role}` : l
          }
        />
        <Legend wrapperStyle={{ fontSize: 11.5, paddingTop: 8 }} />
        <Bar dataKey="intended_pct" name={t('intendedJobRole')} fill={COMPARISON.target} barSize={11} />
        <Bar dataKey="actual_pct" name={t('actualJobRole')} fill={COMPARISON.actual} barSize={11} />
      </BarChart>
    </ResponsiveContainer>
  )
}

