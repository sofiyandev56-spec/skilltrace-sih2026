import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { inr } from '../../lib/format.js'
import { BRAND, cohortRamp } from '../../lib/chartTheme.js'
import { useGov } from '../../gov/GovContext.jsx'

/** Average monthly wage per cohort, tracked from placement onwards. */
export default function WageChart({ rows = [], cohorts = [] }) {
  const { t } = useGov()
  if (!cohorts.length) {
    return <div className="empty">{t('noWageRecords')}</div>
  }
  const ramp = cohortRamp(cohorts.length)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={rows} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid stroke={BRAND.grid} vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#dfe4e9' }} />
        <YAxis
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip formatter={(v, name) => [inr(v), name]} />
        <Legend wrapperStyle={{ fontSize: 11.5, paddingTop: 8 }} iconType="plainline" iconSize={14} />
        {cohorts.map((c, i) => (
          <Line
            key={c}
            type="monotone"
            dataKey={c}
            name={c}
            stroke={ramp[i]}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

