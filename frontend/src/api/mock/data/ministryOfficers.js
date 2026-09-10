/**
 * Authorised Ministry officers.
 *
 * This is the single source of truth for who may reach the governance side of
 * SkillTrace. It stands in for what would be a directory service (or the
 * ministry's own SSO) behind a real deployment — so the shape here is
 * deliberately the shape an API would return, and nothing outside
 * `auth/ministryAuth.js` is allowed to read it.
 *
 * Passwords are stored as plain demo strings because there is no backend to
 * hash against yet. That is acceptable for a hackathon build and unacceptable
 * beyond one: when a real auth service arrives, this file is deleted rather
 * than migrated.
 */
export const MINISTRY_OFFICERS = [
  {
    officer_id: 'MSDE-1001',
    password: 'Skill@2026',
    name: 'Dr. S. K. Sharma',
    designation: 'Joint Secretary (Skilling Outcomes)',
    cadre: 'IES',
    division: 'National',
    email: 'sk.sharma@msde.gov.in',
    scope: 'national',
  },
  {
    officer_id: 'MSDE-1002',
    password: 'Niti@2026',
    name: 'Anjali Deshpande',
    designation: 'Director (Monitoring & Evaluation)',
    cadre: 'IAS',
    division: 'National',
    email: 'anjali.deshpande@msde.gov.in',
    scope: 'national',
  },
  {
    officer_id: 'MSDE-1003',
    password: 'Pune@2026',
    name: 'Ramesh Kulkarni',
    designation: 'State Programme Officer',
    cadre: 'State Cadre',
    division: 'Pune',
    email: 'ramesh.kulkarni@msde.gov.in',
    scope: 'state',
  },
  {
    officer_id: 'MSDE-1004',
    password: 'Nashik@2026',
    name: 'Priya Wagh',
    designation: 'District Skilling Officer',
    cadre: 'State Cadre',
    division: 'Nashik',
    email: 'priya.wagh@msde.gov.in',
    scope: 'district',
  },
  {
    officer_id: 'MSDE-1005',
    password: 'Nagpur@2026',
    name: 'Sanjay Ingle',
    designation: 'District Skilling Officer',
    cadre: 'State Cadre',
    division: 'Nagpur',
    email: 'sanjay.ingle@msde.gov.in',
    scope: 'district',
  },
  {
    officer_id: 'MSDE-1006',
    password: 'Audit@2026',
    name: 'Fatima Shaikh',
    designation: 'Deputy Director (Audit & Compliance)',
    cadre: 'IES',
    division: 'National',
    email: 'fatima.shaikh@msde.gov.in',
    scope: 'national',
  },
  {
    officer_id: 'MSDE-1007',
    password: 'Thane@2026',
    name: 'Vivek Rane',
    designation: 'Assistant Director (Verification)',
    cadre: 'State Cadre',
    division: 'Thane',
    email: 'vivek.rane@msde.gov.in',
    scope: 'district',
  },
  {
    officer_id: 'MSDE-1008',
    password: 'Data@2026',
    name: 'Meera Krishnan',
    designation: 'Statistical Officer',
    cadre: 'ISS',
    division: 'National',
    email: 'meera.krishnan@msde.gov.in',
    scope: 'national',
  },
  {
    officer_id: 'MSDE-1009',
    password: 'Latur@2026',
    name: 'Ganesh Mane',
    designation: 'District Skilling Officer',
    cadre: 'State Cadre',
    division: 'Latur',
    email: 'ganesh.mane@msde.gov.in',
    scope: 'district',
  },
  {
    officer_id: 'MSDE-1010',
    password: 'Policy@2026',
    name: 'Arvind Menon',
    designation: 'Under Secretary (Policy)',
    cadre: 'IAS',
    division: 'National',
    email: 'arvind.menon@msde.gov.in',
    scope: 'national',
  },
]
