/**
 * Navigation and page metadata. Labels are i18n keys rather than literal
 * strings so the whole site frame switches with the language selector.
 */
export const NAV = [
  {
    groupKey: 'navOversight',
    items: [
      { path: '/', labelKey: 'navDashboard' },
      { path: '/disputes', labelKey: 'navDisputes', badge: 'disputes' },
      { path: '/follow-up', labelKey: 'navFollowup', badge: 'followup' },
    ],
  },
  {
    groupKey: 'navCollection',
    items: [
      { path: '/check-in', labelKey: 'navCheckin' },
      { path: '/employer', labelKey: 'navEmployer' },
    ],
  },
  {
    groupKey: 'navRights',
    items: [
      { path: '/consent', labelKey: 'navConsent' },
      { path: '/policies', labelKey: 'navPolicies' },
    ],
  },
]

export const ROUTE_META = {
  '/': { titleKey: 'titleDashboard', descKey: 'descDashboard', crumbKey: null },
  '/disputes': { titleKey: 'titleDisputes', descKey: 'descDisputes', crumbKey: 'navDisputes' },
  '/follow-up': { titleKey: 'titleFollowup', descKey: 'descFollowup', crumbKey: 'navFollowup' },
  '/check-in': { titleKey: 'titleCheckin', descKey: 'descCheckin', crumbKey: 'navCheckin' },
  '/consent': { titleKey: 'titleConsent', descKey: 'descConsent', crumbKey: 'navConsent' },
  '/policies': { titleKey: 'titlePolicies', descKey: 'descPolicies', crumbKey: 'navPolicies' },
}
