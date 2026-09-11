/**
 * Pre-configured Demo Trainee Profiles for SkillTrace Client Portal.
 *
 * Designed specifically for prototype demonstration and hackathon evaluation:
 * - Trainee 1 (Aarti Patil): Completed -> Certified -> Employed & Verified (Sanjeevani Hospital)
 * - Trainee 2 (Rahul Sharma): Completed -> Certified -> Placed (GreenVolt Solar Solutions) -> Awaiting 3-Month Confirmation
 *
 * Fully isolated from real administrative functions; uses existing backend APIs.
 */

export const DEMO_TRAINEES = [
  {
    id: 'TRN-0001',
    name: 'Aarti Patil',
    shortName: 'Aarti',
    role: 'client',
    course: 'Healthcare Assistant',
    trainingCenter: 'Pragati Skill Centre, Pune',
    district: 'Nashik',
    gender: 'Female',
    cohort: '2025-Q1',
    statusTag: 'Certified • Employed',
    statusType: 'employed',
    statusBadgeColor: '#16803C',
    employer: 'Sanjeevani Hospital',
    salary: 16500,
    trust: 'high',
    desc: 'NSQF Level 4 Certified · 3+ months verified employment at Sanjeevani Hospital.',
    highlights: [
      'NSQF Level 4 Certification',
      'Verified Employment (Hospital Records)',
      'Monthly Earnings: ₹16,500'
    ]
  },
  {
    id: 'TRN-0004',
    name: 'Rahul Sharma',
    shortName: 'Rahul',
    role: 'client',
    course: 'Solar Technician',
    trainingCenter: 'Vidarbha Technical Institute, Thane',
    district: 'Thane',
    gender: 'Male',
    cohort: '2025-Q3',
    statusTag: 'Certified • Employment Follow-up',
    statusType: 'awaiting_confirmation',
    statusBadgeColor: '#A65308',
    employer: 'GreenVolt Solar Solutions',
    salary: 15000,
    trust: 'medium',
    desc: 'NSQF Level 3 Certified · Placed at GreenVolt Solar Solutions · Awaiting 3-month milestone verification.',
    highlights: [
      'NSQF Level 3 Certification',
      'Placed with GreenVolt Solar Solutions',
      '3-Month Milestone Check-in Due'
    ]
  }
]

/**
 * Returns mock trainee fallback payload for offline / mock mode.
 */
export function getDemoTraineeMockData(id) {
  if (id === 'TRN-0001') {
    return {
      id: 'TRN-0001',
      name: 'Aarti Patil',
      course: 'Healthcare Assistant',
      district: 'Nashik',
      gender: 'Female',
      age_group: '22',
      category: 'General',
      phone: '9125671886',
      cohort: '2025-Q1',
      provider_id: 'PRV-001',
      provider_name: 'Pragati Skill Centre, Pune',
      employer: 'Sanjeevani Hospital',
      salary: 16500,
      outcome: 'employed',
      bucket: 'employed',
      trust: 'high',
      trust_level: 'high',
      certification_date: '2025-01-10',
      placement_date: '2025-01-28',
      events: [
        {
          id: 'EVT-0001-1',
          trainee_id: 'TRN-0001',
          date: '2025-01-28',
          what_happened: 'placed',
          employer: 'Sanjeevani Hospital',
          job_role: 'Healthcare Assistant',
          salary: 14000,
          source: 'employer_portal',
          trust_level: 'high'
        },
        {
          id: 'EVT-0001-2',
          trainee_id: 'TRN-0001',
          date: '2025-04-30',
          what_happened: 'still_working',
          employer: 'Sanjeevani Hospital',
          job_role: 'Healthcare Assistant',
          salary: 14000,
          source: 'employer_portal',
          trust_level: 'high'
        },
        {
          id: 'EVT-0001-3',
          trainee_id: 'TRN-0001',
          date: '2025-07-31',
          what_happened: 'still_working',
          employer: 'Sanjeevani Hospital',
          job_role: 'Senior Healthcare Assistant',
          salary: 16500,
          source: 'bank_verified',
          trust_level: 'high'
        }
      ]
    }
  }

  if (id === 'TRN-0004') {
    return {
      id: 'TRN-0004',
      name: 'Rahul Sharma',
      course: 'Solar Technician',
      district: 'Thane',
      gender: 'Male',
      age_group: '24',
      category: 'OBC',
      phone: '9820012345',
      cohort: '2025-Q3',
      provider_id: 'PRV-003',
      provider_name: 'Vidarbha Technical Institute, Thane',
      employer: 'GreenVolt Solar Solutions',
      salary: 15000,
      outcome: 'awaiting_confirmation',
      bucket: 'awaiting_confirmation',
      trust: 'medium',
      trust_level: 'medium',
      certification_date: '2025-08-15',
      placement_date: '2025-09-01',
      events: [
        {
          id: 'EVT-TRN-0004-1',
          trainee_id: 'TRN-0004',
          date: '2025-09-01',
          what_happened: 'placed',
          employer: 'GreenVolt Solar Solutions',
          job_role: 'Solar Installation Technician',
          salary: 15000,
          source: 'employer_portal',
          trust_level: 'medium'
        }
      ]
    }
  }

  return null
}
