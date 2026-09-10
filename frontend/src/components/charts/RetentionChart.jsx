import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { EvidenceBadge } from '../Evidence.jsx'
import { dominantTier } from '../../lib/evidence.js'
import { pct } from '../../lib/format.js'
import { BRAND } from '../../lib/chartTheme.js'

/** % of placed trainees still at the same employer at each checkpoint. */
export default function RetentionChart({ retention = [] }) {
  const data = retention.map((r) => ({ ...r, name: r.checkpoint }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
          <CartesianGrid stroke={BRAND.grid} vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: BRAND.border }} />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tickLine={false}
            axisLine={false}
            width={46}
          />
          <ReferenceLine y={50} stroke={BRAND.border} strokeDasharray="3 3" />
          <Tooltip
            formatter={(v, _n, p) => [
              `${pct(v)} — ${p.payload.retained} of ${p.payload.eligible} placements`,
              'Still at same employer',
            ]}
          />
          <Line
            type="monotone"
            dataKey="pct"
            stroke={BRAND.navy}
            strokeWidth={2.5}
            dot={{ r: 4, fill: BRAND.navy }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="row" style={{ marginTop: 10, gap: 18 }}>
        {data.map((r) => (
          <div key={r.checkpoint} style={{ minWidth: 118 }}>
            <div className="label">{r.checkpoint}</div>
            {r.pct === null ? (
              <div className="muted small" style={{ marginTop: 2 }}>
                Checkpoint not yet due
              </div>
            ) : (
              <>
                <div className="num" style={{ fontSize: 18, fontWeight: 680 }}>{pct(r.pct)}</div>
                <div className="row" style={{ gap: 6, marginTop: 3 }}>
                  <EvidenceBadge trust={dominantTier(r.evidence).key} small />
                  <span className="faint small num">n={r.eligible}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
