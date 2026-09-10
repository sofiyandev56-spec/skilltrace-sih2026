import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { inr } from '../../lib/format.js'

const SERIES_COLORS = [
  '#14202e', '#2b6cb0', '#1a7a4c', '#b4623a',
  '#6b46a8', '#0f766e', '#a32c2c', '#8a949e',
]

/** Average monthly wage per cohort, tracked from placement onwards. */
export default function WageChart({ rows = [], cohorts = [] }) {
  if (!cohorts.length) {
    return <div className="empty">No wage records in this slice.</div>
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={rows} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid stroke="#eef1f4" vertical={false} />
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
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
