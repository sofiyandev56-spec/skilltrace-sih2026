/**
 * Page metadata for the breadcrumb bar and document title.
 *
 * `GovBreadcrumbs` reads `title` and `desc`; the Hindi variants are picked up
 * when the language switch is set to हिन्दी.
 */
export const ROUTE_META = {
  '/': {
    title: 'Skilling Outcomes Dashboard',
    titleHi: 'कौशल परिणाम डैशबोर्ड',
    desc: 'Verified post-training outcomes. Employment is counted only after 3+ months at the same employer.',
    descHi: 'सत्यापित प्रशिक्षणोत्तर परिणाम। रोज़गार तभी गिना जाता है जब एक ही नियोक्ता के साथ 3+ माह पूरे हों।',
  },
  '/disputes': {
    title: 'Disputed Records',
    titleHi: 'विवादित अभिलेख',
    desc: 'Where the employer and the trainee disagree, we hold both claims and record neither as fact.',
    descHi: 'जहाँ नियोक्ता और प्रशिक्षार्थी असहमत हैं, वहाँ हम दोनों कथन रखते हैं और किसी को तथ्य नहीं मानते।',
  },
  '/follow-up': {
    title: 'Assisted Follow-up Queue',
    titleHi: 'सहायता प्राप्त अनुवर्ती सूची',
    desc: 'Trainees who did not respond after three contact attempts, for field officer assignment.',
    descHi: 'तीन बार संपर्क के बाद भी उत्तर न देने वाले प्रशिक्षार्थी, क्षेत्रीय अधिकारी को सौंपने हेतु।',
  },
  '/audit': {
    title: 'Audit Trail',
    titleHi: 'अंकेक्षण अभिलेख',
    desc: 'Every outcome is calculated from dated events. Records are never silently overwritten.',
    descHi: 'प्रत्येक परिणाम दिनांकित घटनाओं से गणित है। अभिलेख कभी चुपचाप नहीं बदले जाते।',
  },
  '/check-in': {
    title: 'Check-in Simulator',
    titleHi: 'चेक-इन सिम्युलेटर',
    desc: 'A simulated messaging check-in. The interface is a mockup; the API call it makes is real.',
    descHi: 'एक अनुरूपित संदेश चेक-इन। इंटरफ़ेस नमूना है; इसके द्वारा की गई API कॉल वास्तविक है।',
  },
  '/consent': {
    title: 'Consent & Rights',
    titleHi: 'सहमति एवं अधिकार',
    desc: 'Every trainee can see what they agreed to and withdraw it at any time, with immediate effect.',
    descHi: 'प्रत्येक प्रशिक्षार्थी अपनी सहमति देख सकता है और कभी भी तत्काल प्रभाव से वापस ले सकता है।',
  },
  '/client': {
    title: 'My Trainee Portal',
    titleHi: 'मेरा प्रशिक्षार्थी पोर्टल',
    desc: 'Your own record as the government holds it, and what you can do about it.',
    descHi: 'सरकार के पास आपका अपना अभिलेख, और उस पर आपके अधिकार।',
  },
}

/**
 * Resolves a pathname to its metadata, including dynamic segments like
 * `/providers/PRV-001` which have no literal key in ROUTE_META.
 */
export function routeMetaFor(pathname) {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname]
  if (pathname.startsWith('/providers/')) {
    return {
      title: 'Training Centre',
      titleHi: 'प्रशिक्षण केंद्र',
      desc: 'Outcomes for a single centre, with the evidence behind each figure.',
      descHi: 'एकल केंद्र के परिणाम, प्रत्येक आँकड़े के प्रमाण सहित।',
    }
  }
  return { title: 'SkillTrace' }
}
