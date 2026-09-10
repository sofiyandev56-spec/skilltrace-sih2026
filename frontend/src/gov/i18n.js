/**
 * Bilingual chrome strings (English / हिन्दी).
 *
 * GIGW 3.0 expects Indian government portals to be available in Hindi as well
 * as English. The site frame — header, navigation, footer, policy page and
 * page titles — is fully translated here. Dashboard *data* (trainee names,
 * course names, employer names) is not translated, because it is record
 * content rather than interface text; the language switch says so.
 */
export const LANGS = { en: 'English', hi: 'हिन्दी' }

export const STRINGS = {
  en: {
    govOfIndia: 'Government of India',
    ministry: 'Ministry of Skill Development and Entrepreneurship',
    portalName: 'SkillTrace',
    portalTagline: 'Skilling Outcomes Tracking System',
    skipToMain: 'Skip to main content',
    screenReader: 'Screen reader access',
    textSize: 'Text size',
    decrease: 'Decrease text size',
    normal: 'Normal text size',
    increase: 'Increase text size',
    highContrast: 'High contrast',
    standardContrast: 'Standard contrast',
    language: 'Language',
    prototypeNotice:
      'Prototype built for Smart India Hackathon 2026. Not an official Government of India website.',
    breadcrumbHome: 'Home',

    navOversight: 'Oversight',
    navCollection: 'Data collection',
    navRights: 'Trainee rights',
    navDashboard: 'Dashboard',
    navDisputes: 'Disputes',
    navFollowup: 'Follow-up queue',
    navCheckin: 'Check-in simulator',
    navEmployer: 'Employer confirmation',
    navConsent: 'Consent',
    navPolicies: 'Website policies',

    titleDashboard: 'Skilling Outcomes Dashboard',
    descDashboard:
      'Verified post-training outcomes. Employment is counted only after 3+ months at the same employer.',
    titleDisputes: 'Disputed Records',
    descDisputes:
      'Where the employer and the trainee disagree, we hold both claims and record neither as fact.',
    titleFollowup: 'Assisted Follow-up Queue',
    descFollowup:
      'Trainees who did not respond after three contact attempts, for field officer assignment.',
    titleCheckin: 'Check-in Simulator',
    descCheckin:
      'A simulated messaging check-in. The interface is a mockup; the API call it makes is real.',
    titleConsent: 'Consent Management',
    descConsent:
      'Every trainee can see what they agreed to and withdraw it at any time, with immediate effect.',
    titlePolicies: 'Website Policies',
    descPolicies:
      'Terms, privacy, copyright, accessibility and disclosure statements for this portal.',

    footerPolicies: 'Website Policies',
    footerTerms: 'Terms & Conditions',
    footerPrivacy: 'Privacy Policy',
    footerCopyright: 'Copyright Policy',
    footerHyperlinking: 'Hyperlinking Policy',
    footerAccessibility: 'Accessibility Statement',
    footerDisclaimer: 'Disclaimer',
    footerRti: 'Right to Information',
    footerHelp: 'Help',
    footerFeedback: 'Feedback',
    footerSitemap: 'Sitemap',
    contentOwned:
      'Content owned and maintained by the Ministry of Skill Development and Entrepreneurship.',
    developedBy: 'Designed and developed as a hackathon prototype. Not hosted by NIC.',
    lastUpdated: 'Last updated',
    visitors: 'Visitors',
    accessibilityCompliance:
      'This site aims to meet WCAG 2.1 Level AA, as required for government websites under the Rights of Persons with Disabilities Act, 2016.',
  },
  hi: {
    govOfIndia: 'भारत सरकार',
    ministry: 'कौशल विकास और उद्यमिता मंत्रालय',
    portalName: 'स्किलट्रेस',
    portalTagline: 'कौशल परिणाम ट्रैकिंग प्रणाली',
    skipToMain: 'मुख्य सामग्री पर जाएँ',
    screenReader: 'स्क्रीन रीडर पहुँच',
    textSize: 'अक्षर आकार',
    decrease: 'अक्षर आकार घटाएँ',
    normal: 'सामान्य अक्षर आकार',
    increase: 'अक्षर आकार बढ़ाएँ',
    highContrast: 'उच्च कंट्रास्ट',
    standardContrast: 'सामान्य कंट्रास्ट',
    language: 'भाषा',
    prototypeNotice:
      'स्मार्ट इंडिया हैकाथॉन 2026 के लिए बनाया गया प्रोटोटाइप। यह भारत सरकार की आधिकारिक वेबसाइट नहीं है।',
    breadcrumbHome: 'मुख्य पृष्ठ',

    navOversight: 'निगरानी',
    navCollection: 'डेटा संग्रह',
    navRights: 'प्रशिक्षार्थी अधिकार',
    navDashboard: 'डैशबोर्ड',
    navDisputes: 'विवाद',
    navFollowup: 'अनुवर्ती सूची',
    navCheckin: 'चेक-इन सिम्युलेटर',
    navEmployer: 'नियोक्ता पुष्टि',
    navConsent: 'सहमति',
    navPolicies: 'वेबसाइट नीतियाँ',

    titleDashboard: 'कौशल परिणाम डैशबोर्ड',
    descDashboard:
      'सत्यापित प्रशिक्षणोत्तर परिणाम। रोज़गार तभी गिना जाता है जब एक ही नियोक्ता के साथ 3+ माह पूरे हों।',
    titleDisputes: 'विवादित अभिलेख',
    descDisputes:
      'जहाँ नियोक्ता और प्रशिक्षार्थी असहमत हैं, वहाँ हम दोनों कथन रखते हैं और किसी को तथ्य नहीं मानते।',
    titleFollowup: 'सहायता प्राप्त अनुवर्ती सूची',
    descFollowup:
      'तीन बार संपर्क के बाद भी उत्तर न देने वाले प्रशिक्षार्थी, क्षेत्रीय अधिकारी को सौंपने हेतु।',
    titleCheckin: 'चेक-इन सिम्युलेटर',
    descCheckin:
      'एक अनुरूपित संदेश चेक-इन। इंटरफ़ेस नमूना है; इसके द्वारा की गई API कॉल वास्तविक है।',
    titleConsent: 'सहमति प्रबंधन',
    descConsent:
      'प्रत्येक प्रशिक्षार्थी अपनी सहमति देख सकता है और कभी भी तत्काल प्रभाव से वापस ले सकता है।',
    titlePolicies: 'वेबसाइट नीतियाँ',
    descPolicies: 'इस पोर्टल हेतु नियम, गोपनीयता, कॉपीराइट, सुगम्यता एवं प्रकटीकरण विवरण।',

    footerPolicies: 'वेबसाइट नीतियाँ',
    footerTerms: 'नियम और शर्तें',
    footerPrivacy: 'गोपनीयता नीति',
    footerCopyright: 'कॉपीराइट नीति',
    footerHyperlinking: 'हाइपरलिंकिंग नीति',
    footerAccessibility: 'सुगम्यता विवरण',
    footerDisclaimer: 'अस्वीकरण',
    footerRti: 'सूचना का अधिकार',
    footerHelp: 'सहायता',
    footerFeedback: 'प्रतिक्रिया',
    footerSitemap: 'साइट मानचित्र',
    contentOwned: 'सामग्री कौशल विकास और उद्यमिता मंत्रालय द्वारा संचालित एवं अनुरक्षित।',
    developedBy: 'हैकाथॉन प्रोटोटाइप के रूप में अभिकल्पित एवं विकसित। एनआईसी द्वारा होस्ट नहीं।',
    lastUpdated: 'अंतिम अद्यतन',
    visitors: 'आगंतुक',
    accessibilityCompliance:
      'यह साइट दिव्यांगजन अधिकार अधिनियम, 2016 के अंतर्गत सरकारी वेबसाइटों हेतु अपेक्षित WCAG 2.1 स्तर AA का पालन करने का लक्ष्य रखती है।',
  },
}
