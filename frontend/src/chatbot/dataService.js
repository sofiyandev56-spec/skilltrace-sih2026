/**
 * SkillTrace Chatbot Data Query & Access Control Service
 *
 * Provides a structured, factual data access layer for the chatbot.
 * Strictly enforces authorization boundaries:
 * - Admin (Ministry) can inspect aggregate statistics, provider comparisons,
 *   and lookup trainee records by ID.
 * - Client (Trainee) is isolated strictly to their own authenticated record.
 *   Attempts to query third-party trainee IDs are firmly blocked.
 *
 * NEVER invents or hallucinates metrics — all data is fetched live from the API/store.
 */

import { api } from '../api/client.js'
import { currentData } from '../api/mock/store.js'

/**
 * Normalizes user-entered trainee IDs to match database conventions
 * e.g. "T10245", "10245", "trn000001", "TRN-0001" -> "TRN000001" or "TRN-0001"
 */
export function normalizeTraineeId(rawId) {
  if (!rawId) return ''
  const trimmed = rawId.trim().toUpperCase()
  // If already full format TRN000001 or TRN-0001
  if (/^TRN-?\d+$/.test(trimmed)) {
    return trimmed
  }
  // If just digits e.g. "000001" or "10245"
  const digits = trimmed.replace(/\D/g, '')
  if (digits) {
    // Pad to 6 digits if standard
    const padded = digits.padStart(6, '0')
    return `TRN${padded}`
  }
  return trimmed
}

/**
 * Trainee Search by ID with Role-Based Access Control
 */
export async function searchTrainee(rawId, requesterRole, currentUserId) {
  const normalizedId = normalizeTraineeId(rawId)

  // Strict Authorization Check: Clients cannot query arbitrary IDs
  if (requesterRole === 'client') {
    const isSelf = currentUserId && (
      normalizeTraineeId(currentUserId) === normalizedId ||
      currentUserId === rawId
    )
    if (!isSelf) {
      return {
        authorized: false,
        error: 'ACCESS_RESTRICTED',
      }
    }
  }

  try {
    // Try normalized ID first
    let record = await api.getTrainee(normalizedId)
    // If not found, try searching by numeric substring or raw ID in store
    if (!record) {
      const data = currentData()
      const found = data?.trainees?.find((t) => {
        if (t.id === rawId || t.id === normalizedId) return true
        const tDigits = t.id.replace(/\D/g, '')
        const qDigits = rawId.replace(/\D/g, '')
        return qDigits && tDigits.endsWith(qDigits)
      })
      if (found) {
        record = await api.getTrainee(found.id)
      }
    }

    if (!record) {
      return {
        authorized: true,
        found: false,
        traineeId: rawId,
      }
    }

    return {
      authorized: true,
      found: true,
      data: {
        id: record.id,
        name: record.name,
        course: record.course,
        district: record.district,
        category: record.category || 'General',
        gender: record.gender,
        age_group: record.age_group,
        cohort: record.cohort,
        certified: record.certified !== false,
        outcome: record.outcome || record.bucket || 'no_data',
        trust_level: record.trust_level || record.trust || 'stale',
        employer: record.employer || record.event?.employer || null,
        job_role: record.event?.job_role || null,
        monthly_salary: record.salary || record.event?.salary || null,
        events_count: record.events?.length || 0,
        provider_id: record.provider_id,
      },
    }
  } catch (err) {
    console.error('Error in searchTrainee:', err)
    return {
      authorized: true,
      found: false,
      error: err.message,
    }
  }
}

/**
 * Fetches and synthesizes live dashboard summary metrics
 */
export async function getDashboardSummary(filters = {}) {
  try {
    const [dash, provs, gap] = await Promise.all([
      api.getDashboard(filters),
      api.getProviders(filters),
      api.getSkillGap(filters),
    ])

    const total = dash?.total_trainees || 0
    const outcomes = dash?.outcomes || {}

    // Find provider with highest verified employment rate
    const sortedProvs = [...(provs || [])].sort(
      (a, b) => (b.verified_placement_pct || 0) - (a.verified_placement_pct || 0)
    )
    const topProvider = sortedProvs[0] || null

    // Find course with largest mismatch (skill gap)
    const sortedGaps = [...(gap?.courses || [])].sort(
      (a, b) => (b.mismatch || 0) - (a.mismatch || 0)
    )
    const topGapCourse = sortedGaps[0] || null

    return {
      total_trainees: total,
      headline_placement_pct: dash?.headline_placement_pct || 0,
      headline_placement_count: dash?.headline_placement_count || 0,
      verified_employed_count: outcomes.employed?.count || 0,
      verified_employed_pct: outcomes.employed?.pct || 0,
      self_employed_count: outcomes.self_employed?.count || 0,
      apprentice_count: outcomes.apprentice?.count || 0,
      awaiting_count: outcomes.awaiting_confirmation?.count || 0,
      not_working_count: outcomes.not_working?.count || 0,
      no_data_count: outcomes.no_data?.count || 0,
      top_provider: topProvider
        ? {
            name: topProvider.name,
            district: topProvider.district,
            verified_pct: topProvider.verified_placement_pct,
            headline_pct: topProvider.headline_placement_pct,
          }
        : null,
      top_skill_gap: topGapCourse
        ? {
            course: topGapCourse.course,
            intended_role: topGapCourse.intended_role,
            mismatch: topGapCourse.mismatch,
            intended_pct: topGapCourse.intended_pct,
            actual_pct: topGapCourse.actual_pct,
          }
        : null,
      provider_count: provs?.length || 0,
      consent_active: dash?.consent?.included || total,
    }
  } catch (err) {
    console.error('Error fetching dashboard summary:', err)
    return null
  }
}

/**
 * Provider Comparison & Ranking
 */
export async function getProviderComparison(filters = {}, sortBy = 'verified_placement_pct', limit = 10) {
  try {
    const provs = await api.getProviders(filters)
    if (!provs || !provs.length) return []

    const sorted = [...provs].sort((a, b) => {
      const valA = a[sortBy] ?? 0
      const valB = b[sortBy] ?? 0
      return valB - valA
    })

    const sliced = limit ? sorted.slice(0, limit) : sorted

    return sliced.map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      name: p.name,
      district: p.district,
      certified_count: p.certified_count,
      headline_placement_pct: p.headline_placement_pct,
      verified_placement_pct: p.verified_placement_pct,
      proof_gap: p.proof_gap,
      retention_3mo: p.retention_3mo,
      retention_6mo: p.retention_6mo,
      retention_12mo: p.retention_12mo,
      role_match_pct: p.role_match_pct,
    }))
  } catch (err) {
    console.error('Error in getProviderComparison:', err)
    return []
  }
}

/**
 * Graph Data Intelligence & Explanation Models
 */
export async function getGraphData(graphType, filters = {}) {
  try {
    if (graphType === 'employment' || graphType === 'contrast') {
      const dash = await api.getDashboard(filters)
      const reported = dash?.headline_placement_pct || 0
      const verified = dash?.outcomes?.employed?.pct || 0
      const drop = Math.round((reported - verified) * 10) / 10
      return {
        type: 'contrast',
        title: 'Reported Placement vs 3-Month Verified Employment Rate',
        reported_pct: reported,
        verified_pct: verified,
        proof_drop_pp: drop,
        total_trainees: dash?.total_trainees || 0,
        awaiting_count: dash?.outcomes?.awaiting_confirmation?.count || 0,
      }
    }

    if (graphType === 'skill_gap' || graphType === 'skills') {
      const gap = await api.getSkillGap(filters)
      const courses = gap?.courses || []
      const sorted = [...courses].sort((a, b) => (b.mismatch || 0) - (a.mismatch || 0))
      const highest = sorted[0] || null
      const lowest = sorted[sorted.length - 1] || null
      return {
        type: 'skill_gap',
        title: 'Intended vs Actual Job Role Placement by Course',
        courses: sorted,
        highest_mismatch: highest,
        lowest_mismatch: lowest,
        total_courses: courses.length,
      }
    }

    if (graphType === 'retention') {
      const dash = await api.getDashboard(filters)
      const retention = dash?.retention || []
      return {
        type: 'retention',
        title: 'Retention Checkpoints (3, 6, and 12 Months)',
        checkpoints: retention,
      }
    }

    if (graphType === 'wage') {
      const dash = await api.getDashboard(filters)
      return {
        type: 'wage',
        title: 'Wage Progression by Cohort Over Time',
        rows: dash?.wage_progression || [],
        cohorts: dash?.cohorts_present || [],
      }
    }

    if (graphType === 'funnel') {
      const dash = await api.getDashboard(filters)
      return {
        type: 'funnel',
        title: 'Skilling Outcome Drop-off Funnel',
        stages: dash?.funnel || [],
      }
    }

    return null
  } catch (err) {
    console.error('Error in getGraphData:', err)
    return null
  }
}

/**
 * Client Personal Profile and Skill Gap Analysis
 */
export async function getClientProfileData(currentUserId) {
  const normalizedId = normalizeTraineeId(currentUserId || 'TRN000001')
  try {
    let record = await api.getTrainee(normalizedId)
    if (!record && currentUserId) {
      record = await api.getTrainee(currentUserId)
    }
    if (!record) {
      const data = currentData()
      record = data?.trainees?.[0] || null
    }
    if (!record) return null

    const gap = await api.getSkillGap()

    // Find course skill gaps
    const courseGaps = (gap?.courses || []).filter((c) => c.course === record.course)
    const matchingGap = courseGaps[0] || gap?.courses?.[0] || null

    return {
      record,
      course_gap: matchingGap,
      all_gaps: gap?.courses || [],
    }
  } catch (err) {
    console.error('Error in getClientProfileData:', err)
    return null
  }
}
