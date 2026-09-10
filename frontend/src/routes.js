export const NAV = [
  {
    group: 'Oversight',
    items: [
      { path: '/', label: 'Dashboard' },
      { path: '/disputes', label: 'Disputes', badge: 'disputes' },
      { path: '/follow-up', label: 'Follow-up queue', badge: 'followup' },
    ],
  },
  {
    group: 'Data collection',
    items: [
      { path: '/check-in', label: 'Check-in simulator' },
      { path: '/employer', label: 'Employer confirmation' },
    ],
  },
  {
    group: 'Trainee rights',
    items: [{ path: '/consent', label: 'Consent' }],
  },
]

export const ROUTE_META = {
  '/': {
    title: 'Skilling Outcomes Dashboard',
    desc: 'Verified post-training outcomes. Employment is counted only after 3+ months at the same employer.',
  },
  '/disputes': {
    title: 'Disputed Records',
    desc: 'Where the employer and the trainee disagree, we hold both claims and record neither as fact.',
  },
  '/follow-up': {
    title: 'Assisted Follow-up Queue',
    desc: 'Trainees who did not respond after three contact attempts, for field officer assignment.',
  },
  '/check-in': {
    title: 'Check-in Simulator',
    desc: 'A simulated messaging check-in. The interface is a mockup; the API call it makes is real.',
    narrow: false,
  },
  '/consent': {
    title: 'Consent Management',
    desc: 'Every trainee can see what they agreed to and withdraw it at any time, with immediate effect.',
  },
}
