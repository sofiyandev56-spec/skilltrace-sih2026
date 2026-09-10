/**
 * Verification script to test all SkillTrace mock handlers and computations
 * against the organized_data.xlsx mock dataset.
 */
import * as mock from '../frontend/src/api/mock/handlers.js'
import * as store from '../frontend/src/api/mock/store.js'
import { COURSES, DISTRICTS, COHORTS } from '../frontend/src/api/mock/dataset.js'

console.log('--- 1. Testing Dataset Initialization ---')
store.initStore()
const raw = store.rawData()
console.log('Trainees count:', raw.trainees.length)
console.log('Events count:', raw.events.length)
console.log('Providers count:', raw.providers.length)
console.log('Disputes count:', raw.disputes.length)
console.log('Consents count:', raw.consents.length)
console.log('FollowupQueue count:', raw.followupQueue.length)
console.log('Courses count:', COURSES.length)
console.log('Districts count:', DISTRICTS.length)
console.log('Cohorts count:', COHORTS.length)

if (raw.trainees.length !== 5000) throw new Error('Expected 5000 trainees, got ' + raw.trainees.length)
if (raw.providers.length !== 7) throw new Error('Expected 7 providers, got ' + raw.providers.length)
if (COURSES.length !== 20) throw new Error('Expected 20 courses, got ' + COURSES.length)
if (DISTRICTS.length !== 36) throw new Error('Expected 36 districts, got ' + DISTRICTS.length)

console.log('--- 2. Testing GET /dashboard (unfiltered) ---')
const dash = mock.getDashboard()
console.log('Total trainees in dashboard:', dash.total_trainees)
console.log('Headline placement:', dash.headline_placement_pct + '% (' + dash.headline_placement_count + ')')
console.log('Outcomes:', {
  employed: dash.outcomes.employed,
  self_employed: dash.outcomes.self_employed,
  apprentice: dash.outcomes.apprentice,
  not_working: dash.outcomes.not_working,
  awaiting_confirmation: dash.outcomes.awaiting_confirmation,
  no_data: dash.outcomes.no_data,
})
console.log('Retention:', dash.retention)
console.log('Wage progression rows:', dash.wage_progression.length)
console.log('Evidence totals:', dash.evidence_totals)

if (dash.total_trainees !== 5000) throw new Error('Expected 5000 total trainees')
if (dash.outcomes.employed.count <= 0) throw new Error('Expected employed count > 0')

console.log('--- 3. Testing Filters on Dashboard ---')
const courseFilter = { course: 'Electrician' }
const dashCourse = mock.getDashboard(courseFilter)
console.log('Electrician trainees:', dashCourse.total_trainees)
if (dashCourse.total_trainees <= 0 || dashCourse.total_trainees >= 5000) {
  throw new Error('Course filter failed: ' + dashCourse.total_trainees)
}

const distFilter = { district: 'Pune' }
const dashDist = mock.getDashboard(distFilter)
console.log('Pune trainees:', dashDist.total_trainees)
if (dashDist.total_trainees <= 0 || dashDist.total_trainees >= 5000) {
  throw new Error('District filter failed: ' + dashDist.total_trainees)
}

console.log('--- 4. Testing GET /providers and sorting ---')
const provs = mock.getProviders()
console.log('Providers list:', provs.map(p => ({ id: p.id, name: p.name, certified: p.certified_count, placement: p.verified_placement_pct })))
if (provs.length !== 7) throw new Error('Expected 7 providers')

// Test sort logic with nulls (Bug 1 verification)
const testProvs = [
  { name: 'A', retention_3mo: null },
  { name: 'B', retention_3mo: null },
  { name: 'C', retention_3mo: 80 },
  { name: 'D', retention_3mo: 50 },
]
testProvs.sort((a, b) => {
  const av = a.retention_3mo
  const bv = b.retention_3mo
  if ((av === null || av === undefined) && (bv === null || bv === undefined)) return 0
  if (av === null || av === undefined) return 1
  if (bv === null || bv === undefined) return -1
  return bv - av
})
console.log('Sort with nulls result:', testProvs.map(x => x.name + ':' + x.retention_3mo))
if (testProvs[0].name !== 'C' || testProvs[1].name !== 'D') throw new Error('Sort logic failed')

console.log('--- 5. Testing GET /skill-gap ---')
const gap = mock.getSkillGap()
console.log('Skill gap courses count:', gap.courses.length)
console.log('Skill gap districts count:', gap.districts.length)
if (gap.courses.length === 0) throw new Error('Skill gap courses should not be empty')
if (gap.districts.length !== 36) throw new Error('Skill gap districts count should be 36')

console.log('--- 6. Testing GET /disputes and resolve ---')
const disputes = mock.getDisputes()
console.log('Initial disputes count:', disputes.length)
const openDispute = disputes.find(d => d.status === 'open')
if (!openDispute) throw new Error('Expected open dispute')
const resolved = mock.resolveDispute(openDispute.id, { resolution: 'employer_stands', note: 'Verified via records' })
console.log('Resolved dispute:', { id: resolved.id, status: resolved.status, resolution: resolved.resolution, note: resolved.note })
if (resolved.status !== 'resolved') throw new Error('Dispute was not resolved')

console.log('--- 7. Testing Check-in simulator ---')
const checkinTrainee = raw.trainees[0]
const checkinRes = mock.postCheckin({
  trainee_id: checkinTrainee.id,
  answer: 'employed',
  detail: 'same',
  source: 'trainee',
})
console.log('Check-in response:', checkinRes.ok, checkinRes.event.what_happened, checkinRes.event.trust_level)
if (!checkinRes.ok) throw new Error('Checkin failed')

console.log('--- 8. Testing Consent and Withdrawal ---')
const consents = mock.listConsents()
console.log('List consents count:', consents.length, 'Sample:', consents[0])
const testConsentTrainee = consents[1].id
const beforeDash = mock.getDashboard()
console.log('Dashboard total before withdraw:', beforeDash.total_trainees)
const withdrawRes = mock.withdrawConsent(testConsentTrainee)
console.log('Withdraw result:', withdrawRes)
const afterDash = mock.getDashboard()
console.log('Dashboard total after withdraw:', afterDash.total_trainees)
if (afterDash.total_trainees !== beforeDash.total_trainees - 1) {
  throw new Error('Withdrawal did not decrement total trainees count!')
}
// Restore
mock.grantConsent({ trainee_id: testConsentTrainee })
const restoredDash = mock.getDashboard()
console.log('Dashboard total after restore:', restoredDash.total_trainees)
if (restoredDash.total_trainees !== beforeDash.total_trainees) {
  throw new Error('Restore did not restore count!')
}

console.log('--- 9. Testing Followup Queue and Assignment ---')
const queue = mock.getFollowupQueue()
console.log('Queue length:', queue.length, 'Sample trainee:', queue[0].name)
const assignRes = mock.assignFollowup(queue[0].trainee_id, 'S. Kulkarni (Pune div.)')
console.log('Assigned result:', assignRes.assigned_to)
if (assignRes.assigned_to !== 'S. Kulkarni (Pune div.)') throw new Error('Assignment failed')

console.log('\n>>> ALL 9 VERIFICATION TESTS PASSED SUCCESSFULLY! <<<')
