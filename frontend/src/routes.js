/**
 * Page metadata, as translation keys.
 *
 * The breadcrumb bar and the document title both read from here. Keys rather
 * than per-language fields: a fourth language should mean adding a column to
 * the dictionary, never touching this file.
 */
export const ROUTE_META = {
  '/ministry': { titleKey: 'titleDashboard', descKey: 'descDashboard', sectionKey: 'navOversight' },
  '/ministry/disputes': { titleKey: 'titleDisputes', descKey: 'descDisputes', sectionKey: 'navOversight' },
  '/ministry/follow-up': { titleKey: 'titleFollowup', descKey: 'descFollowup', sectionKey: 'navOversight' },
  '/ministry/audit': { titleKey: 'titleAudit', descKey: 'descAudit', sectionKey: 'secTransparency' },
  '/ministry/login': { titleKey: 'titleMinistryLogin', descKey: 'descMinistryLogin', sectionKey: 'secAccess' },
  '/client': { titleKey: 'titleClient', descKey: 'descClient', sectionKey: 'navRights' },
  '/client/consent': { titleKey: 'titleConsent', descKey: 'descConsent', sectionKey: 'navRights' },
  '/client/check-in': { titleKey: 'titleCheckin', descKey: 'descCheckin', sectionKey: 'navCollection' },
}

/**
 * Resolves a pathname to its metadata, including dynamic segments like
 * `/ministry/providers/PRV-001` which have no literal key above.
 */
export function routeMetaFor(pathname) {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname]
  if (pathname.startsWith('/ministry/providers/')) {
    return { titleKey: 'titleProvider', descKey: 'descProvider', sectionKey: 'navOversight' }
  }
  return { titleKey: 'portalName', descKey: null, sectionKey: 'secPortal' }
}
