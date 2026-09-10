import { Link } from 'react-router-dom'
import { useA11y } from './AccessibilityProvider.jsx'

/** GIGW asks for a visible trail on every page below the home page. */
export default function Breadcrumbs({ trail = [] }) {
  const { t } = useA11y()
  if (!trail.length) return null

  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link to="/">{t('breadcrumbHome')}</Link>
        </li>
        {trail.map((item, i) => (
          <li key={item.label} aria-current={i === trail.length - 1 ? 'page' : undefined}>
            {i === trail.length - 1 || !item.to ? (
              <span>{item.label}</span>
            ) : (
              <Link to={item.to}>{item.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
