import { Link } from 'react-router-dom'
import { useA11y } from './AccessibilityProvider.jsx'
import { LANGS } from './i18n.js'

/**
 * The standard masthead of an Indian government portal, in the order GIGW 3.0
 * expects it: a utility strip carrying accessibility controls, then the
 * identity band naming the government, the ministry and the portal.
 *
 * Note on the emblem: the State Emblem of India is deliberately NOT used. Its
 * use is restricted by the State Emblem of India (Prohibition of Improper Use)
 * Act, 2005, and a hackathon prototype has no authority to display it. The mark
 * below is a neutral placeholder standing in for wherever an authorised
 * departmental emblem would sit on a real deployment.
 */
export default function GovHeader() {
  const { t, lang, setLang, contrast, toggleContrast, scaleIndex, scaleCount, increase, decrease, resetScale } =
    useA11y()

  return (
    <header className="gov-head" role="banner">
      <div className="gov-strip">
        <div className="gov-strip__inner">
          <p className="gov-strip__gov">{t('govOfIndia')}</p>

          <div className="gov-strip__tools">
            <a className="gov-strip__link" href="#main-content">
              {t('skipToMain')}
            </a>
            <Link className="gov-strip__link" to="/policies#accessibility">
              {t('screenReader')}
            </Link>

            <div className="gov-size" role="group" aria-label={t('textSize')}>
              <button
                type="button"
                onClick={decrease}
                disabled={scaleIndex === 0}
                aria-label={t('decrease')}
              >
                A<sup>-</sup>
              </button>
              <button type="button" onClick={resetScale} aria-label={t('normal')}>
                A
              </button>
              <button
                type="button"
                onClick={increase}
                disabled={scaleIndex === scaleCount - 1}
                aria-label={t('increase')}
              >
                A<sup>+</sup>
              </button>
            </div>

            <button
              type="button"
              className="gov-strip__link"
              onClick={toggleContrast}
              aria-pressed={contrast === 'high'}
            >
              {contrast === 'high' ? t('standardContrast') : t('highContrast')}
            </button>

            <label className="gov-lang">
              <span className="sr-only">{t('language')}</span>
              <select value={lang} onChange={(e) => setLang(e.target.value)}>
                {Object.entries(LANGS).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="gov-id">
        <div className="gov-id__inner">
          <Link to="/" className="gov-id__brand">
            <span className="gov-id__mark" aria-hidden="true">
              ST
            </span>
            <span>
              <span className="gov-id__ministry">{t('ministry')}</span>
              <span className="gov-id__portal">
                {t('portalName')}
                <span className="gov-id__tagline">{t('portalTagline')}</span>
              </span>
            </span>
          </Link>
          <p className="gov-id__proto">{t('prototypeNotice')}</p>
        </div>
      </div>
    </header>
  )
}
