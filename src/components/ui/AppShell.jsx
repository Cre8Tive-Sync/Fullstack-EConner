import { useLocation, useNavigate } from 'react-router-dom'
import { IconAR, IconBack, IconGrid, IconHome, IconMap } from './Icons'

const NAV_ITEMS = [
  { to: '/', label: 'Home', Icon: IconHome, exact: true },
  { to: '/places', label: 'Places', Icon: IconGrid },
  { to: '/map', label: 'Map', Icon: IconMap },
  { to: '/ar', label: 'AR', Icon: IconAR },
]

function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isActive = (item) => {
    if (item.exact) return pathname === item.to
    return pathname === item.to || pathname.startsWith(`${item.to}/`)
  }

  return (
    <nav className="nav" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item)
        return (
          <button
            key={item.to}
            type="button"
            className={`nav__item${active ? ' nav__item--active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate(item.to)}
          >
            <item.Icon />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

/**
 * Page frame for every generic-UI screen: optional top bar, a scrolling body
 * and the persistent bottom navigation.
 *
 * @param flush     Body fills the frame without padding/scroll (map screens).
 * @param floatBar  Top bar floats over the content instead of sitting above it.
 */
export default function AppShell({
  title,
  back,
  actions,
  children,
  flush = false,
  padded = true,
  floatBar = false,
  hideNav = false,
}) {
  const navigate = useNavigate()

  const showBar = Boolean(title || back || actions)

  return (
    <div className="app ui">
      {showBar && (
        <header className={`app__bar${floatBar ? ' app__bar--floating' : ''}`}>
          {back && (
            <button
              type="button"
              className="btn btn--icon"
              aria-label="Go back"
              onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
            >
              <IconBack />
            </button>
          )}
          {title && <h1 className="app__title">{title}</h1>}
          {!title && <span style={{ flex: 1 }} />}
          {actions}
        </header>
      )}

      <main className={`app__body${flush ? ' app__body--flush' : ''}`}>
        {flush || !padded ? (
          children
        ) : (
          <div className={`app__body-inner${showBar ? '' : ' app__body-inner--top-safe'}`}>{children}</div>
        )}
      </main>

      {!hideNav && <BottomNav />}
    </div>
  )
}
