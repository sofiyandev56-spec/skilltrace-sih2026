/**
 * Colours for data that is NOT an evidence tier.
 *
 * The four tier colours in `evidence.js` are reserved: green means Verified,
 * blue Corroborated, orange Self-reported, grey Stale — everywhere, on every
 * screen, without exception. A chart that borrows one of them to mean
 * "2025-Q1" or "above target" quietly breaks that promise, because the reader
 * has already been taught what green means. So series and comparison colours
 * come from here instead, and never overlap with a tier.
 */

/** Brand tokens, mirrored from global.css so charts can use them in JS. */
export const BRAND = {
  navy: '#14202e',
  navyMid: '#33475f',
  accent: '#b4623a',
  border: '#dfe4e9',
  borderStrong: '#c3cbd3',
  grid: '#eef1f4',
  sunken: '#eef1f4',
  subtle: '#f6f8fa',
  textMuted: '#55636f',
}

function lerp(from, to, t) {
  const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [r1, g1, b1] = parse(from)
  const [r2, g2, b2] = parse(to)
  const mix = (a, b) => Math.round(a + (b - a) * t)
  return `rgb(${mix(r1, r2)}, ${mix(g1, g2)}, ${mix(b1, b2)})`
}

/**
 * Cohorts are ordinal — 2024-Q3 comes before 2025-Q1 — so they get a single-hue
 * sequential ramp rather than arbitrary categorical hues. Older cohorts read
 * lighter, the newest reads darkest, which makes the ordering legible without
 * consulting the legend at all.
 */
export function cohortRamp(count) {
  if (count <= 1) return [BRAND.navy]
  return Array.from({ length: count }, (_, i) =>
    lerp('#8fa6bd', BRAND.navy, i / (count - 1)),
  )
}

/** Two-way comparisons: what was planned against what happened. */
export const COMPARISON = {
  target: BRAND.borderStrong,
  actual: BRAND.navy,
}

/** Neutral magnitude fill for in-table bars — length carries the meaning. */
export const MAGNITUDE = BRAND.navyMid

/**
 * Continuous heat ramp for the district skill-gap grid. A ramp is exempt from
 * the collision rule above: it is continuous, carries its own legend, and can
 * never be mistaken for one of the categorical tier pills.
 */
export const HEAT = { from: '#fbf1ec', to: '#8f4a29', empty: BRAND.subtle }

export function heatShade(value, max = 60) {
  if (value === null || value === undefined) {
    return { bg: HEAT.empty, fg: BRAND.textMuted }
  }
  const t = Math.min(1, Math.max(0, value / max))
  return { bg: lerp(HEAT.from, HEAT.to, t), fg: t > 0.55 ? '#fff' : BRAND.navy }
}
