/**
 * Authorised Ministry officers imported from Officers.xlsx.
 *
 * This is the single source of truth for who may reach the governance side of
 * SkillTrace. Strictly authorizes only the accredited officers present in Officers.xlsx.
 *
 * Credentials & Phone numbers correspond verbatim to Officers.xlsx:
 * 1. Chandrashekhar Reddy | OFF000001 | CHR001 | 9982372846
 * 2. Amit Deshmukh        | OFF000002 | AMD002 | 9273810568
 * 3. Sneha Kulkarni       | OFF000003 | SNK003 | 9451739257
 * 4. Prasad Patil         | OFF000004 | PRP004 | 9326174827
 * 5. Nikhil Joshi         | OFF000005 | NIJ005 | 9137193718
 * 6. Vaishnavi Shinde     | OFF000006 | VAS006 | 9471837193
 * 7. Rohit Pawar          | OFF000007 | ROP007 | 9728175927
 * 8. Swati Bhosale        | OFF000008 | SWB008 | 9174392749
 * 9. Saurabh Chavan       | OFF000009 | SAC009 | 9678374872
 * 10. Manasi Gavande      | OFF000010 | MAG010 | 9502847294
 */
export const MINISTRY_OFFICERS = [
  {
    officer_id: 'OFF000001',
    password: 'CHR001',
    name: 'Chandrashekhar Reddy',
    phone_no: '9982372846',
    designation: 'Joint Secretary (Monitoring & Evaluation)',
    cadre: 'IES',
    division: 'National Oversight',
    district: null,
    email: 'c.reddy@msde.gov.in',
    scope: 'national',
  },
  {
    officer_id: 'OFF000002',
    password: 'AMD002',
    name: 'Amit Deshmukh',
    phone_no: '9273810568',
    designation: 'District Skilling Officer (Nashik)',
    cadre: 'State Cadre',
    division: 'Nashik Division',
    district: 'Nashik',
    email: 'amit.deshmukh@msde.gov.in',
    scope: 'district',
  },
  {
    officer_id: 'OFF000003',
    password: 'SNK003',
    name: 'Sneha Kulkarni',
    phone_no: '9451739257',
    designation: 'District Skilling Officer (Pune)',
    cadre: 'State Cadre',
    division: 'Pune Division',
    district: 'Pune',
    email: 'sneha.kulkarni@msde.gov.in',
    scope: 'district',
  },
  {
    officer_id: 'OFF000004',
    password: 'PRP004',
    name: 'Prasad Patil',
    phone_no: '9326174827',
    designation: 'District Skilling Officer (Thane)',
    cadre: 'State Cadre',
    division: 'Thane Division',
    district: 'Thane',
    email: 'prasad.patil@msde.gov.in',
    scope: 'district',
  },
  {
    officer_id: 'OFF000005',
    password: 'NIJ005',
    name: 'Nikhil Joshi',
    phone_no: '9137193718',
    designation: 'District Skilling Officer (Nagpur)',
    cadre: 'State Cadre',
    division: 'Nagpur Division',
    district: 'Nagpur',
    email: 'nikhil.joshi@msde.gov.in',
    scope: 'district',
  },
  {
    officer_id: 'OFF000006',
    password: 'VAS006',
    name: 'Vaishnavi Shinde',
    phone_no: '9471837193',
    designation: 'District Skilling Officer (Mumbai Suburban)',
    cadre: 'State Cadre',
    division: 'Konkan Division',
    district: 'Mumbai Suburban',
    email: 'vaishnavi.shinde@msde.gov.in',
    scope: 'district',
  },
  {
    officer_id: 'OFF000007',
    password: 'ROP007',
    name: 'Rohit Pawar',
    phone_no: '9728175927',
    designation: 'District Skilling Officer (Latur)',
    cadre: 'State Cadre',
    division: 'Marathwada Division',
    district: 'Latur',
    email: 'rohit.pawar@msde.gov.in',
    scope: 'district',
  },
  {
    officer_id: 'OFF000008',
    password: 'SWB008',
    name: 'Swati Bhosale',
    phone_no: '9174392749',
    designation: 'District Skilling Officer (Kolhapur)',
    cadre: 'State Cadre',
    division: 'Kolhapur Division',
    district: 'Kolhapur',
    email: 'swati.bhosale@msde.gov.in',
    scope: 'district',
  },
  {
    officer_id: 'OFF000009',
    password: 'SAC009',
    name: 'Saurabh Chavan',
    phone_no: '9678374872',
    designation: 'District Skilling Officer (Satara)',
    cadre: 'State Cadre',
    division: 'Satara Division',
    district: 'Satara',
    email: 'saurabh.chavan@msde.gov.in',
    scope: 'district',
  },
  {
    officer_id: 'OFF000010',
    password: 'MAG010',
    name: 'Manasi Gavande',
    phone_no: '9502847294',
    designation: 'State Director (Audit & Verification)',
    cadre: 'IAS',
    division: 'Maharashtra State HQ',
    district: null,
    email: 'manasi.gavande@msde.gov.in',
    scope: 'state',
  },
]
