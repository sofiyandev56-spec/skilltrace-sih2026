import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { inr } from '../../lib/format.js'
import { BRAND, cohortRamp } from '../../lib/chartTheme.js'
import { useGov } from '../../gov/GovContext.jsx'

const TIME_LABEL_HI = {
  'At placement': 'प्लेसमेंट पर (Placement)',
  '3 months': '3 माह (3 Months)',
  '6 months': '6 माह (6 Months)',
  '12 months': '12 माह (12 Months)',
}

/** Average monthly wage per cohort, tracked from placement onwards. */
export default function WageChart({ rows = [], cohorts = [] }) {
  const { lang } = useGov()
  const hi = lang === 'hi'

  if (!cohorts.length) {
    return <div className="empty">{hi ? 'इस अनुभाग में कोई वेतन रिकॉर्ड नहीं है।' : 'No wage records in this slice.'}</div>
  }

  const translatedRows = rows.map((r) => ({
    ...r,
    displayLabel: hi ? (TIME_LABEL_HI[r.label] || r.label) : r.label,
  }))

  const ramp = cohortRamp(cohorts.length)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={translatedRows} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid stroke={BRAND.grid} vertical={false} />
        <XAxis dataKey="displayLabel" tickLine={false} axisLine={{ stroke: '#dfe4e9' }} />
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
